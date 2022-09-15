import { sitchToPitch } from ".."
import { HMM } from "../HMM"
import { StateType } from "../HMMState"
import { ErrorIndex, ScorePerformanceMatch } from "../Match"
import { PerformedNote, PerformedNoteStatus, ScoreNote, ScoreNoteStatus } from "../Note"
import { Region, Regions } from "./Regions";
import { TempoTracker } from "../realignment/TempoTracker";

export type ErrorRegions = {
    all: Regions
    pitchErrors: Regions 
    extraNotes: Regions
    reorderedNotes: Regions
    missingNotes: Regions
}


// aligned clusters
enum State {
	Normal = 0,
	Extra = 1
}

type AlignedCluster = {
	hmmId: number,
	matchIndex: number, // used to index match.events
	state: State,
	medianOnsetTime: number
}

export class ErrorDetector {
	hmm: HMM
	match: ScorePerformanceMatch

	constructor(hmm: HMM, match: ScorePerformanceMatch) {
		this.hmm = hmm
		this.match = match
	}

	public static errLP(pitchError: number) {
		const errMap = new Map<number, number>([
			[0, -0.0512932],
			[1, -4.892852],
			[2, -4.509860],
			[3, -7.6818715],
			[4, -7.6818715],
			[5, -7.6818715],
			[6, -7.6818715],
			[7, -7.6818715],
			[8, -7.6818715],
			[9, -7.6818715],
			[10, -7.6818715],
			[11, -7.6818715],
			[12, -6.0533399]
		])

		return errMap.get(Math.abs(pitchError)) || -30
	}

	/**
	* This function identifies missing notes in the match and
	* appends them to the `missingNotes` field
	* 
	* @param hmm 
	* @param match 
	*/
	public findMissingNotes() {
		const duplicateMeiIds =
			this.hmm.duplicateOnsets
				.map(duplicateOnset => duplicateOnset.meiIDs.slice(1))
				.flat()

		const missingNotes = []
		this.hmm.events.forEach(hmmEvent => {
			hmmEvent.clusters.flat().forEach(scoreNote => {
				// do not continue searching if this score note
				// is one of the duplicate notes
				if (duplicateMeiIds.includes(scoreNote.meiID)) return

				const correspondingMatch = this.match.events.find(match => match.meiId === scoreNote.meiID)
				if (!correspondingMatch) {
					missingNotes.push({
						stime: hmmEvent.scoreTime,
						meiId: scoreNote.meiID
					})
				}
			})
		})

		this.match.missingNotes = missingNotes
	}

