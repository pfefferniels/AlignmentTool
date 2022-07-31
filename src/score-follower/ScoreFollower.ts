import { assignProbabilities, logAdd, logNorm, normalize, normalizeMap } from "../BasicCalculation"
import { HMM } from "../HMM"
import { ScorePerformanceMatch } from "../Match"
import { StateType } from "../HMMState"
import { ioiDistributionFunctions, ioiInsertionDistribution, logIoiSkipDistribution } from "../IOIDistribution"
import { PianoRoll } from "../PianoRoll"
import { sitchToPitch } from "../BasicPitchCalculation"

export enum TransitionType {
	Chord,
	Arpeggio,
	ShortAppoggiatura,
	Trill
}

type Pitch = number

type Observation = {
	/**
	 * inter-onset interval
	 */
	ioi: number
	pitch: number
}

type LP = number[]

export class ScoreFollower {
	/**
	 * score HMM
	 */
	hmm: HMM

	/** 
	 * pulses per quarter note
	 */
	ppq: number

	isFirst: boolean = true

	/**
	 * number of states
	 */
	numberOfStates: number

	/**
	 * index of current state
	 */
	currentState: number = 0

	/**
	 * index of previous state
	 */
	previousState: number = -1

	tickPerSecond: number
	initialTickPerSecond: number // for resetting the score follower
	lastTickPerSec: number

	currentOnsetTime: number
	previousOnsetTime: number
	predictedNextTime: number

	tempo: number[]

	/**
	 * likelihood
	 */
	likelihood: number[]

	amaxHist: number[][]

	/**
	 * stores pitches at a specific HMM position
	 */
	pitchList: number[][]

	scorePosList: string[][]

	/**
	 * the observed pitches are saved here
	 */
	inputPitch: number[]

	/**
	 * history of onset times
	 */
	timeHist: number[]

	/**
	 * Performance HMMs with larger D have larger
	 * descriptive capabilities and the accuracy of score-position
	 * estimates must also be better if the parameters are appropriately set.
	 * However the computational complexity increases proportionally to D,
	 * and it is important to know how the results of estimation change
	 * with different D (Nakamura et al. 2014, p. 37)
	 * 
	 * D = D1 + D2
	 */
	D1: number
	D2: number

	/**
	 * stores score time as ticks
	 */
	stime: number[]
	endStime: number[]
	type: StateType[]

	topId: number[]
	internalId: number[] // determined by an event's internal position

	pitchClusters: Pitch[][][]
	voiceClusters: number[][][]

	/** 
	 * stores note ID references
	 */
	refClusters: string[][][]

	/**
	 * relative IOI weights for each HMM event.
	 * They always sum up to one, cf. Nakamura 2015, p. 15
	 */
	ioiWeight: Map<TransitionType, number>[]
	stolenTime: number[]

	pitchLP: LP[]
	topTransitionLP: LP
	internalTransitionLP: LP[][]
	iniSecPerTick: number

	/**
	 * logarthmic skip probability (?)
	 */
	transitionSkipLP: number

	/**
	 * tempo model parameters
	 * 
	 * @todo these parameters could vary from rehearsal 
	 * vs concert-ready situations and should be controllable.
	 */ 

	/**
	 * noise sources due to motor controls and erroneous timing (e_t)
	 * represented as standard deviation (sigma_t)
	 */
	sigma_t: number = Math.pow(0.014, 2)
	sigma_v: number
	m: number

	/**
	 * relative weights 
	 */
	lpLambda: [number, number] = [Math.log(0.95), Math.log(0.05)]
	lpSwitch: number[] = [Math.log(0.95), Math.log(0.05)]
	swSecPerTick: [number, number]
	swM: [number, number]
	swSigma_t: [number, number]

	pitchDiffProb: number[]

	private calculateLPFor(selfTrProbability: number[], index: number) {
		let LP: number[][] = new Array<Array<number>>(102) //0=in, 1--100=states, 101=out
		for (let j = 0; j < LP.length; j++) {
			LP[j] = new Array<number>(102).fill(-1000)
		}
		LP[0][1] = Math.log(1 - 0.1)

		for (let j = 2; j <= this.internalId[index]; j++) {
			LP[0][j] = Math.log(0.1 / (this.internalId[index] - 1));
		}
		logNorm(LP[0])

		for (let j = 1; j <= this.internalId[index]; j++) {
			const value = selfTrProbability[index + 1 - this.internalId[index] + j - 1]

			if (j == this.internalId[index]) {
				LP[j][j] = Math.log(value)
				LP[j][101] = Math.log(1 - value)
			} else {
				LP[j][j] = Math.log(value)
				LP[j][j + 1] = Math.log(0.9 * (1 - value))
				for (let k = j + 2; k <= this.internalId[index]; k++) {
					LP[j][k] = Math.log(0.1 / (this.internalId[index] - j) * (1 - value))
				}
				LP[j][101] = Math.log(0.1 / (this.internalId[index] - j) * (1 - value))
			}
			logNorm(LP[j])
		}

		return LP
	}

