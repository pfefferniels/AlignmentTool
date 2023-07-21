import { logAdd, logNorm } from "../BasicCalculation";

export class SwitchingKalmanFilter {
	/**
	 * noise sources due to motor controls and erroneous timing (e_t)
	 * represented as standard deviation (sigma_t)
	 */
	sigma_t: number = Math.pow(0.014, 2);
	sigma_v: number;
	m: number;

	/**
	 * relative weights
	 */
	lpLambda: [number, number] = [Math.log(0.95), Math.log(0.05)];
	lpSwitch: number[] = [Math.log(0.95), Math.log(0.05)];
	swSecPerTick: [number, number];
	swM: [number, number];
	swSigma_t: [number, number];

	constructor(ticksPerSecond: number, ppq: number) {
		this.m = Math.pow(0.2 / ticksPerSecond, 2);

		// cf. Nakamura et al. 2015 p. 22
		this.sigma_v = Math.pow(0.03 / (ticksPerSecond * ppq), 2);
		this.swSigma_t = [this.sigma_t, Math.pow(0.16, 2)];
		this.swSecPerTick = [1 / ticksPerSecond, 1 / ticksPerSecond];
		this.swM = [this.m, this.m];
	}

	updateTicksPerSecond(nu: number, ioi: number) {
		const swk: [[number, number], [number, number]] = [[0, 0], [0, 0]];
		const swTmpPredSecPerTick: [[number, number], [number, number]] = [[0, 0], [0, 0]];
		const swDelta: [[number, number], [number, number]] = [[0, 0], [0, 0]];
		const tmpLPSwitch: number[] = new Array<number>(4); //2*s_{m-1}+s_m=2*r+s

		for (let r = 0; r < 2; r++) {
			for (let s = 0; s < 2; s++) {
				const tmp = nu ** 2 * this.swM[r] + this.swSigma_t[s];
				const tmp2 = ioi - nu * this.swSecPerTick[r];

				swk[r][s] = nu * this.swM[r] / tmp;
				swTmpPredSecPerTick[r][s] = this.swSecPerTick[r] + swk[r][s] * tmp2;
				swDelta[r][s] = (1 - swk[r][s] * nu) * this.swM[r];
				tmpLPSwitch[2 * r + s] = this.lpLambda[s] + this.lpSwitch[r] - 0.5 * Math.log(2 * Math.PI * tmp) - 0.5 * Math.pow(tmp2, 2) / tmp;
			}
		}
		logNorm(tmpLPSwitch);

		for (let s = 0; s < 2; s++) {
			this.swSecPerTick[s] = (Math.exp(tmpLPSwitch[s]) * swTmpPredSecPerTick[0][s] + Math.exp(tmpLPSwitch[2 + s]) * swTmpPredSecPerTick[1][s]) / (Math.exp(tmpLPSwitch[s]) + Math.exp(tmpLPSwitch[2 + s]));
			this.swM[s] = (Math.exp(tmpLPSwitch[s]) * (swDelta[0][s] + Math.pow(this.swSecPerTick[s] - swTmpPredSecPerTick[0][s], 2))
				+ Math.exp(tmpLPSwitch[2 + s]) * (swDelta[1][s] + Math.pow(this.swSecPerTick[s] - swTmpPredSecPerTick[1][s], 2)))
				/ (Math.exp(tmpLPSwitch[s]) + Math.exp(tmpLPSwitch[2 + s]));
			this.swM[s] += nu ** 2 * this.sigma_v;
			this.lpSwitch[s] = logAdd(tmpLPSwitch[s], tmpLPSwitch[2 + s]);
		}
		logNorm(this.lpSwitch);
		return 1 / (this.swSecPerTick[0] * Math.exp(this.lpSwitch[0]) + this.swSecPerTick[1] * Math.exp(this.lpSwitch[1]));
	}
}
