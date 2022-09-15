import { ErrorDetector, HMM, HMMEvent, PianoRoll, realign, ScoreFollower } from "../src"

describe('Realigner', function() {
    it('realigns error regions', function() {
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
                { ontime: 1.0, offtime: 2.307292, id: '001', pitch: 72, sitch: 'C5', onvel: 80, offvel: 80, channel: 1, endtime: 2.5, label: '001' },
                { ontime: 1.1, offtime: 2.333333, id: '002', pitch: 58, sitch: 'A#3', onvel: 80, offvel: 80, channel: 1, endtime: 2.5, label: '002' },
                { ontime: 1.1, offtime: 2.584375, id: '003', pitch: 64, sitch: 'E4', onvel: 80, offvel: 80, channel: 1, endtime: 2.5, label: '003' },
                { ontime: 2.0, offtime: 2.595833, id: '004', pitch: 59, sitch: 'B3', onvel: 80, offvel: 80, channel: 1, endtime: 2.5, label: '004' },
                { ontime: 2.1, offtime: 2.604167, id: '005', pitch: 74, sitch: 'D5', onvel: 80, offvel: 80, channel: 1, endtime: 2.5, label: '005' },
            ]

        const result = follower.getMatchResult(pr)
        
        const errorDetector = new ErrorDetector(hmm, result)
        errorDetector.detectErrors()
        const errorRegions = errorDetector.getErrorRegions(0.3)

        realign(hmm, result, errorRegions)
    })
})
