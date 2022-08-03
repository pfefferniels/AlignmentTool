import { HMM, HMMEvent } from "../src/HMM"
import { PianoRoll } from "../src/PianoRoll"
import { ScoreFollower } from "../src/score-follower/ScoreFollower"
import { detectErrors } from "../src/error-detection/ErrorDetection"

describe('HMMEvent', function() {
    it('constructs an HMMEvent', function() {
        const event = new HMMEvent(3, 4, [
            [{ sitch: 'D5', meiID: '#note4', voice: 1 },
            { sitch: 'B3', meiID: '#note5', voice: 3 }]
        ])

        expect(event.numSitches()).toEqual(2)
        expect(event.pitchProbabilities.findIndex(value => Math.round(value) === -1)).toEqual(59)
    })
})

describe('ScoreFollower', function () {
    it('constructs a ScoreFollower with a given HMM', function () {
        const hmm = new HMM()
        hmm.events = [
            new HMMEvent(0, 3, [
                [{ sitch: 'A3', meiID: '#note1', voice: 3 },
                { sitch: 'E4', meiID: '#note2', voice: 2 },
                { sitch: 'C#5', meiID: '#note3', voice: 1 }]]),
            new HMMEvent(3, 4, [
                [{ sitch: 'D5', meiID: '#note4', voice: 1 },
                { sitch: 'B3', meiID: '#note5', voice: 3 }]
            ])]
        const follower = new ScoreFollower(hmm, 4)

        expect(follower.ppq).toEqual(4)
        expect(follower.numberOfStates).toEqual(2)
        expect(follower.isFirst).toEqual(true)
        expect(follower.currentState).toEqual(0)
        expect(follower.previousState).toEqual(-1)
        expect(follower.tickPerSecond).toEqual(1)
        expect(follower.likelihood.length).toEqual(2)
        expect(follower.likelihood[0]).toEqual(-0.10536051565782628)
        expect(follower.likelihood[1]).toEqual(-2.3025850929940455)
        expect(follower.stime).toEqual([0, 3])
        expect(follower.topId).toEqual([0, 1])
        expect(follower.internalId).toEqual([1, 1])
        expect(follower.topTransitionLP.length).toEqual(6)
    })

    it('aligns PianoRoll and HMM #1', function () {
        const hmm = new HMM()
        hmm.events = [
            new HMMEvent(0, 3, [
                [{ sitch: 'A3', meiID: '#note1', voice: 3 },
                { sitch: 'E4', meiID: '#note2', voice: 2 },
                { sitch: 'C#5', meiID: '#note3', voice: 1 }]]),
            new HMMEvent(3, 4, [
                [{ sitch: 'D5', meiID: '#note4', voice: 1 },
                { sitch: 'B3', meiID: '#note5', voice: 3 }]
            ])]

        const follower = new ScoreFollower(hmm, 1)

        const pr = new PianoRoll()
        pr.events =
            [
                { ontime: 1.008333, offtime: 2.307292, id: '001', pitch: 73, sitch: 'C#5', onvel: 80, offvel: 80, channel: 1, endtime: 2.5, label: '001' },
                { ontime: 1.025000, offtime: 2.333333, id: '002', pitch: 57, sitch: 'A3', onvel: 80, offvel: 80, channel: 1, endtime: 2.5, label: '002' },
                { ontime: 1.037500, offtime: 2.584375, id: '003', pitch: 64, sitch: 'E4', onvel: 80, offvel: 80, channel: 1, endtime: 2.5, label: '003' },
                { ontime: 2.445833, offtime: 2.595833, id: '004', pitch: 59, sitch: 'B3', onvel: 80, offvel: 80, channel: 1, endtime: 2.5, label: '004' },
                { ontime: 2.458333, offtime: 2.604167, id: '005', pitch: 74, sitch: 'D5', onvel: 80, offvel: 80, channel: 1, endtime: 2.5, label: '005' },
            ]

        const result = follower.getMatchResult(pr)

        expect(result.events.map(event => event.meiId)).toEqual(['#note3', '#note1', '#note2', '#note5', '#note4'])
        expect(result.events.map(event => event.id)).toEqual(['001', '002', '003', '004', '005'])
    })

    it ('detects missing notes', function () {
        const hmm = new HMM()
        hmm.events = [
            new HMMEvent(3, 4.5, [
                [{ sitch: 'C5', meiID: '#m-46', voice: 1 },
                 { sitch: 'D3', meiID: '#m-56', voice: 3 }]
            ]),
            new HMMEvent(3.5, 4, [
                [{ sitch: 'G#3', meiID: '#m-60', voice: 3 }]
            ]),
            new HMMEvent(4, 4.5, [
                [{ sitch: 'C4', meiID: '#m-62', voice: 2 },
                 { sitch: 'F#4', meiID: '#m-64', voice: 3 }]
            ])
        ]

        const follower = new ScoreFollower(hmm, 1)

        const pr = new PianoRoll()
        pr.events =
            [
                { ontime: 2.328, offtime: 3.261, id: '1', pitch: 50, sitch: 'D3', onvel: 80, offvel: 80, channel: 1 },
                { ontime: 2.387, offtime: 3.561, id: '2', pitch: 72, sitch: 'C5', onvel: 80, offvel: 80, channel: 1 },
                { ontime: 3.122, offtime: 3.556, id: '3', pitch: 56, sitch: 'G#3', onvel: 80, offvel: 80, channel: 1 },
                { ontime: 3.779, offtime: 4.308, id: '4', pitch: 66, sitch: 'F#4', onvel: 80, offvel: 80, channel: 1 },
                //{ ontime: 3.780, offtime: 4.311, id: '4', pitch: 61, sitch: 'C#4', onvel: 80, offvel: 80, channel: 1 }
            ]

        const result = follower.getMatchResult(pr)

        detectErrors(hmm, result)

        expect(result.events.map(event => event.meiId)).toEqual(['#m-56', '#m-46', '#m-60', '#m-64'])
        expect(result.missingNotes).toEqual([{ stime: 4, meiId: '#m-62'}])
    })
})

