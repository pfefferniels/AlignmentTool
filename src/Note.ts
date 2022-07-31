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
	noteID: string,
    noteStatus: ScoreNoteStatus,
    hmm1Id: number,
    hmm2Id: number,
    hmm3Id: number
}

/**
 * used for sorting
 * @param a 
 * @param b 
 * @returns 
 */
export function lessScoreNote(a: ScoreNote, b: ScoreNote) {
    return a.pitch - b.pitch
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
    noteId: number 
    noteStatus: PerformedNoteStatus 
    scoreNoteRef: number
}

/**
 * used for sorting `PerformedNote`s
 * @param a 
 * @param b 
 * @returns 
 */
export function lessPerfNote(a: PerformedNote, b: PerformedNote) {
    return a.pitch - b.pitch
}
