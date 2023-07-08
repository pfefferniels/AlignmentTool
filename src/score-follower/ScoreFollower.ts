import { assignProbabilities, logAdd, logNorm, normalize, normalizeMap } from "../BasicCalculation"
import { HMM } from "../HMM"
import { ScorePerformanceMatch } from "../Match"
import { StateType } from "../HMMState"
import { ioiDistributionFunctions, ioiInsertionDistribution, logIoiSkipDistribution } from "../IOIDistribution"
import { PianoRoll } from "../PianoRoll"
import { sitchToPitch } from "../BasicPitchCalculation"
import { TransitionType } from "../TransitionType"

type Observation = {
	/**
	 * inter-onset interval
	 */
	ioi: number
	pitch: number
}

export class ScoreFollower {
	/**
	 * score HMM
	 */
	hmm: HMM

	/** 
	 * pulses per quarter note
	 */
	ppq = 0

	isFirst = true

	/**
	 * number of states
	 */
	numberOfStates = 0

	/**
	 * index of current state
	 */
	currentState = 0

	/**
	 * index of previous state
	 */
	previousState = -1

	ticksPerSecond: number

	currentOnsetTime: number
	previousOnsetTime: number
	predictedNextTime: number

	tempo: number[] = []

	/**
	 * likelihood for each state
	 */
	likelihood: number[] = []

	maxPositionHistory: number[][] = []

	/**
	 * the observed pitches are saved here
	 */
	inputPitch: number[] = []

	/**
	 * history of onset times
	 */
	timeHist: number[] = []

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
	stime: number[] = []
	endStime: number[] = []

	topId: number[] = []
	internalId: number[] = [] // determined by an event's internal position

	/**
	 * relative IOI weights for each HMM event.
	 * They always sum up to one, cf. Nakamura 2015, p. 15
	 */
	ioiWeight: Map<TransitionType, number>[] = []
	stolenTime: number[] = []

	topTransitionLP: number[] = []
	internalTransitionLP: number[][][] = []
	secondsPerTick: number

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
		// 0=in, 1-100=states, 101=out
		const LP: number[][] = new Array<Array<number>>(102)
		for (let j = 0; j < LP.length; j++) {
			LP[j] = new Array<number>(102).fill(-1000)
		}
		LP[0][1] = Math.log(0.9)

		for (let j = 2; j <= this.internalId[index]; j++) {
			LP[0][j] = Math.log(0.1 / (this.internalId[index] - 1));
		}
		logNorm(LP[0])

