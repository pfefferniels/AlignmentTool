import { HMM } from "../src/HMM"
import { StateType } from "../src/HMMState"
import { PianoRoll } from "../src/PianoRoll"
import { ScoreFollower } from "../src/score-follower/ScoreFollower"

describe('ScoreFollower', function () {
    it('aligns two notes', function () {
        const hmm = new HMM()
        hmm.events = [
            {
                scoreTime: 1,
                endScoreTime: 2,
                internalPosition: 1,
                stateType: StateType.Chord,
                numCh: 1,
                numArp: 0,
                numClusters: 1,
                numSitches: 1,
                numInterCluster: 0,
                numNotesPerCluster: [1],
                sitchesPerCluster: [['A4']],
                meiIDsPerCluster: [['#meiId']],
                voicesPerCluster: [[1]]
            }
        ]
        const follower = new ScoreFollower(hmm, 1)

        const pr = new PianoRoll()
        pr.events = [{
            ontime: 1.25,
            offtime: 2.135,
            id: '123',
            pitch: 69,
            sitch: 'A4',
            onvel: 80,
            offvel: 80,
            channel: 1,
            endtime: 2.5,
            label: '123'
        }]

        const result = follower.getMatchResult(pr)
        expect(result.events).toEqual([
            {
                id: '123',
                ontime: 1.25,
                offtime: 2.135,
                sitch: 'A4',
                onvel: 80,
                offvel: 80,
                channel: 1,
                matchStatus: 0,
                errorIndex: 0,
                skipIndex: '0',
                stime: 1,
                meiId: '#meiId'
            }
        ])
    })
})