	/**
	 * This function extracts aligned clusters from a prematch 
	 * in a structure useful for error detection
	 * 
	 * @param hmm 
	 * @param match 
	 */
	extractAlignedClusters(): AlignedCluster[] {
		// find the position of the matched notes in 
		// the HMM data structure
		const hmmPositions = []
		this.match.events.forEach(matchEvent => {
			const index = this.hmm.events.findIndex(hmmEvent => {
				return hmmEvent.clusters.flat().find(note => note.meiID === matchEvent.meiId) &&
					hmmEvent.scoreTime === matchEvent.stime
			})
			hmmPositions.push(index)
		})

		const alignedClusters: AlignedCluster[] =
			hmmPositions
				.reduce((prev, curr, i) => {
					if (prev.length > 0 && prev[prev.length - 1].hmmId === curr)
						return prev
					else
						return [...prev, {
							hmmId: curr,
							matchIndex: i,
							medianOnsetTime: -1,
							state: State.Normal
						}]
				}, [])

		// cluster-wise LR alignment
		const amax: number[][] = new Array(alignedClusters.length)
		for (let i = 0; i < alignedClusters.length; i++) {
			amax[i] = new Array(this.hmm.events.length).fill(0)
		}
		const LP: number[] = Array.from(new Array(this.hmm.events.length).keys()).map(i => {
			return alignedClusters[0].hmmId === 1 ? 0 : -1
		})

		alignedClusters.slice(1).forEach((cluster, shadow) => {
			let n = shadow + 1
			let prevLP = LP
			for (let i = 0; i < this.hmm.events.length; i++) {
				LP[i] = prevLP[i]
				amax[n][i] = i
				for (let j = 0; j < i; j++) {
					if (prevLP[j] > LP[i]) {
						LP[i] = prevLP[j];
						amax[n][i] = j;
					}
				}
				LP[i] += (cluster.hmmId === i) ? 0 : -1
			}
		})

		const opt = new Array<number>(alignedClusters.length)
		opt[opt.length - 1] = LP.indexOf(Math.max(...LP))

		for (let n = opt.length - 2; n >= 0; n--) {
			opt[n] = amax[n + 1][opt[n + 1]]
		}

		for (let n = 0; n < opt.length; n++) {
			if (alignedClusters[n].hmmId != opt[n]) {
				// Insertion of cluster: If the cluster IDs do not match
				alignedClusters[n].state = State.Extra
			} else {
				// Insertion of cluster: If the cluster ID appears more than once
				let found = false
				for (let j = 0; j < n; j += 1) {
					if (opt[j] == opt[n] && alignedClusters[j].hmmId == opt[j]) {
						found = true;
						break;
					}
				}
				if (found) alignedClusters[n].state = State.Extra
			}
		}

		// define median times for all HMM states (-1 if undefined)

		alignedClusters.forEach((cluster, i) => {
			if (cluster.state === State.Extra || this.hmm.events[cluster.hmmId].stateType !== StateType.Chord)
				return

			const nextMatchIndex = (i === alignedClusters.length - 1) ?
				this.match.events.length : alignedClusters[i + 1].matchIndex

			let refTimes: number[] = []
			for (let i = cluster.matchIndex; i < nextMatchIndex; i++) {
				refTimes.push(this.match.events[i].ontime)
			}

			refTimes.sort()
			cluster.medianOnsetTime = refTimes[Math.floor(refTimes.length / 2)]
		})

		return alignedClusters
	}

	markClusterwiseExtraNotes(alignedClusters: AlignedCluster[]) {
		alignedClusters
			.filter(cluster => this.hmm.events[cluster.hmmId].stateType === StateType.Trill)
			.forEach((cluster, i) => {
				const nextMatchIndex = (alignedClusters.indexOf(cluster) === alignedClusters.length - 1) ?
					this.match.events.length : alignedClusters[i + 1].matchIndex

				const refPitches = this.hmm.events[0].clusters.flat(2).map(n => sitchToPitch(n.sitch))
				for (let i = cluster.matchIndex; i < nextMatchIndex; i++) {
					if (refPitches.indexOf(sitchToPitch(this.match.events[i].sitch)) === -1) {
						// match.events[i].meiId = '*'
						this.match.events[i].errorIndex = ErrorIndex.ClusterwiseExtraNote
					}
				}
			})

	}

	// 
	getReferenceTimeForCluster(allClusters: AlignedCluster[], index: number): number {
		const nextMatchIndex = (index === allClusters.length - 1) ?
			this.match.events.length : allClusters[index + 1].matchIndex

		// Define reference time
		let refT: number | undefined
		const cluster = allClusters[index]
		const prevCluster = allClusters[index - 1]
		const nextCluster = allClusters[index + 1]
	
		if (cluster.hmmId > 0 && cluster.hmmId < this.hmm.events.length - 1) {
			// this cluster is sourounded by by clusters with defined onset times
			if (prevCluster.medianOnsetTime >= 0 && nextCluster.medianOnsetTime >= 0) {
				if (cluster.medianOnsetTime >= 0) {
					refT = 1 / 3 * cluster.medianOnsetTime
						+ 2 / 3 * (nextCluster.medianOnsetTime * (this.hmm.events[cluster.hmmId].scoreTime - this.hmm.events[cluster.hmmId - 1].scoreTime) + prevCluster.medianOnsetTime * (this.hmm.events[cluster.hmmId + 1].scoreTime - this.hmm.events[cluster.hmmId].scoreTime)) / Number(this.hmm.events[cluster.hmmId + 1].scoreTime - this.hmm.events[cluster.hmmId - 1].scoreTime)
				} else {
					refT = (nextCluster.medianOnsetTime * (this.hmm.events[cluster.hmmId].scoreTime - this.hmm.events[cluster.hmmId - 1].scoreTime) + prevCluster.medianOnsetTime * (this.hmm.events[cluster.hmmId + 1].scoreTime - this.hmm.events[cluster.hmmId].scoreTime)) / Number(this.hmm.events[cluster.hmmId + 1].scoreTime - this.hmm.events[cluster.hmmId - 1].scoreTime)
				}
			}
		}
		// only the current onset times are defined
		else if (cluster.medianOnsetTime >= 0) {
			refT = cluster.medianOnsetTime
		}
	
		if (refT === undefined) {
			let refTimes: number[] = []
			for (let i = cluster.matchIndex; i < nextMatchIndex; i++) {
				refTimes.push(this.match.events[i].ontime)
			}
			refTimes.sort()
			refT = refTimes[refTimes.length / 2]
		}

		return refT
	}

