import { assignProbabilities, Prob } from "../BasicCalculation";
import { HMM } from "../hmm/HMM";
import { HMMState } from "../hmm/HMMState";
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