	constructor(hmm: HMM, secPerQN) {
		let d: number[] = new Array<number>(100)

		this.ppq = hmm.ppq

		let curTopId = -1
		for (const event of hmm.events) {
			if (event.internalPosition === 1) {
				curTopId += 1
			}
			this.stime.push(event.scoreTime)
			this.endStime.push(event.endScoreTime)
			this.topId.push(curTopId)
			this.internalId.push(event.internalPosition)
			this.type.push(event.stateType)

			let cluster: Pitch[][]
			for (let i = 0; i < event.numClusters; i++) {
				const pitches: Pitch[] = event.sitchesPerCluster[i].map(sitch => sitchToPitch(sitch))
				cluster.push(pitches)
			}
			this.pitchClusters.push(cluster)

			this.voiceClusters.push(event.voicesPerCluster)
			this.refClusters.push(event.meiIDsPerCluster)

			// 
			let selfTransitionWeight = new Map<TransitionType, number>([
				[TransitionType.Chord, 0.01],
				[TransitionType.Arpeggio, 0.01],
				[TransitionType.ShortAppoggiatura, 0.01],
				[TransitionType.Trill, 0.01]
			])

			if (event.stateType !== StateType.Trill) {
				selfTransitionWeight[TransitionType.Chord] += event.numCh
				selfTransitionWeight[TransitionType.Arpeggio] += event.numArp
				selfTransitionWeight[TransitionType.ShortAppoggiatura] = event.numInterCluster
				this.stolenTime.push(0.13 * Math.max(event.numArp, event.numInterCluster))
			}
			else {
				for (let i = 0; i < event.numClusters; i++) {
					selfTransitionWeight[TransitionType.Chord] = event.numNotesPerCluster[i] - 1
					selfTransitionWeight[TransitionType.Trill] = 1
				}
				this.stolenTime.push(0)
			}
			normalizeMap(selfTransitionWeight)
			this.ioiWeight.push(selfTransitionWeight)
		}

		this.numberOfStates = this.stime.length
		this.likelihood = new Array<number>(this.numberOfStates)
		this.iniSecPerTick = secPerQN / this.ppq
		this.initialTickPerSecond = 1 / this.initialTickPerSecond
		this.lastTickPerSec = this.initialTickPerSecond

		// trill overlaps

		for (let i = 0; i < this.numberOfStates; i++) {
			if (this.type[i] === StateType.Trill && this.internalId[i] > 1) {
				{
					// reorganize pitch clusters based on bottom id
					const pitches: Pitch[] = this.pitchClusters[i].flat(2)
					for (let j = i - 1; j >= i - this.internalId[i] + 1; j--) {
						this.pitchClusters[j].push(pitches)
					}
				}

				{
					// initialize voice clusters with -1 based on bottom id
					const pitches = new Array<number>(this.pitchClusters[i].flat(2).length).fill(-1)
					for (let j = i - 1; j >= i - this.internalId[i] + 1; j--) {
						this.voiceClusters[j].push(pitches)
					}
				}

				{
					// reorganize ID references based on the bottom ID
					let vs: string[]
					for (let k = 0; k < this.pitchClusters[i].length; k++) {
						for (let l = 0; l < this.pitchClusters[i][k].length; l++) {
							vs.push(this.refClusters[i][k][l])
						}
					}
					for (let j = i-1; j >= i - this.internalId[i] + 1; j--) {
						this.refClusters[j].push(vs)
					}
				}

			}
		}

		// pitch output probability – describes how players 
		// actually produce performed notes

		for (let i = 0; i < this.numberOfStates; i++) {
			const vpitch = this.pitchClusters[i].flat(2)
			const vref = this.refClusters[i].flat(2)
			this.pitchList.push(vpitch)
			this.scorePosList.push(vref)

			// all pitches
			let pitchProbabilities = new Array<number>(128).fill(0.000001)
			if (this.type[i] !== StateType.Trill) {
				for (let j = 0; j < this.pitchClusters[i].length; j++) {
					for (let k = 0; k < this.pitchClusters[i][j].length; k++) {
						const voice = this.voiceClusters[i][j][k]
						const pitch = this.pitchClusters[i][j][k]
						assignProbabilities(pitchProbabilities, pitch, voice < 0)
					}
				}
			}
			else {
				d[1] = 0
				for (let j = 0; j < this.pitchClusters[i].length - 1; j++) {
					for (let k = 0; k < this.pitchClusters[i][j].length; k++) {
						d[1] += 1
						const voice = this.voiceClusters[i][j][k]
						const pitch = this.pitchClusters[i][j][k]
						assignProbabilities(pitchProbabilities, pitch, voice < 0)
					}
				}

				let lastCluster = this.pitchClusters[i].length - 1
				let factor = 1 / (d[1] * this.iniSecPerTick * (this.endStime[i] - this.stime[i] / 0.15))
				for (let k = 0; k < this.pitchClusters[i][lastCluster].length; k++) {
					const voice = this.voiceClusters[i][lastCluster][k]
					const pitch = this.pitchClusters[i][lastCluster][k]
					assignProbabilities(pitchProbabilities, pitch, voice < 0)
				}
			}
			normalize(pitchProbabilities)
			pitchProbabilities = pitchProbabilities.map(value => Math.log(value))
			this.pitchLP.push(pitchProbabilities)
		}

		// internal transition probability

		let selfTrProbability: number[]
		let prevTopId = 0

		for (let i = 0; i < this.numberOfStates; i++) {
			if (this.type[i] !== StateType.Trill) {
				let d0 = 0
				for (let j; j < this.pitchClusters[i].length; j++) {
					d0 += this.pitchClusters[i][j].length * (this.voiceClusters[i][j][0] < 0 ? 0.5 : 1)
				}
				selfTrProbability.push((d0 - 1 + 0.1) / (d0 + 0.1))
			}
			else {
				const avgClusterSize = this.pitchClusters[i].reduce((prev, curr) => prev + curr.length, 0) / (this.pitchClusters.length - 1)
				const d0 = Math.min(3, d[1] * (this.iniSecPerTick * (this.endStime[i] - this.stime[i])) / 0.15)
				selfTrProbability.push((d0 - 1 + 0.1) / (d0 + 0.1))
			}
			if (prevTopId !== this.topId[i]) {
				const lp = this.calculateLPFor(selfTrProbability, i - 1)
				this.internalTransitionLP.push(lp)
			}
			prevTopId = this.topId[i]
		}

		// calculate logarithmic probability for the last state
		const lp = this.calculateLPFor(selfTrProbability, this.numberOfStates - 1)
		this.internalTransitionLP.push(lp)

		this.init()
	}

