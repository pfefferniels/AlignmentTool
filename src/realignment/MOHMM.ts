import { HMM, PianoRoll } from ".."
import { ScorePerformanceMatch } from "../Match"

type Interval = [number, number]

const constructPianoRollFromHMM = (hmm: HMM, scoreRegion: Interval, physicalRegion: Interval) => {
    return new PianoRoll()
}

/**
 * Merged output HMM
 */
export class MOHMM {
    match: ScorePerformanceMatch
    hmm: HMM
    secPerTick: number

    pr: PianoRoll

    realign(scoreRegion: Interval, physicalRegion: Interval) {
        console.log('realigning', scoreRegion, physicalRegion)

		this.pr = constructPianoRollFromHMM(this.hmm, scoreRegion, physicalRegion)
		
        this.separateHands()
		this.constructPartHMMs()
		this.getPerformedNotes()
		this.viterbi()

        // detectErrors()
    }

    separateHands() {

    }

    constructPartHMMs() {

    }

    getPerformedNotes() {

    }

    viterbi() {
        
    }
}
