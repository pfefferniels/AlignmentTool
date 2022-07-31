import { TransitionType } from "./TransitionType"

/**
 * generate IOI distribution function for chords, arpeggios, 
 * appoggiaturas and trills (cf. Nakamura et al. 2015, p. 20f.)
 * 
 * @param prob 
 * @param sig variance
 * @param mu expected value
 * @returns 
 */
const generateIoiDistributionFunction = (prob: number, sig: number, mu: number) => {
    return (ioi: number) => {
        return prob * (1 / sig) * Math.exp(-(ioi - mu) / sig) + 0.005 * ioiInsertionDistribution(ioi)
    }
}

export const ioiInsertionDistribution = (ioi: number) => {
    const sigma = 0.3333
    return sigma / Math.PI / (Math.pow(ioi - 0.5, 2) + Math.pow(sigma, 2))
}

export const logIoiSkipDistribution = (ioi: number) => {
    return Math.log(ioiInsertionDistribution(ioi))
}

export const logInsertionDistribution = (ioi: number) => {
    return Math.log(2 * ioiInsertionDistribution(ioi))
}

/**
 * returns probabilities for given IOIs.
 */
export const ioiDistributionFunctions = new Map<TransitionType, (ioi: number) => number>([
    // TODO: considering performance practise in early records, the sigma 
    // should be wider or at least be controllable as a parameter
    [TransitionType.Chord, generateIoiDistributionFunction(0.995, 0.01, 0)], 
    [TransitionType.Arpeggio, generateIoiDistributionFunction(0.95, 0.05, 0.05)],
    [TransitionType.ShortAppoggiatura, generateIoiDistributionFunction(0.95, 0.07, 0.13)],
    [TransitionType.Trill, generateIoiDistributionFunction(0.95, 0.015, 0.082)]
])