	private init() {
		this.tickPerSecond = this.initialTickPerSecond
		this.tempo = []
		this.tempo.push(this.tickPerSecond)
		this.m = Math.pow(0.2 / this.tickPerSecond, 2)

		// cf. Nakamura et al. 2015 p. 22
		this.sigma_v = Math.pow(0.03 / (this.tickPerSecond * this.ppq), 2)
		this.swSigma_t = [this.sigma_t, Math.pow(0.16, 2)]
		this.swSecPerTick[1 / this.tickPerSecond, 1 / this.tickPerSecond]
		this.swM = [this.m, this.m]

		this.likelihood = [Math.log(0.9),
		...new Array(this.numberOfStates - 1).fill(Math.log(0.1 / (this.numberOfStates - 1)))]

		// TODO: as D changes the score alignment quality it should
		// be controllable as parameter
		this.D1 = 3
		this.D2 = 2

		this.topTransitionLP = new Array(6).fill(-100)
		const data: [number, number][] = [
			[-2, 0.00516],
			[-1, 0.00886],
			[0, 0.01342],
			[1, 0.94531],
			[2, 0.00610],
			[3, 0.00073]
		]

		data.forEach(([da, prob]) => {
			this.topTransitionLP[da + this.D1] = Math.log(prob)
		})
		this.transitionSkipLP = -40 // offline

		this.pitchDiffProb = new Array<number>(256, 1E-20)
		assignProbabilities(this.pitchDiffProb, 128)
		normalize(this.pitchDiffProb)
	}

