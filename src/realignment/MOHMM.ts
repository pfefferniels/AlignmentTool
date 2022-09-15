import { HMM } from ".."
import { ScorePerformanceMatch } from "../Match"

/**
 * Merged output HMM
 */
export class MOHMM {
    match: ScorePerformanceMatch
    hmm: HMM
    secPerTick: number
}
