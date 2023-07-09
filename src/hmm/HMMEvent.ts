import { assignProbabilities, normalize } from "../BasicCalculation";
import { sitchToPitch } from "../BasicPitchCalculation";
import { StateType } from "./HMMState";
import { Cluster } from "./HMM";

/**
 * Represents a score event.
 */
export class HMMEvent {
	scoreTime: number;
	endScoreTime: number;
	internalPosition: number;
	stateType: StateType;
	clusters: Cluster[];
	numArp: number;

	/**
	 * pitch output probability – describes how performers
	 * actually produce notes.
	 */
	pitchProbabilities: number[];

	constructor(scoreTime: number, endScoreTime: number, clusters: Cluster[], stateType = StateType.Chord, internalPosition = 1, numArp = 0) {
		this.scoreTime = scoreTime;
		this.endScoreTime = endScoreTime;
		this.clusters = clusters;
		this.stateType = stateType;
		this.internalPosition = internalPosition;
		this.numArp = numArp;
		this.recalculatePitchProbabilities(1);
	}

	numSitches() {
		if (this.stateType === StateType.Trill) return 0;
		return this.clusters.flat().length;
	}

	numClusters() {
		return this.clusters.length;
	}

	numCh() {
		if (this.stateType === StateType.Trill) return 0;
		return this.numSitches() - this.numClusters() - this.numArp;
	}

	numInterCluster() {
		if (this.stateType === StateType.Trill) return 0;
		return this.numClusters() - 1;
	}

	recalculatePitchProbabilities(iniSecPerTick: number) {
		// all pitches
		const pitchProbabilities = new Array<number>(128).fill(0.000001);
		if (this.stateType !== StateType.Trill) {
			this.clusters.forEach(cluster => {
				cluster.forEach(note => {
					assignProbabilities(pitchProbabilities, sitchToPitch(note.sitch), note.voice < 0);
				});
			});
		}
		else {
			this.clusters.forEach((cluster, clusterIndex) => {
				// special treatment for the last cluster
				if (clusterIndex === this.clusters.length - 1) {
					const nClusters = this.clusters.length - 1;
					const factor = 1 / (nClusters * iniSecPerTick * (this.endScoreTime - this.scoreTime / 0.15));
					cluster.forEach(note => {
						assignProbabilities(pitchProbabilities, sitchToPitch(note.sitch), note.voice < 0, factor);
					});
				}
				else {
					cluster.forEach(note => {
						assignProbabilities(pitchProbabilities, sitchToPitch(note.sitch), note.voice < 0);
					});
				}
			});
		}
		normalize(pitchProbabilities);
		this.pitchProbabilities = pitchProbabilities.map(value => Math.log(value));
	}
}
