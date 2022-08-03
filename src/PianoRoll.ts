

type PianoRollEvent = {
    id: string, 
    ontime: number, 
    offtime: number, 
    pitch: number, 
    sitch: string,
    onvel: number, 
    offvel: number, 
    channel: number,
    endtime?: number, // Including pedalling. TODO: Is this used anywhere?
    label?: string // TODO: Is this used anywhere?
}

export class PianoRoll {
    events: PianoRollEvent[] = []

    /**
     * @todo: transfer MIDI into a `PianoRollEvent` array
     */
    fromMIDI(midi: string) {

    }
}
