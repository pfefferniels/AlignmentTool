import { TempoTracker } from '../src/realignment/TempoTracker'

describe('TempoTracker', function() {
    it('tracks tempo of equally spaced noted', function() {
        const scoreTimes = [0, 720, 1440, 2160]
        const onsetTimes = [0, 0.5, 1, 1.5]
        const tracker = new TempoTracker()
        tracker.setData(scoreTimes, onsetTimes)
        expect(scoreTimes.map(scoreTime => tracker.getTime(scoreTime))).toEqual(onsetTimes)
    })

    it('tracks tempo of a sequence with arpeggiations', function() {
        const scoreTimes = [0, 720, 720, 1440, 2160]
        const onsetTimes = [0, 0.4, 0.6, 1, 1.5]
        const tracker = new TempoTracker()
        tracker.setData(scoreTimes, onsetTimes)
        expect(scoreTimes.map(scoreTime => tracker.getTime(scoreTime))).toEqual([0, 0.5, 0.5, 1, 1.5])
    })

    it('calculates the estimated onset time for a not-given score time', function() {
        const scoreTimes = [720, 1440]
        const onsetTimes = [1, 1.5]
        const tracker = new TempoTracker()
        tracker.setData(scoreTimes, onsetTimes)

        // test value below the first score time
        expect(tracker.getTime(360)).toEqual(0.75) 

        // test value in between two score times
        expect(tracker.getTime(1080)).toEqual(1.25)

        // test value above the last score time
        expect(tracker.getTime(1800)).toEqual(1.75)
    })
})