	detectErrors() {
		this.findMissingNotes()
		const alignedClusters = this.extractAlignedClusters()

		this.markClusterwiseExtraNotes(alignedClusters)
	
		const duplicateMeiIds =
			this.hmm.duplicateOnsets
				.map(duplicateOnset => duplicateOnset.meiIDs.slice(1))
				.flat()
	
	
		alignedClusters.forEach((cluster, n) => {
			const nextMatchIndex = (n === alignedClusters.length - 1) ?
				this.match.events.length : alignedClusters[n + 1].matchIndex
	
			const refT = this.getReferenceTimeForCluster(alignedClusters, n)
	
			const scoreClusterContent: ScoreNote[] = this.hmm.events[cluster.hmmId].clusters
				.flat(2)
				.filter(note => !duplicateMeiIds.includes(note.meiID))
				.map(note => ({
					meiId: note.meiID,
					pitch: sitchToPitch(note.sitch),
					sitch: note.sitch,
					noteStatus: ScoreNoteStatus.NotYetFound,
					hmm1Id: cluster.hmmId
				}))
				.sort((a, b) => a.pitch - b.pitch)
			// console.log('score cluster content', scoreClusterContent)
	
			let performedNoteClusterContent: PerformedNote[] = []
			for (let i = cluster.matchIndex; i < nextMatchIndex; i++) {
				performedNoteClusterContent.push({
					pitch: sitchToPitch(this.match.events[i].sitch),
					matchIndex: i,
					noteStatus: PerformedNoteStatus.Unknown
				})
			}
			performedNoteClusterContent.sort((a, b) => a.pitch - b.pitch)
			// console.log('performedNoteClusterContent=', performedNoteClusterContent)
	
			// Select best synchronised performed note for each pitch -> others are extra notes
	
			// Identify correct notes
			const matchEventOfPerformedCluster = (i: number) => this.match.events[performedNoteClusterContent[i].matchIndex]
	
			for (let m = 0; m < performedNoteClusterContent.length; m++) {
				let count = 1;
				let amin = m;
				let min = Math.abs(matchEventOfPerformedCluster(m).ontime - refT);
				performedNoteClusterContent[m].noteStatus = PerformedNoteStatus.Extra
				for (let mp = m + 1; mp < performedNoteClusterContent.length; mp++) {
					if (performedNoteClusterContent[mp].pitch != performedNoteClusterContent[m].pitch)
						break
					count += 1
					performedNoteClusterContent[mp].noteStatus = PerformedNoteStatus.Extra
					if (Math.abs(matchEventOfPerformedCluster(mp).ontime - refT) < min) {
						amin = mp;
						min = Math.abs(matchEventOfPerformedCluster(mp).ontime - refT);
					}
				}
	
				performedNoteClusterContent[amin].noteStatus = PerformedNoteStatus.Unknown
				for (let l = 0; l < scoreClusterContent.length; l++) {
					if (performedNoteClusterContent[amin].pitch == scoreClusterContent[l].pitch) {
						performedNoteClusterContent[amin].noteStatus = PerformedNoteStatus.Correct
						scoreClusterContent[l].noteStatus = ScoreNoteStatus.Found
						matchEventOfPerformedCluster(amin).meiId = scoreClusterContent[l].meiId
						matchEventOfPerformedCluster(amin).sitch = scoreClusterContent[l].sitch
						matchEventOfPerformedCluster(amin).errorIndex = ErrorIndex.Correct
						break
					}
				}
				m += count - 1
			}
	
			for (let m = performedNoteClusterContent.length - 1; m >= 0; m--) {
				if (performedNoteClusterContent[m].noteStatus === 1) {
					// matchEventOfPerformedCluster(m).meiId = '*'
					matchEventOfPerformedCluster(m).errorIndex = ErrorIndex.ClusterwiseExtraNote
					performedNoteClusterContent.splice(m, 1)
				} else if (performedNoteClusterContent[m].noteStatus === 0) {
					performedNoteClusterContent.splice(m, 1)
				}
			}
	
			/// Identify pitch error or extra note
			let scoreClusterSize = scoreClusterContent.length;
			for (let l = -1; l < scoreClusterSize; l++) {
	
				let minPitch = -1;
				let maxPitch = 500;
	
				if (l >= 0) {
					minPitch = scoreClusterContent[l].pitch;
				}
				let SCIDs: number[] = [] // ID for notes in score cluster content
				for (let lp = l + 1; lp < scoreClusterContent.length; lp++) {
					l = lp - 1;
					if (scoreClusterContent[lp].noteStatus == 1) {
						maxPitch = scoreClusterContent[lp].pitch;
						break;
					}
					SCIDs.push(lp);
					if (lp == scoreClusterContent.length - 1 && scoreClusterContent[lp].noteStatus == 0) {
						l = lp;
					}
				}
	
				let PCIDs: number[] = [] // ID for notes in perform cluster content
				for (let m = 0; m < performedNoteClusterContent.length; m++) {
					if (performedNoteClusterContent[m].pitch > minPitch && performedNoteClusterContent[m].pitch < maxPitch) {
						PCIDs.push(m);
						performedNoteClusterContent[m].noteStatus = PerformedNoteStatus.Extra
					}
				}
	
				if (PCIDs.length === 0) continue
				if (SCIDs.length === 0) {
					for (let mm = 0; mm < PCIDs.length; mm++) {
						performedNoteClusterContent[PCIDs[mm]].noteStatus = PerformedNoteStatus.Extra
					}
					continue
				}
	
				if (PCIDs.length == SCIDs.length) {
					for (let mm = 0; mm < PCIDs.length; mm++) {
						performedNoteClusterContent[PCIDs[mm]].noteStatus = PerformedNoteStatus.Substition
						performedNoteClusterContent[PCIDs[mm]].scoreNoteRef = SCIDs[mm];
					}
					continue
				}
	
				// Reach here only if (PCIDs.length>1 or SCIDs.length>1)
				// note-wise LR alignment for (minPitch,maxPitch)
				let stateSize = PCIDs.length + 2; //state = 0(N/A) / PCID+1 / 9999(N/A)
				const LP = new Array<number>(stateSize)
				const amax = new Array(SCIDs.length)
				for (let i = 0; i < SCIDs.length; i++) {
					amax[i] = new Array<number>(stateSize).fill(0)
				}
	
				// initial probability (uniform)
				LP[0] = -100
				for (let i = 1; i < stateSize - 1; i++) {
					LP[i] = ErrorDetector.errLP(performedNoteClusterContent[PCIDs[i - 1]].pitch - scoreClusterContent[SCIDs[0]].pitch);
				}
				LP[stateSize - 1] = -100;
	
				let logP;
				for (let t = 1; t < SCIDs.length; t++) {
					const preLP: number[] = LP.slice() // copy
	
					LP[0] = preLP[0] - 100
					amax[t][0] = 0
	
					for (let i = 1; i < stateSize - 1; i++) {
						amax[t][i] = 0;
						LP[i] = preLP[0];
						for (let j = 1; j < i; j++) {
							logP = preLP[j];
							if (logP > LP[i]) {
								LP[i] = logP
								amax[t][i] = j
							}
						}
						LP[i] += ErrorDetector.errLP(performedNoteClusterContent[PCIDs[i - 1]].pitch - scoreClusterContent[SCIDs[t]].pitch);
					}
	
					amax[t][stateSize - 1] = stateSize - 1;
					LP[stateSize - 1] = preLP[stateSize - 1];
					for (let j = 1; j < stateSize - 1; j++) {
						logP = preLP[j]
						if (logP > LP[stateSize - 1]) {
							LP[stateSize - 1] = logP
							amax[t][stateSize - 1] = j
						}
					}
					LP[stateSize - 1] -= 100
	
				}
	
				let optPath = new Array<number>(SCIDs.length)
				optPath[SCIDs.length - 1] = 0
				let max = LP[0]
				for (let i = 1; i < stateSize; i++) {
					if (LP[i] > max) {
						max = LP[i]
						optPath[SCIDs.length - 1] = i
					}
				}
				for (let t = SCIDs.length - 2; t >= 0; t -= 1) {
					optPath[t] = amax[t + 1][optPath[t + 1]];
				}
	
				for (let i = 0; i < SCIDs.length; i++) {
					if (optPath[i] == 0 || optPath[i] == PCIDs.length + 1) { continue; }
					performedNoteClusterContent[PCIDs[optPath[i] - 1]].noteStatus = PerformedNoteStatus.Substition
					performedNoteClusterContent[PCIDs[optPath[i] - 1]].scoreNoteRef = SCIDs[i]
				}
	
			}
	
			performedNoteClusterContent.forEach(note => {
				const matchEvent = this.match.events[note.matchIndex]
	
				if (note.noteStatus === PerformedNoteStatus.Extra) {
					// matchEvent.meiId = '*'
					matchEvent.errorIndex = ErrorIndex.ClusterwiseExtraNote
				}
				else if (note.noteStatus === PerformedNoteStatus.Substition) {
					matchEvent.meiId = scoreClusterContent[note.scoreNoteRef].meiId
					matchEvent.errorIndex = ErrorIndex.PitchError
				}
				else {
					throw new Error('unreachable')
				}
			})
		})
	}

