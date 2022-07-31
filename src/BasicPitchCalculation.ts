
/**
 * converts MIDI pitch into spelled pitch string
 * 
 * @param p pitch
 * @returns string
 */
export function pitchToSitch(p: number): string {
    let q = (p + 120) % 12
    const pitchNames = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']
    return pitchNames[q] + (p / 12 - 1).toString()
}

/**
 * converts spelled pitch into a MIDI pitch
 * 
 * @param sitch spelled pitch as string
 * @returns MIDI number
 */
export function sitchToPitch(sitch: string): number {
    const diatonic = new Map<string, number>([
        ['C', 60],
        ['D', 62],
        ['E', 64],
        ['F', 65],
        ['G', 67],
        ['A', 69],
        ['B', 71]
    ])[sitch[0]]

    const octave = +sitch[sitch.length-1]
    let p = diatonic + (octave - 4) * 12

    const acc = sitch.slice(1, -1)
    switch (acc) {
        case '+': case '#': p += 0; break;
        case '++': case '##': p += 1; break;
        case '-': case 'b': p -= 1; break;
        case '--': case 'bb': p -= 2; break;
    }

    return p
}

