import { HMM } from "./HMM";
import { PianoRoll } from "./PianoRoll";
import { ScoreFollower } from "./score-follower/ScoreFollower";

const hmm = new HMM()
const follower = new ScoreFollower(hmm, 1)

const pr = new PianoRoll()
const result = follower.getMatchResult(pr)

console.log(result)