		for (let j = 1; j <= this.internalId[index]; j++) {
			const value = selfTrProbability[(index + 1) - this.internalId[index] + j - 1]

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

	constructor(hmm: HMM, secPerQN: number) {
		// let d: number[] = new Array<number>(100)

		this.ppq = hmm.ppq
		this.hmm = hmm

		let curTopId = -1
		for (const event of hmm.events) {
			if (event.internalPosition === 1) {
				curTopId += 1
			}
			this.stime.push(event.scoreTime)
			this.endStime.push(event.endScoreTime)
			this.topId.push(curTopId)
			this.internalId.push(event.internalPosition)

			const selfTransitionWeight = new Map<TransitionType, number>([
				[TransitionType.Chord, 0.01],
				[TransitionType.Arpeggio, 0.01],
				[TransitionType.ShortAppoggiatura, 0.01],
				[TransitionType.Trill, 0.01]
			])

			if (event.stateType !== StateType.Trill) {
				selfTransitionWeight.set(TransitionType.Chord, selfTransitionWeight.get(TransitionType.Chord) + event.numCh())
				selfTransitionWeight.set(TransitionType.Arpeggio, selfTransitionWeight.get(TransitionType.Arpeggio) + event.numArp)
				selfTransitionWeight.set(TransitionType.ShortAppoggiatura, selfTransitionWeight.get(TransitionType.ShortAppoggiatura) + event.numInterCluster())
				this.stolenTime.push(0.13 * Math.max(event.numArp, event.numInterCluster()))
			}
			else {
				event.clusters.forEach(cluster => {
					selfTransitionWeight.set(TransitionType.Chord, cluster.length - 1)
					selfTransitionWeight.set(TransitionType.Trill, 1)
				})
				this.stolenTime.push(0)
			}
			normalizeMap(selfTransitionWeight)
			this.ioiWeight.push(selfTransitionWeight)
		}

		this.numberOfStates = this.hmm.events.length
		this.likelihood = new Array<number>(this.numberOfStates)
		this.secondsPerTick = secPerQN / this.ppq
		this.ticksPerSecond = 1 / this.secondsPerTick

		// trill overlaps
		this.hmm.events.forEach((event, i) => {
			if (event.stateType !== StateType.Trill || event.internalPosition <= 0) return

			// reorganize notes and assign a special voice type (-1)
			const notes = event.clusters.flat()
			for (let j = i - 1; j >= i - event.internalPosition + 1; j--) {
				this.hmm.events[j].clusters.push(notes.map(note => ({
					sitch: note.sitch,
					meiID: note.meiID,
					voice: -1
				})))
			}
		})

		this.hmm.events.filter(event => event.stateType === StateType.Trill).forEach(event => {
			event.recalculatePitchProbabilities(this.secondsPerTick)
		})

		// internal transition probability

		const selfTrProbability: number[] = []
		let prevTopId = 0

		for (const [i, event] of this.hmm.events.entries()) {
			let d0: number
			if (event.stateType !== StateType.Trill) {
				d0 = event.clusters.reduce((prev, curr) => {
					// this is not supposed to happen
					if (curr.length === 0) {
						throw new Error('clusters seem to be invalid')
					}

					return prev + curr.length * (curr[0].voice < 0 ? 0.5 : 1)
				}, 0)
			}
			else {
				const avgClusterSize = event.clusters.reduce((prev, curr) => prev + curr.length, 0) / (this.hmm.events.length - 1)
				d0 = Math.min(3, avgClusterSize * (this.secondsPerTick * (event.endScoreTime - event.scoreTime)) / 0.15)
			}
			selfTrProbability.push((d0 - 1 + 0.1) / (d0 + 0.1))

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
		if (this.numberOfStates <= 0) {
			console.log('no states')
			return
		}

		this.tempo.push(this.ticksPerSecond)
		this.m = Math.pow(0.2 / this.ticksPerSecond, 2)

		// cf. Nakamura et al. 2015 p. 22
		this.sigma_v = Math.pow(0.03 / (this.ticksPerSecond * this.ppq), 2)
		this.swSigma_t = [this.sigma_t, Math.pow(0.16, 2)]
		this.swSecPerTick = [1 / this.ticksPerSecond, 1 / this.ticksPerSecond]
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

		data.slice(0, -1).forEach(([da, prob]) => {
			this.topTransitionLP[da + this.D1] = Math.log(prob)
		})
		this.transitionSkipLP = -40 // offline

		this.pitchDiffProb = new Array<number>(256).fill(1E-20)
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
			this.isFirst = false
			this.currentOnsetTime = time
			this.previousOnsetTime = time
		}
		else {
			this.previousState = this.currentState
			this.updateLikelihood(observed)
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

		const nextEvent = this.hmm.events[this.currentState + 1]
		const currentEvent = this.hmm.events[this.currentState]
		const previousEvent = this.hmm.events[this.previousState]

		// two adjacent chord states with a minimal distance of 0.035?
		if (this.currentState > 0 &&
			this.previousState + 1 === this.currentState &&
			currentEvent.stateType === StateType.Chord &&
			previousEvent.stateType === StateType.Chord &&
			ioi > 0.035) {
			// score time difference between the two adjacent chord events 
			const nu = currentEvent.scoreTime - previousEvent.scoreTime

			const swk: [[number, number], [number, number]] = [[0, 0], [0, 0]]
			const swTmpPredSecPerTick: [[number, number], [number, number]] = [[0, 0], [0, 0]]
			const swDelta: [[number, number], [number, number]] = [[0, 0], [0, 0]]
			const tmpLPSwitch: number[] = new Array<number>(4); //2*s_{m-1}+s_m=2*r+s

			for (let r = 0; r < 2; r++) {
				for (let s = 0; s < 2; s++) {
					const tmp = nu ** 2 * this.swM[r] + this.swSigma_t[s]
					const tmp2 = ioi - nu * this.swSecPerTick[r]

					swk[r][s] = nu * this.swM[r] / tmp
					swTmpPredSecPerTick[r][s] = this.swSecPerTick[r] + swk[r][s] * tmp2
					swDelta[r][s] = (1 - swk[r][s] * nu) * this.swM[r];
					tmpLPSwitch[2 * r + s] = this.lpLambda[s] + this.lpSwitch[r] - 0.5 * Math.log(2 * Math.PI * tmp) - 0.5 * Math.pow(tmp2, 2) / tmp
				}
			}
			logNorm(tmpLPSwitch)

			for (let s = 0; s < 2; s++) {
				this.swSecPerTick[s] = (Math.exp(tmpLPSwitch[s]) * swTmpPredSecPerTick[0][s] + Math.exp(tmpLPSwitch[2 + s]) * swTmpPredSecPerTick[1][s]) / (Math.exp(tmpLPSwitch[s]) + Math.exp(tmpLPSwitch[2 + s]));
				this.swM[s] = (Math.exp(tmpLPSwitch[s]) * (swDelta[0][s] + Math.pow(this.swSecPerTick[s] - swTmpPredSecPerTick[0][s], 2.))
					+ Math.exp(tmpLPSwitch[2 + s]) * (swDelta[1][s] + Math.pow(this.swSecPerTick[s] - swTmpPredSecPerTick[1][s], 2.)))
					/ (Math.exp(tmpLPSwitch[s]) + Math.exp(tmpLPSwitch[2 + s]))
				this.swM[s] += nu ** 2 * this.sigma_v
				this.lpSwitch[s] = logAdd(tmpLPSwitch[s], tmpLPSwitch[2 + s])
			}
			logNorm(this.lpSwitch)
			this.ticksPerSecond = 1 / (this.swSecPerTick[0] * Math.exp(this.lpSwitch[0]) + this.swSecPerTick[1] * Math.exp(this.lpSwitch[1]))
		}

		if (this.ticksPerSecond <= 0) {
			throw new Error(`invalid ticks per second ${this.ticksPerSecond}`)
		}

		if (this.currentState < this.numberOfStates - 1) {
			this.predictedNextTime = time + (nextEvent.scoreTime - currentEvent.scoreTime) / this.ticksPerSecond
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
	private updateLikelihood(observed: Observation) {
		const prevLike = this.likelihood.slice()
		const ioi = observed.ioi
		const vi = new Array<number>(this.likelihood.length)

		for (const [i, event] of this.hmm.events.entries()) {
			// self transition
			let amax = i
			let max = prevLike[i]

			const probabilitySum = [TransitionType.Chord,
			TransitionType.Arpeggio,
			TransitionType.ShortAppoggiatura,
			TransitionType.Trill].map(transitionType => (
				this.ioiWeight[i].get(transitionType) * ioiDistributionFunctions.get(transitionType)(ioi)
			)).reduce((prev, curr) => prev + curr, 0)

			max += Math.log(Math.exp(this.internalTransitionLP[this.topId[i]][event.internalPosition][event.internalPosition]) * probabilitySum +
				Math.exp(this.topTransitionLP[this.D1] + this.internalTransitionLP[this.topId[i]][event.internalPosition][101] + this.internalTransitionLP[this.topId[i]][0][event.internalPosition]) * ioiInsertionDistribution(ioi))
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
					let mu = Math.max(
						0,
						(this.stime[this.topId[i]] - this.endStime[this.topId[j]]) / this.ticksPerSecond - this.stolenTime[j])

					logProbability = prevLike[j] + this.topTransitionLP[this.D1 + this.topId[i] - this.topId[j]] + this.internalTransitionLP[this.topId[j]][this.internalId[j]][101] + this.internalTransitionLP[this.topId[i]][0][this.internalId[i]]
						+ Math.log((0.3 / Math.PI) / (Math.pow(ioi - mu, 2.) + Math.pow(0.3, 2))); // offline
				}
				if (logProbability > max) {
					max = logProbability;
					amax = j;
				}
			}

			// backward transition
			for (let j = i + 1; j <= i + 18 && j < this.numberOfStates; j++) {
				if (this.topId[j] - this.topId[i] > this.D1) continue

				logProbability = prevLike[j] + this.topTransitionLP[this.D1 + this.topId[i] - this.topId[j]] + this.internalTransitionLP[this.topId[j]][this.internalId[j]][101] + this.internalTransitionLP[this.topId[i]][0][this.internalId[i]]
					+ ((ioi > 0.3) ? Math.log(2 * ioiInsertionDistribution(ioi)) : -10)
				if (logProbability > max) {
					max = logProbability
					amax = j
				}
			}

			// large skip
			logProbability = prevLike[this.currentState] + this.transitionSkipLP + this.internalTransitionLP[this.topId[this.currentState]][this.internalId[this.currentState]][101] + this.internalTransitionLP[this.topId[i]][0][this.internalId[i]]
				+ ((ioi > 0.3) ? logIoiSkipDistribution(ioi) : -20);
			if (logProbability > max) {
				max = logProbability
				amax = this.currentState
			}

			// update
			this.likelihood[i] = max + event.pitchProbabilities[observed.pitch]
			vi[i] = amax
		}

		this.maxPositionHistory.push(vi)
		this.inputPitch.push(observed.pitch)
	}

	/**
	 * assigns for each state the likelihood of the
	 * observed pitch and stores the observed pitch.
	 * 
	 * @param observed 
	 */
	updateInitialLikelihood(observed: Observation) {
		const vi = new Array<number>(this.likelihood.length)
		this.hmm.events.forEach((event, i) => {
			this.likelihood[i] += event.pitchProbabilities[observed.pitch]
			vi[i] = i
		})
		this.maxPositionHistory.push(vi)
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
		const allNotesAtPosition = this.hmm.events[hmmPos].clusters.flat()

		const pitchProbabilities = allNotesAtPosition.map(note => {
			const currentPitch = sitchToPitch(note.sitch)
			return this.pitchDiffProb[pitch - currentPitch + 128]
		})
		const maxPosition = pitchProbabilities.indexOf(Math.max(...pitchProbabilities))

		let meiId = allNotesAtPosition[maxPosition].meiID
		for (const duplicate of this.hmm.duplicateOnsets) {
			for (let j = 1; j < duplicate.numOnsets; j++) {
				if (meiId === duplicate.meiIDs[j]) {
					meiId = duplicate.meiIDs[0]
					break
				}
			}
		}

		return meiId
	}

	getCorrectSitch(hmmPos: number, meiId: string): string {
		for (const cluster of this.hmm.events[hmmPos].clusters) {
			const note = cluster.find(note => note.meiID === meiId)
			if (note) return note.sitch
		}
		return ''
	}

	getMatchResult(pr: PianoRoll): ScorePerformanceMatch {
		const match = new ScorePerformanceMatch()

		this.isFirst = true

		// Viterbi updates
		for (let n = 0; n < pr.events.length; n++) {
			const observed: Observation = {
				pitch: pr.events[n].pitch,
				ioi: n === 0 ? pr.events[n].ontime : (pr.events[n].ontime - pr.events[n - 1].ontime)
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
		const stateSeq = new Array<number>(pr.events.length) // stores HMM positions
		stateSeq[stateSeq.length - 1] = this.getOptimalState()
		for (let n = stateSeq.length - 2; n >= 0; n--) {
			stateSeq[n] = this.maxPositionHistory[n + 1][stateSeq[n + 1]]
		}

		for (let i = 0; i < pr.events.length; i++) {
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
