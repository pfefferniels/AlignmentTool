import { HMM } from "../src/HMM"
import { PianoRoll } from "../src/PianoRoll"
import { ScoreFollower } from "../src/score-follower/ScoreFollower"

describe('ScoreFollower', function () {
    it('aligns stuff', function () {
        const hmm = new HMM()
        const follower = new ScoreFollower(hmm, 1)

        const pr = new PianoRoll()
        const result = follower.getMatchResult(pr)

        console.log(result)

    })
})
