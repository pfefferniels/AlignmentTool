export function logAdd(d1: number, d2: number): number {
    if (d1 > d2) {
        return d1 + Math.log(1 + Math.exp(d2 - d1));
    } else {
        return d2 + Math.log(1 + Math.exp(d1 - d2));
    }
}

export function normalize(vd: number[]) {
    let sum = vd.reduce((a,b) => a + b, 0)
    for (let i=0; i<vd.length; i++) {
        vd[i] /= sum
    }
}

/**
 * normalizes the values of a map
 * 
 * @param map 
 */
export function normalizeMap<K>(map: Map<K, number>) {
    let values = [...map.values()]
    normalize(values)
    let keys = [...map.keys()]
    for (let i=0; i<keys.length; i++) {
        map.set(keys[i], values[i])
    }
}

export function logNorm(vd: number[]) {
    let max = Math.max(...vd)
    for (let i=0; i<vd.length; i++) {
        vd[i] -= max
    }

    let tmp = Math.log(vd.reduce((a, b) => a + Math.exp(b), 0))
    for (let i=0; i<vd.length; i++) {
        vd[i] = tmp < -200 ? -200 : vd[i]-tmp
    }
}

export function mean(vd: number[]) {
    const sum = vd.reduce((a, b) => a+b, 0)
    return (sum / vd.length) || 0
}

export function sampleDistr(p: number[]) {
    let val = Math.random()
    for (let i=0; i<p.length-1; i++) {
        if (val < p[i]) return i 
        else val -= p[i]
    }
    return p.length - 1
}

type Pair = {
    id: number 
    value: number 
}

/**
 * comparison function used to sort pairs in descending order
 * @param a 
 * @param b 
 * @returns 
 */
export function morePair(a: Pair, b: Pair): number {
    return a.value + b.value
}

export class Prob<T> {
    /**
     * array of probabilities
     */
    P: number[]

    /**
     * array of logarithmic probability synced with `Prob.P`
     */
    LP: number[]


    samples: T[]

    constructor(resize: number | undefined = undefined) {
        this.P = []
        this.LP = []
        this.samples = []
        if (resize) {
            this.resize(resize)
        }
    }

    normalize() {
        normalize(this.P)
        this.PToLP()
    }

    logNormalize() {
        logNorm(this.LP)
        this.LPToP()
    }

    /**
     * creates a logarithmic version of P and saves it in LP
     */
    private PToLP() {
        this.LP = this.P.map(value => Math.log(value))
    }

    /**
     * creates a non-logarithmic version of LP and saves it in P
     */
    private LPToP() {
        this.P = this.LP.map(value => Math.exp(value))
    }

    /**
     * returns a sample at the position determined by sampleDistr()
     * @returns T
     */
    sample(): T {
        return this.samples[sampleDistr(this.P)]
    }

    /**
     * resets P, LP and samples
     */
    clear() {
        this.P = []
        this.LP = []
        this.samples = []
    }

    /**
     * clears P, LP and samples and creates new empty arrays 
     * in the length of size
     * 
     * @param size 
     */
    private resize(size: number) {
        this.P = new Array<number>(size)
        this.LP = new Array<number>(size)
        this.samples = new Array<T>(size)
    }

    /**
     * this function clears `P`, `LP` and `samples`, 
     * fills `P` with the value up to the specified size
     * and resizes `LP` and `samples` accordingly
     * 
     * @param size 
     * @param value 
     */
    assign (size: number, value: number) {
        this.clear()
        this.P.fill(value, 0, size)
        this.LP = new Array<number>(size)
        this.samples = new Array<T>(size)
    }
}

/**
 * Assigns the following standard probabilities to the `pitchProb` parameter:
 * tone itself: 95%
 * semitones around the tone: 0.75%
 * whole tones around the tone: 1.1%
 * octaves around the tone: 0,235%
 * all notes within an octave around the tone: 0,00461%
 * 
 * @requires pitchProb must be initialized already
 * 
 * @param pitchProb 
 * @param pitch 
 * @param divideByTwo 
 * @param factor 
 */
export function assignProbabilities(pitchProb: number[], pitch: number, divideByTwo: boolean = false, factor: number = 1) {
    // chordal
    let d = divideByTwo ? 0.475 : 0.95
    pitchProb[pitch] += d * factor

    // semi-tone
    d = divideByTwo ? 0.00375 : 0.0075
    pitchProb[pitch + 1] += d * factor
    pitchProb[pitch - 1] += d * factor

    // whole-tone
    d = divideByTwo ? 0.0055 : 0.011
    pitchProb[pitch + 2] += d * factor
    pitchProb[pitch - 2] += d * factor

    // octave
    d = divideByTwo ? 0.00175 : 0.00235
    pitchProb[pitch + 12] += d * factor
    pitchProb[pitch - 12] += d * factor

    // within one octave above and below the pitch
    d = divideByTwo ? 0.0002305 : 0.000461

    // 1 and 2 are covered by semitone and whole tone,
    // therefore starting with 3
    for (let p = 3; p < 12; p++) {
        pitchProb[pitch + p] += d * factor
        pitchProb[pitch - p] += d * factor
    }
}

