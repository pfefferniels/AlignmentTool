import { assignProbabilities, Prob } from "../BasicCalculation"

export enum StateType {
	Chord,

    /**
     * A short appoggiatura is a note with an
     * indeterminate short duration notated
     * with a grace note
     */
	ShortAppoggiatura,

    /**
     * an after note is a short appoggiatura
     * which is almost definitely played in
     * precedence to the associated metrical score time
     * 
     */
	AfterNote,

	Trill
}

export class HMMState {
    refTime: number
    pitches: number[]
    sitches: string[] // TODO: is this really necessary?
    scoreIDs: string[]
    scoreTimes: number[]
    outProb: Prob<number>
    matchedNotes: number[][]

    constructor() {
        this.refTime = 0
        this.pitches = []
        this.sitches = []
        this.scoreIDs = []
        this.scoreTimes = []
        this.outProb = new Prob<number>(128)
        this.matchedNotes = []
    }

    public clear() {
        this.pitches = []
        this.sitches = []
        this.scoreIDs = []
        this.scoreTimes = []
    }

    public setOutProb() {
        this.outProb.assign(128, 0.000001)
        for (let i=0; i<this.pitches.length; i++) {
            assignProbabilities(this.outProb.P, this.pitches[i])
        }
        this.outProb.normalize()
    }
}
