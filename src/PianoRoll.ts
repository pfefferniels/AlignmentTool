

/**
 * @todo: write function to transfer MIDI event into the following structure:
 */

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
    label: string, 
    ext1: number, 
    extVal1: number, 
    extVal2: number 
}

export class PianoRoll {
    events: PianoRollEvent[]
}