	/**
	 * Updates the current state to match to the given
	 * observation at the given time. 
	 * 
	 * This method is ought to be called whenever
	 * a new observation comes in.
	 * 
	 * @param observed 
	 * @param time 
	 */
	private update(observed: Observation, time: number) {
		this.timeHist.push(time)
		if (this.isFirst) {
			this.updateInitialLikelihood(observed)
			this.currentOnsetTime = time
			this.previousOnsetTime = time
		}
		else {
			this.previousState = this.currentState
			this.updateLikelihood(observed, time)
		}

		this.currentState = this.getOptimalState()
		if (this.currentState !== this.previousState) {
			this.previousOnsetTime = this.currentState
			this.currentOnsetTime = time
		}
		this.updateTickPerSec(time)
	}

	/**
	 * updates ticks per second and predicted next time
	 * 
	 * @param time 
	 * @returns 
	 */
	private updateTickPerSec(time: number): number {
		// interval from previous onset to this onset
		const ioi = time - this.previousOnsetTime

		// Swiching Kalman Filter (SKF)

		// two adjacent chord states with a minimal distance of 0.035?
		if (this.currentState > 0 && this.currentState === this.previousState + 1 &&
			this.type[this.currentState] === StateType.Chord && this.type[this.previousState] === StateType.Chord) {
			// score time difference
			const nu = this.stime[this.currentState] - this.stime[this.currentState - 1]

			let swk: [[number, number], [number, number]]
			let swTmpPredSecPerTick: [[number, number], [number, number]]
			let swDelta: [[number, number], [number, number]]
			let tmpLPSwitch: number[] = new Array<number>(4); //2*s_{m-1}+s_m=2*r+s

			for (let r=0; r<2; r++) {
				for (let s=0; s<2; s++) {
					swk[r][s] = nu * this.swM[r] / (nu**2 * this.swM[r] + this.swSigma_t[s])
					swTmpPredSecPerTick[r][s] = this.swSecPerTick[r] + swk[r][s] * (ioi - nu * this.swSecPerTick[r]);
					swDelta[r][s] = (1 - swk[r][s] * nu) * this.swM[r];
					tmpLPSwitch[2 * r + s] = this.lpLambda[s] + this.lpSwitch[r] - 0.5 * Math.log(2 * Math.PI * (nu * nu * this.swM[r] + this.swSigma_t[s])) - 0.5 * Math.pow(ioi - nu * this.swSecPerTick[r], 2.) / (nu**2 * this.swM[r] + this.swSigma_t[s]);
				}
			}
			logNorm(tmpLPSwitch)

			for (let s = 0; s < 2; s += 1) {
				this.swSecPerTick[s] = (Math.exp(tmpLPSwitch[s]) * swTmpPredSecPerTick[0][s] + Math.exp(tmpLPSwitch[2 + s]) * swTmpPredSecPerTick[1][s]) / (Math.exp(tmpLPSwitch[s]) + Math.exp(tmpLPSwitch[2 + s]));
				this.swM[s] = (Math.exp(tmpLPSwitch[s]) * (swDelta[0][s] + Math.pow(this.swSecPerTick[s] - swTmpPredSecPerTick[0][s], 2.))
					+ Math.exp(tmpLPSwitch[2 + s]) * (swDelta[1][s] + Math.pow(this.swSecPerTick[s] - swTmpPredSecPerTick[1][s], 2.)))
					/ (Math.exp(tmpLPSwitch[s]) + Math.exp(tmpLPSwitch[2 + s]))
				this.swM[s] += nu**2 * this.sigma_v
				this.lpSwitch[s] = logAdd(tmpLPSwitch[s], tmpLPSwitch[2 + s])
			}
			logNorm(this.lpSwitch)
			this.tickPerSecond = 1 / (this.swSecPerTick[0] * Math.exp(this.lpSwitch[0]) + this.swSecPerTick[1] * Math.exp(this.lpSwitch[1]))
		}

		if (this.tickPerSecond <= 0) {
			throw new Error('invalid tickPerSecond')
		}

		if (this.currentState < this.numberOfStates - 1) {
			this.predictedNextTime = time + (this.stime[this.currentState + 1] - this.stime[this.currentState]) / this.tickPerSecond
		}
		else {
			this.predictedNextTime = time + 1
		}

		return 0
	}

