#ifndef BasicCalculation_HPP
#define BasicCalculation_HPP

#include <vector>
#include <cmath>
#include <cassert>
#include <random>
#include <climits>
#include <numeric>

inline double LogAdd(double d1, double d2)
{
	if (d1 > d2) return d1 + log(1 + exp(d2 - d1));

	return d2 + log(1 + exp(d1 - d2));
}

inline void Norm(std::vector<double> &vd)
{
	double sum = 0;
	for (int i = 0; i < vd.size(); i += 1)
	{
		sum += vd[i];
	}
	for (int i = 0; i < vd.size(); i += 1)
	{
		vd[i] /= sum;
	}
}

inline void Lognorm(std::vector<double> &vd)
{
	double tmpd = vd[0];
	for (int i = 0; i < vd.size(); i += 1)
	{
		if (vd[i] > tmpd)
		{
			tmpd = vd[i];
		}
	}
	
	for (int i = 0; i < vd.size(); i += 1)
	{
		vd[i] -= tmpd;
	}
	tmpd = 0;
	for (int i = 0; i < vd.size(); i += 1)
	{
		tmpd += exp(vd[i]);
	}
	tmpd = log(tmpd);
	for (int i = 0; i < vd.size(); i += 1)
	{
		vd[i] -= tmpd;
		if (vd[i] < -200)
		{
			vd[i] = -200;
		}
	}
}

inline double Average(const std::vector<double> &vec)
{
	return std::accumulate(vec.begin(), vec.end(), 0.0) / vec.size();
}

#endif // BasicCalculation_HPP
