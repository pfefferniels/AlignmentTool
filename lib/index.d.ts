import { MatchResult, MidiNote, NoteEvent } from "./Matcher"

declare async function align(
    midiNotes: MidiNote[],
    scoreNotes: NoteEvent[],
    secondsPerQuarterNote: number,
    ticksPerQuarterNote: number): MatchResult;

declare async function alignMidiToMidi(
    midiNotes1: MidiNote[],
    midiNotes2: MIDINote[],
    secondsPerQuarterNote: number): MatchResult;