	/**
	 * updates likelihood of each state for a given observation and
	 * stores the observed pitch. 
	 * 
	 * @param observed 
	 * @param time 
	 */
	private updateLikelihood(observed: Observation, time: number) {
		const prevLike = this.likelihood
		const ioi = observed.ioi
		let vi = new Array<number>(this.likelihood.length)

		for (let i = 0; i < this.numberOfStates; i++) {
			// self transition
			let am = i
			let max = prevLike[i]

			const probabilitySum = [TransitionType.Chord,
				TransitionType.Arpeggio,
				TransitionType.ShortAppoggiatura,
				TransitionType.Trill].map(transitionType => (
					this.ioiWeight[i].get(transitionType) * ioiDistributionFunctions.get(transitionType)(ioi)
				)).reduce((prev, curr) => prev + curr, 0)
			
			max += Math.log(Math.exp(this.internalTransitionLP[this.topId[i]][this.internalId[i]][this.internalId[i]]) * probabilitySum)
			max += Math.exp(this.topTransitionLP[this.D1] + this.internalTransitionLP[this.topId[i]][this.internalId[i]][101] + this.internalTransitionLP[this.topId[i]][0][this.internalId[i]] * ioiInsertionDistribution(ioi))

			let logProbability: number 
			
			// forward transition
			for (let j = i - 1; j >= 0 && j >= i - 12; j--) {
				if (this.topId[i] - this.topId[j] > this.D2) continue

				// if the transition is internal
				if (this.topId[i] === this.topId[j]) {
					logProbability = prevLike[j] + this.internalTransitionLP[this.topId[i]][this.internalId[j]][this.internalId[i]] + Math.log(0.95 * ioiDistributionFunctions.get(TransitionType.ShortAppoggiatura)(ioi) + 0.05 * ioiInsertionDistribution(ioi));
				}
				// if the transition is immediate – if the note at j ends
				// at the same time the note at i begins
				else if (this.stime[this.topId[i]] === this.endStime[this.topId[j]]) {
					logProbability = prevLike[j] + this.topTransitionLP[this.D1 + this.topId[i] - this.topId[j]] + this.internalTransitionLP[this.topId[j]][this.internalId[j]][101] + this.internalTransitionLP[this.topId[i]][0][this.internalId[i]]
						+ Math.log(0.95 * ioiDistributionFunctions.get(TransitionType.ShortAppoggiatura)(ioi) + 0.05 * ioiInsertionDistribution(ioi));
				} else {
					let sig = 0.5 + (this.stime[this.topId[i]] - this.endStime[this.topId[j]]) * 0.2 / this.ppq
					let mu = (this.stime[this.topId[i]] - this.endStime[this.topId[j]]) / this.tickPerSecond - this.stolenTime[j]
					let ioi2 = time - this.previousOnsetTime
					if (mu < 0) mu = 0
					logProbability = prevLike[j] + this.topTransitionLP[this.D1 + this.topId[i] - this.topId[j]] + this.internalTransitionLP[this.topId[j]][this.internalId[j]][101] + this.internalTransitionLP[this.topId[i]][0][this.internalId[i]]
						+ Math.log((0.3 / Math.PI) / (Math.pow(ioi - mu, 2.) + Math.pow(0.3, 2)));//offline
				}
				if (logProbability > max) {
					max = logProbability;
					am = j;
				}
			}

			// backward transition
			for (let j = i + 1; j <= i + 18 && j < this.numberOfStates; j++) {
				if (this.topId[j] - this.topId[i] > this.D1) continue

				logProbability = prevLike[j] + this.topTransitionLP[this.D1 + this.topId[i] - this.topId[j]] + this.internalTransitionLP[this.topId[j]][this.internalId[j]][101] + this.internalTransitionLP[this.topId[i]][0][this.internalId[i]]
					+ ((ioi > 0.3) ? Math.log(2 * ioiInsertionDistribution(ioi)) : -10)
				if (logProbability > max) {
					max = logProbability
					am = j
				}
			}

			// large skip
			logProbability = prevLike[this.currentState] + this.transitionSkipLP + this.internalTransitionLP[this.topId[this.currentState]][this.internalId[this.currentState]][101] + this.internalTransitionLP[this.topId[i]][0][this.internalId[i]]
				+ ((ioi > 0.3) ? logIoiSkipDistribution(ioi) : -20);
			if (logProbability > max) {
				max = logProbability
				am = this.currentState
			}

			// update
			this.likelihood[i] = max + this.pitchLP[i][observed.pitch]
			vi[i] = am
		}

		this.amaxHist.push(vi)
		this.inputPitch.push(observed.pitch)
	}

