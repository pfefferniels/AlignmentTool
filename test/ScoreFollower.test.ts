import { HMM, HMMEvent } from "../src/HMM"
import { PianoRoll } from "../src/PianoRoll"
import { ScoreFollower } from "../src/score-follower/ScoreFollower"

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
        expect(follower.scorePosList).toEqual([["#note1", "#note2", "#note3"], ["#note4", "#note5"]])
        expect(follower.stime).toEqual([0, 3])
        expect(follower.topId).toEqual([0, 1])
        expect(follower.internalId).toEqual([1, 1])
        expect(follower.topTransitionLP.length).toEqual(6)
    })

    it('aligns PianoRoll and HMM', function () {
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
})

