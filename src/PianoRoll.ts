

type PianoRollEvent = {
    id: string, 
    ontime: number, 
    offtime: number, 
    pitch: number, 
    sitch: string,
    onvel: number, 
    offvel: number, 
    channel: number, 
    endtime: number, //Including pedalling. Not written in spr/ipr files.
    label: string
}

export class PianoRoll {
    events: PianoRollEvent[] = []

    /**
     * @todo: transfer MIDI into a `PianoRollEvent` array
     */
    fromMIDI(midi: string) {

    }
}
