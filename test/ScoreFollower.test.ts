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
                clusters: [
                    [
                        {
                            sitch: 'A4',
                            meiID: '#meiId1',
                            voice: 1
                        }
                    ]
                ],
                numSitches: 1,
                numInterCluster: 0,
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
        expect(result.events[0].meiId).toEqual(hmm.events[0].clusters[0][0].meiID)
        expect(result.events[0].id).toEqual(pr.events[0].id)
    })

    it('aligns multiple notes', function () {
        const hmm = new HMM()
        hmm.events = [
            {
                scoreTime: 1,
                endScoreTime: 2,
                internalPosition: 1,
                stateType: StateType.Chord,
                numCh: 1,
                numArp: 0,
                clusters: [
                    [
                        {
                            sitch: 'A4',
                            meiID: '#meiId1',
                            voice: 1
                        }
                    ]
                ],
                numSitches: 1,
                numInterCluster: 0,
            },
            {
                scoreTime: 2,
                endScoreTime: 3,
                internalPosition: 2,
                stateType: StateType.Chord,
                numCh: 1,
                numArp: 0,
                clusters: [
                    [
                        {
                            sitch: 'Ab4',
                            meiID: '#meiId2',
                            voice: 1
                        }
                    ]
                ],
                numSitches: 1,
                numInterCluster: 0,
            }
        ]
        const follower = new ScoreFollower(hmm, 1)

        const pr = new PianoRoll()
        pr.events = [{
            ontime: 1.25,
            offtime: 2.135,
            id: '000',
            pitch: 69,
            sitch: 'A4',
            onvel: 80,
            offvel: 80,
            channel: 1,
            endtime: 2.5,
            label: '000'
        }, {
            ontime: 2.00,
            offtime: 2.75,
            id: '001',
            pitch: 68,
            sitch: 'Ab4',
            onvel: 80,
            offvel: 80,
            channel: 1,
            endtime: 3.1,
            label: '001'
        }]

        const result = follower.getMatchResult(pr)
        console.log(result.events)
    })

})

