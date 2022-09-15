import { HMM } from "..";
import { ScorePerformanceMatch } from "../Match";
import { ErrorDetector } from "../error-detection/ErrorDetector";

export function realign(hmm: HMM, match: ScorePerformanceMatch, widthSec = 0) {
    const errorDetector = new ErrorDetector(hmm, match)
    errorDetector.detectErrors()
    const errorRegions = errorDetector.getErrorRegions(widthSec)

    errorRegions.all.regions.forEach(region => {
        const includePitchErr = errorRegions.pitchErrors.isOverlapping(region)
        const includeExtraNote = errorRegions.extraNotes.isOverlapping(region)
        const includeMissNote = errorRegions.missingNotes.isOverlapping(region)
        const includeReorderedNote = errorRegions.reorderedNotes.isOverlapping(region)
        /*
            int maxStime = fmt3x.evts[0].stime;
            int minStime = fmt3x.evts[fmt3x.evts.size() - 1].stime;
            double maxTime;
            double minTime = errRegions.regions[i][1];
                for (int n = 0; n < match.evts.size(); n += 1){
                if (match.evts[n].ontime < errRegions.regions[i][0]) { continue; }
                if (match.evts[n].ontime >= errRegions.regions[i][1]) { break; }
                if (match.evts[n].errorInd < 2 && match.evts[n].stime > maxStime) { maxStime = match.evts[n].stime; }
                if (match.evts[n].errorInd < 2 && match.evts[n].stime < minStime) { minStime = match.evts[n].stime; }
                if (match.evts[n].ontime < minTime) { minTime = match.evts[n].ontime; }
                maxTime = match.evts[n].ontime;
            }//endfor n
        
            if (!((includeExtraNote && includeMissNote) || (includeMissNote && includePitchErr) || (includeExtraNote && includePitchErr))) { continue; }
        
            if (minTime >= maxTime) { continue; }
            if (minStime >= maxStime) { continue; }
            
            mohmm.Realign(minStime, maxStime, minTime, maxTime);
        */
    })

    //match = mohmm.match;
}
