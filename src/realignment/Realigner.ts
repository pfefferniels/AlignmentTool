import { HMM } from "..";
import { ScorePerformanceMatch } from "../Match";
import { ErrorDetector, ErrorRegions } from "../error-detection/ErrorDetector";
import { MOHMM } from "./MOHMM";

export function realign(hmm: HMM, match: ScorePerformanceMatch, errorRegions: ErrorRegions) {
    const mohmm = new MOHMM()

    errorRegions.all.regions.forEach(region => {
        const includePitchErr = errorRegions.pitchErrors.isOverlapping(region)
        const includeExtraNote = errorRegions.extraNotes.isOverlapping(region)
        const includeMissNote = errorRegions.missingNotes.isOverlapping(region)
        const includeReorderedNote = errorRegions.reorderedNotes.isOverlapping(region)

        const affectedEvents = match.events.filter(e => region.contains(e.ontime))
        const affectedScoreTimes = affectedEvents.map(e => e.stime)
        
        const maxStime = Math.max(...affectedScoreTimes)
        const minStime = Math.min(...affectedScoreTimes)

        const maxTime = affectedEvents[affectedEvents.length - 1].ontime
        const minTime = Math.min(...affectedEvents.map(e => e.ontime)) || region.right

        if (!((includeExtraNote && includeMissNote) || (includeMissNote && includePitchErr) || (includeExtraNote && includePitchErr))) return
        if (minTime >= maxTime) return
        if (minStime >= maxStime) return

        mohmm.realign([minStime, maxStime], [minTime, maxTime]);
    })

    //match = mohmm.match;
    return mohmm.match
}
