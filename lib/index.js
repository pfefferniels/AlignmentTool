import Module from './Matcher.js';

const align = async (
    midiNotes,
    scoreNotes,
    secondsPerQuarterNote,
    ticksPerQuarterNote) => {
    const Matcher = await Module();

    if (!Array.isArray(midiNotes) || !Array.isArray(scoreNotes)) {
        throw new Error('MIDI notes and score notes must be arrays')
    }

    // turn MIDI notes into a vector
    const midiNotesVector = new Matcher.MidiNoteVector();
    for (const note of midiNotes) {
        midiNotesVector.push_back(note);
    }

    // turn score notes into a vector
    const scoreNotesVector = new Matcher.NoteEventVector();
    for (const note of scoreNotes) {
        const newSitches = new Matcher.StringVector();
        const newNotetypes = new Matcher.StringVector();
        const newIds = new Matcher.StringVector();

        for (const sitch of note.sitches) {
            newSitches.push_back(sitch);
        }
        for (const notetype of note.notetypes) {
            newNotetypes.push_back(notetype);
        }
        for (const id of note.ids) {
            newIds.push_back(id);
        }

        note.sitches = newSitches;
        note.notetypes = newNotetypes;
        note.ids = newIds;

        scoreNotesVector.push_back(note);
    }

    const result = Matcher.align(
        midiNotesVector,
        scoreNotesVector,
        secondsPerQuarterNote,
        ticksPerQuarterNote
    );

    return result.matches;
}

export { align };