	/**
	 * assigns for each state the likelihood of the
	 * observed pitch and stores the observed pitch.
	 * 
	 * @param observed 
	 */
	updateInitialLikelihood(observed: Observation) {
		let vi = new Array<number>(this.likelihood.length)
		for (let i=0; i<this.numberOfStates; i++) {
			this.likelihood[i] += this.pitchLP[i][observed.pitch]
			vi[i] = i
		}
		this.amaxHist.push(vi)
		this.inputPitch.push(observed.pitch)
	}

	/**
	 * @returns the first position of maximum likelihood
	 */
	getOptimalState() {
		let max = this.likelihood[0]
		let maxPosition = 0
		for (let i = 1; i < this.likelihood.length; i++) {
			if (this.likelihood[i] > max) {
				maxPosition = i
				max = this.likelihood[i]
			}
		}
		return maxPosition
	}

	/**
	 * 
	 * @param hmmPos 
	 * @param pitch 
	 * @returns MEI id for a given position
	 */
	getMeiId(hmmPos: number, pitch: number) {
		// find maximum pitch probability relative to the given
		// pitch at the given HMM position
		let max = this.pitchDiffProb[pitch - this.pitchList[hmmPos][0] + 128]
		let maxPosition = 0
		for (let i=0; i<this.pitchList[hmmPos].length; i++) {
			const currentPitchDiffProb = this.pitchDiffProb[pitch - this.pitchList[hmmPos][i] + 128]
			if (currentPitchDiffProb > max) {
				max = currentPitchDiffProb
				maxPosition = i
			}
		}

		let meiId = this.scorePosList[hmmPos][maxPosition]
		for (let i=0; i<this.hmm.duplicateOnsets.length; i++) {
			for (let j = 1; j < this.hmm.duplicateOnsets[i].numOnsets; j++) {
				if (meiId === this.hmm.duplicateOnsets[i].meiIDs[j]) {
					meiId = this.hmm.duplicateOnsets[i].meiIDs[0]
					break
				}
			}
		}
		return meiId
	}
	
	getCorrectSitch(hmmPos: number, meiId: string): string {
		for (let i = 0; i < this.hmm.events[hmmPos].meiIDsPerCluster.length; i++) {
			for (let j = 0; j < this.hmm.events[hmmPos].meiIDsPerCluster[i].length; j++) {
				if (meiId === this.hmm.events[hmmPos].meiIDsPerCluster[i][j]) {
					return this.hmm.events[hmmPos].sitchesPerCluster[i][j]
				}
			}
		}
		return ''
	}

	getMatchResult(pr: PianoRoll): ScorePerformanceMatch {
		const match = new ScorePerformanceMatch()

		this.isFirst = true

		// Viterbi updates
		for (let n=0; n<pr.events.length; n++) {
			const observed: Observation = {
				pitch: pr.events[n].pitch,
				ioi: n === 0 ? pr.events[n].ontime : (pr.events[n].ontime - pr.events[n-1].ontime)
			}
			this.update(observed, pr.events[n].ontime)
			match.events.push({
				id: pr.events[n].id,
				ontime: pr.events[n].ontime,
				offtime: pr.events[n].offtime,
				sitch: pr.events[n].sitch,
				onvel: pr.events[n].onvel,
				offvel: pr.events[n].offvel,
				channel: pr.events[n].channel,
				matchStatus: 0,
				errorIndex: 0,
				skipIndex: n === 0 ? '0' : '-'
			})
		}

		// Backtracking
		let stateSeq = new Array<number>(pr.events.length) // stores HMM positions
		stateSeq[stateSeq.length-1] = this.getOptimalState()
		for (let n=stateSeq.length-2; n>=0; n--) {
			stateSeq[n] = this.amaxHist[n+1][stateSeq[n+1]]
		}

		for (let i=0; i<pr.events.length; i++) {
			const meiId = this.getMeiId(stateSeq[i], pr.events[i].pitch)
			match.events[i].stime = this.stime[stateSeq[i]]
			match.events[i].meiId = meiId

			/*
			I assume this has no effect?

			if (correctSitch == "") { continue; }
			if (SitchToPitch(correctSitch) == SitchToPitch(match.evts[n].sitch)) {
				match.evts[n].sitch = correctSitch;
			}//endif
			*/
		}

		return match
	}
}
