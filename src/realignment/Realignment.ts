import { assignProbabilities, Prob } from "../BasicCalculation";
import { HMM } from "../HMM";
import { HMMState } from "../HMMState";
import { ScorePerformanceMatch } from "../Match";

class PartHMM {
	states: HMMState[]
	initialProb: Prob<number>

	clear() {
		this.states = []
	}
}

type PartAlignment = {
	part: number, 
	stateId: number, 
	noteId: number
}

class MOHMM {
	match: ScorePerformanceMatch
	hmm: HMM
	secPerTick: number

}
