#ifndef SWITCHINGKALMANFILTER_HPP
#define SWITCHINGKALMANFILTER_HPP

#include <cmath>
#include <vector>
#include "gcem.hpp"
#include "BasicCalculation.hpp"

class SwitchingKalmanFilter
{
private:
	double Sig_v;
    static constexpr double Sig_t = gcem::pow(0.014, 2.);
	static constexpr std::array<double, 2> LPLambda_ = { gcem::log(0.95), gcem::log(0.95) };
	std::array<double, 2> LPSwitch_;
	std::array<double, 2> SwSecPerTick_;
	std::array<double, 2> SwM_;
	static constexpr std::array<double, 2> SwSig_t = { Sig_t,  gcem::pow(0.16, 2.) };

public:
    SwitchingKalmanFilter(double tickPerSec_, int TPQN_) {
        Sig_v = gcem::pow(0.03 / (tickPerSec_ * TPQN_), 2.);
		LPSwitch_[0] = gcem::log(0.95);
		LPSwitch_[1] = gcem::log(0.05);
		SwSecPerTick_[0] = 1. / tickPerSec_;
		SwSecPerTick_[1] = 1. / tickPerSec_;
        const int M_ = pow(0.2 / tickPerSec_, 2.);
		SwM_[0] = M_;
		SwM_[1] = M_;
    }

    double updateTicksPerSecond(double nu, double ioi)
    {
        double SwK[2][2];
        double SwTmpPredSecPerTick[2][2];
        double SwDelta[2][2];
        std::vector<double> tmpLPSwitch(4); // 2*s_{m-1}+s_m=2*r+s
        for (int r = 0; r < 2; r++)
        {
            for (int s = 0; s < 2; s++)
            {
                SwK[r][s] = nu * SwM_[r] / (nu * nu * SwM_[r] + SwSig_t[s]);
                SwTmpPredSecPerTick[r][s] = SwSecPerTick_[r] + SwK[r][s] * (ioi - nu * SwSecPerTick_[r]);
                SwDelta[r][s] = (1 - SwK[r][s] * nu) * SwM_[r];
                tmpLPSwitch[2 * r + s] = LPLambda_[s] + LPSwitch_[r] - 0.5 * log(2 * M_PI * (nu * nu * SwM_[r] + SwSig_t[s])) - 0.5 * pow(ioi - nu * SwSecPerTick_[r], 2.) / (nu * nu * SwM_[r] + SwSig_t[s]);
            }
        }
        Lognorm(tmpLPSwitch);

        for (int s = 0; s < 2; s++)
        {
            SwSecPerTick_[s] = (exp(tmpLPSwitch[s]) * SwTmpPredSecPerTick[0][s] + exp(tmpLPSwitch[2 + s]) * SwTmpPredSecPerTick[1][s]) / (exp(tmpLPSwitch[s]) + exp(tmpLPSwitch[2 + s]));
            SwM_[s] = (exp(tmpLPSwitch[s]) * (SwDelta[0][s] + pow(SwSecPerTick_[s] - SwTmpPredSecPerTick[0][s], 2.)) + exp(tmpLPSwitch[2 + s]) * (SwDelta[1][s] + pow(SwSecPerTick_[s] - SwTmpPredSecPerTick[1][s], 2.))) / (exp(tmpLPSwitch[s]) + exp(tmpLPSwitch[2 + s]));
            SwM_[s] += nu * nu * Sig_v;
            LPSwitch_[s] = LogAdd(tmpLPSwitch[s], tmpLPSwitch[2 + s]);
        }
        Lognorm(LPSwitch_);

        return 1. / (SwSecPerTick_[0] * exp(LPSwitch_[0]) + SwSecPerTick_[1] * exp(LPSwitch_[1]));
    }
};

#endif