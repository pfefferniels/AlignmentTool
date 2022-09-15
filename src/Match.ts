
enum MatchStatus {
    WithErrorInd = -1, // note match if errorInd = 2, 3
    HasScoreTime = 0,
    AtemporalEvent = 1
}

export enum ErrorIndex {
    Correct = 0,
    PitchError = 1,
    NotewiseExtraNote = 2,
    ClusterwiseExtraNote = 3
}

export type ScorePerformanceMatchEvent = {
    id: string,
    ontime: number, 
    offtime: number,
    sitch: string,
    onvel: number, 
    offvel: number,
    channel: number, 
    matchStatus: MatchStatus, 
    stime?: number,
    meiId?: string, 
    errorIndex: ErrorIndex,
    skipIndex: string // todo: 0(beginning)/1(resumption point)/- or +(otherwise)
}

export type MissingNote = {
    stime: number, 
    meiId: string
}

export class ScorePerformanceMatch {
    comments: string[] = []
    events: ScorePerformanceMatchEvent[] = []
    missingNotes: MissingNote[] = []

    /**
     * @todo serialize `events` and `missingNotes` to whatever format
     * @returns 
     */
    serialize() {
        return ''
    }

    /**
     * read events from whatever format and write to `events` and `missingNotes`
     * @param s 
     */
    readFrom(s: string) {
    }
}
