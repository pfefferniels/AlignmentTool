import { assignProbabilities, normalize } from "./BasicCalculation"
import { sitchToPitch } from "./BasicPitchCalculation"
import { StateType } from "./HMMState"

export type ClusterNote = {
	sitch: string,
	voice: number,
	meiID: string
}

export type Cluster = ClusterNote[]

export class HMMEvent {
	scoreTime: number
	endScoreTime: number
	internalPosition: number
	stateType: StateType
	clusters: Cluster[]
	numArp: number

	/**
	 * pitch output probability – describes how performers
	 * actually produce notes.
	 */
	pitchProbabilities: number[]

	constructor(scoreTime: number, endScoreTime: number, clusters: Cluster[], stateType = StateType.Chord, internalPosition = 1, numArp = 0) {
		this.scoreTime = scoreTime
		this.endScoreTime = endScoreTime
		this.clusters = clusters
		this.stateType = stateType
		this.internalPosition = internalPosition
		this.numArp = numArp
		this.recalculatePitchProbabilities(1)
	}

	numSitches() {
		if (this.stateType === StateType.Trill) return 0
		return this.clusters.flat().length
	}

	numClusters() {
		return this.clusters.length
	}

	numCh() {
		if (this.stateType === StateType.Trill) return 0
		return this.numSitches() - this.numClusters() - this.numArp
	}

	numInterCluster() {
		if (this.stateType === StateType.Trill) return 0
		return this.numClusters() - 1
	}

	recalculatePitchProbabilities(iniSecPerTick: number) {
		// all pitches
		let pitchProbabilities = new Array<number>(128).fill(0.000001)
		if (this.stateType !== StateType.Trill) {
			this.clusters.forEach(cluster => {
				cluster.forEach(note => {
					assignProbabilities(pitchProbabilities, sitchToPitch(note.sitch), note.voice < 0)
				})
			})
		}
		else {
			this.clusters.forEach((cluster, clusterIndex) => {
				// special treatment for the last cluster
				if (clusterIndex === this.clusters.length - 1) {
					const nClusters = this.clusters.length - 1
					const factor = 1 / (nClusters * iniSecPerTick * (this.endScoreTime - this.scoreTime / 0.15))
					cluster.forEach(note => {
						assignProbabilities(pitchProbabilities, sitchToPitch(note.sitch), note.voice < 0, factor)
					})
				}
				else {
					cluster.forEach(note => {
						assignProbabilities(pitchProbabilities, sitchToPitch(note.sitch), note.voice < 0)
					})
				}
			})
		}
		normalize(pitchProbabilities)
		this.pitchProbabilities = pitchProbabilities.map(value => Math.log(value))
	}
}

type DuplicateOnsetEvent = {
	scoreTime: number
	sitch: string
	numOnsets: number
	meiIDs: string[]
}

export class HMM {
	events: HMMEvent[] = []
	duplicateOnsets: DuplicateOnsetEvent[] = []
	ppq: number = 4

	fromMEI(mei: string) {
		// TODO create HMM representation of a MEI score

		/*
		HmmEvt evt;
		evt.numNotesPerCluster.resize(1);
		evt.sitchesPerCluster.resize(1);
		evt.voicesPerCluster.resize(1);
		evt.fmt1IDsPerCluster.resize(1);
		vector < int > vi;

		for (int i = 0; i < fmt3x.evts.size(); i += 1) {
			evt.stime = fmt3x.evts[i].stime;
			evt.endstime = fmt3x.evts[i].stime;
			evt.internalPosition = 1;
			evt.stateType = "CH";

			evt.numClusters = 1;
			evt.numSitches = fmt3x.evts[i].numNotes;
			evt.numCh = fmt3x.evts[i].numNotes - 1;
			evt.numArp = 0;
			evt.numInterCluster = 0;

			evt.numNotesPerCluster[0] = fmt3x.evts[i].numNotes;
			evt.sitchesPerCluster[0] = fmt3x.evts[i].sitches;
			vi.assign(fmt3x.evts[i].numNotes, 0);
			evt.voicesPerCluster[0] = vi;
			evt.fmt1IDsPerCluster[0] = fmt3x.evts[i].fmt1IDs;

			evts.push_back(evt);
		}//endfor i

		for (int i = 0; i < fmt3x.duplicateOnsets.size(); i += 1) {
			DuplicateOnsetEvt dup;
			dup.stime = fmt3x.duplicateOnsets[i].stime;
			dup.sitch = fmt3x.duplicateOnsets[i].sitch;
			dup.numOnsets = fmt3x.duplicateOnsets[i].numOnsets;
			dup.fmt1IDs = fmt3x.duplicateOnsets[i].fmt1IDs;
			duplicateOnsets.push_back(dup);
		}//endfor i*/

	}

	serialize() {
		return ''
	}
}

/*
		void ResetInternalPosition(){//AN have negative internal positions
		int preStime = -1000;
		int NTmpEvts = 0;
		int numANs = 0;
			for (int i = 0; i < evts.size(); i += 1) {
				if (evts[i].stime != preStime) {
					for (int i_ = i - 1; i_ >= i - NTmpEvts; i_ -= 1) {
						evts[i_].internalPosition -= numANs;
					}//endfor i_
					preStime = evts[i].stime;
					NTmpEvts = 0;
					numANs = 0;
				}//endif

				NTmpEvts += 1;
				if (evts[i].stateType == "AN") {
					numANs += 1;
				}//endif

			}//endfor i
			for (int i_ = evts.size() - 1; i_ >= evts.size() - NTmpEvts; i_ -= 1) {
				evts[i_].internalPosition -= numANs;
			}//endfor i_

		}//end ResetInternalPosition


	bool IsDuplicate(string fmt1ID_){
		bool found = false;
			for (int i = 0; i < duplicateOnsets.size(); i += 1) {
				for (int j = 1; j < duplicateOnsets[i].numOnsets; j += 1) {
					if (fmt1ID_ == duplicateOnsets[i].fmt1IDs[j]) {
						found = true;
						break;
					}//endif
				}//endfor j
			}//endfor i
			return found;
		}//end IsDuplicate
* /
*/

