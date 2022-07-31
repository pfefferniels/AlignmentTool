import { mean } from "../BasicCalculation"

class TempoTracker {
    refScoreTimes: number[]
    refTimes: number[]

    /**
     * Calculates averaged tempo data
     * 
     * @param observedScoreTimes 
     * @param observedTimes 
     */
    setData(observedScoreTimes: number[], observedTimes: []) {
        if (observedScoreTimes.length !== observedTimes.length) {
            throw new Error("observedScoreTimes and observedTimes must be of same length")
        }

        this.refScoreTimes = []
        this.refTimes = []

        let currentScoreTime = observedScoreTimes[0]
        let timesCache: number[] = []
        for (let i=0; i<observedScoreTimes.length; i++) {
            const scoreTime = observedScoreTimes[i]

            if (scoreTime !== currentScoreTime) {
                this.refScoreTimes.push(currentScoreTime)
                this.refTimes.push(mean(timesCache))
                currentScoreTime = scoreTime
                timesCache = []
            }
            timesCache.push(observedTimes[i])
        }
        this.refScoreTimes.push(currentScoreTime)
        this.refTimes.push(mean(timesCache))
    }

    getTime(scoreTime: number) {
        const pos = this.refScoreTimes.findIndex((value) => value > scoreTime)

        // pos not found -- the given scoreTime is above or equal to max
        if (pos < 0) {
            // last element
            if (scoreTime === this.refScoreTimes[this.refScoreTimes.length-1]) {
                return this.refTimes[this.refTimes.length-1]
            }

            const lastRefTime = this.refTimes[this.refScoreTimes.length-1]
            const lastScoreRefTime = this.refScoreTimes[this.refScoreTimes.length-1]

            return lastRefTime + (scoreTime - lastScoreRefTime) * (lastRefTime - this.refTimes[this.refScoreTimes.length-2])/(lastScoreRefTime-this.refScoreTimes[this.refScoreTimes.length-2]);
        }
        // scoreTime is below min
        else if (pos === 0) {
            const scoreTimeDiff = this.refScoreTimes[1] - this.refScoreTimes[0]
            const timeDiff = this.refTimes[1] - this.refTimes[0]

            return this.refTimes[0] + (scoreTime - this.refScoreTimes[0]) * timeDiff/scoreTimeDiff
        }
        else {
            if (scoreTime === this.refScoreTimes[pos-1]) {
                return this.refTimes[pos-1]
            }

            return this.refTimes[pos-1]+(scoreTime-this.refScoreTimes[pos-1]) * (this.refTimes[pos]-this.refTimes[pos-1])/(this.refScoreTimes[pos]-this.refScoreTimes[pos-1]);
        }
    }
}
