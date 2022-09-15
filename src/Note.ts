export enum ScoreNoteStatus {
    NotYetFound = 0,
    Found = 1
}

/**
 * representing a score note
 */
export type ScoreNote = {
	pitch: number, 
	sitch: string,
	meiId: string,
    noteStatus: ScoreNoteStatus,
    hmm1Id: number
}

export enum PerformedNoteStatus {
    Correct = 0,
    Extra = 1,
    Substition = 2,
    Unknown = -1
}

/**
 * representing a performed note.
 */
export type PerformedNote = {
    pitch: number 
    matchIndex: number 
    noteStatus: PerformedNoteStatus 
    scoreNoteRef?: number
}