	getErrorRegions(widthSec: number): ErrorRegions {
		// normalize duplicate note labels
		this.match.events.forEach(match => {
			this.hmm.duplicateOnsets.forEach(duplicateOnset => {
				duplicateOnset.meiIDs.forEach(meiId => {
					if (match.meiId === meiId) {
						match.meiId = duplicateOnset.meiIDs[0]
					}
				})
			})
		})
	
		const pitchErrorPositions = []
		const extraNotePositions = []
		const reorderedNotePositions = []
		const scoreTimes: number[] = []
		const onsetTimes: number[] = []
	
		let preScoreTime = -1
	
		// pick up performance errors
		this.match.events.forEach((match, n) => {
			if (match.errorIndex === ErrorIndex.PitchError) {
				pitchErrorPositions.push(n)
			}
			else if (match.errorIndex === ErrorIndex.ClusterwiseExtraNote || 
					 match.errorIndex === ErrorIndex.NotewiseExtraNote) {
				extraNotePositions.push(n)            
			}
	
			if (match.errorIndex === ErrorIndex.PitchError ||
				match.errorIndex === ErrorIndex.Correct) {
				scoreTimes.push(match.stime)
				onsetTimes.push(match.ontime)
				if (match.stime < preScoreTime) {
					reorderedNotePositions.push(n)
				}
				preScoreTime = match.stime
			}
		})
	
		const errRegions = new Regions()
	
		// adds time windows around the onset and returns
		// the corresponding regions
		function onsetTimesToRegions(onsets: number[]) {
			const result = new Regions()
			onsets.forEach(onset => {
				result.add(new Region(onset - widthSec, onset + widthSec))
				errRegions.add(new Region(onset - widthSec, onset + widthSec))
			})
			return result
		}
	
		const tempoTracker = new TempoTracker()
		tempoTracker.setData(scoreTimes, onsetTimes)
	
		const pitchErrorRegions = onsetTimesToRegions(pitchErrorPositions.map(pos => this.match.events[pos].ontime))
		const extraNoteRegions = onsetTimesToRegions(extraNotePositions.map(pos => this.match.events[pos].ontime))
		const reorderedNoteRegions = onsetTimesToRegions(reorderedNotePositions.map(pos => this.match.events[pos].ontime))
		const missingNoteRegions = onsetTimesToRegions(this.match.missingNotes.map(missingNote => tempoTracker.getTime(missingNote.stime)))
	
		return {
			all: errRegions,
			pitchErrors: pitchErrorRegions,
			extraNotes: extraNoteRegions,
			reorderedNotes: reorderedNoteRegions,
			missingNotes: missingNoteRegions
		}
	}
}
