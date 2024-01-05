#ifndef BasicCalculation_HPP
#define BasicCalculation_HPP

#include <iostream>
#include <iomanip>
#include <fstream>
#include <string>
#include <sstream>
#include <vector>
#include <stdio.h>
#include <stdlib.h>
#include <cmath>
#include <cassert>
#include <algorithm>
#include <random>
#include <climits>
using namespace std;

mt19937_64 mt_(0);
uniform_real_distribution<> rand1_(0, 1);
uniform_int_distribution<> rand1int_(0, INT_MAX);

inline double RandDouble()
{ // between 0 and 1
	return rand1_(mt_);
	//	return (1.0*rand())/(1.0*RAND_MAX);
} // end

inline int RandInt()
{ // between 0 and int-max
	return rand1int_(mt_);
	//	return mt_();
} // end

inline void SetSeedRand(int seed)
{
	mt_ = mt19937_64(seed);
} // end

inline void SetSeed(int seed)
{
	mt_ = mt19937_64(seed);
} // end

inline int gcd(int m, int n)
{
	if (0 == m || 0 == n)
	{
		return 0;
	}
	while (m != n)
	{
		if (m > n)
		{
			m = m - n;
		}
		else
		{
			n = n - m;
		}
	} // endwhile
	return m;
}
inline int lcm(int m, int n)
{
	if (0 == m || 0 == n)
	{
		return 0;
	}
	return ((m / gcd(m, n)) * n); // lcm=m*n/gcd(m,n)
} // end lcm

inline double LogAdd(double d1, double d2)
{
	// log(exp(d1)+exp(d2))=log(exp(d1)(1+exp(d2-d1)))
	if (d1 > d2)
	{
		//		if(d1-d2>20){return d1;}
		return d1 + log(1 + exp(d2 - d1));
	}
	else
	{
		//		if(d2-d1>20){return d2;}
		return d2 + log(1 + exp(d1 - d2));
	} // endif
} // end LogAdd

inline double Sum(vector<double> &vd)
{
	double sum = 0;
	for (int i = 0; i < vd.size(); i++)
	{
		sum += vd[i];
	}
	return sum;
} // end Sum
inline int Sum(vector<int> &vi)
{
	int sum = 0;
	for (int i = 0; i < vi.size(); i++)
	{
		sum += vi[i];
	}
	return sum;
} // end Sum

inline void Norm(vector<double> &vd)
{
	double sum = 0;
	for (int i = 0; i < vd.size(); i += 1)
	{
		sum += vd[i];
	} // endif
	for (int i = 0; i < vd.size(); i += 1)
	{
		vd[i] /= sum;
	}
} // end Norm
inline void Normalize(vector<double> &vd)
{
	Norm(vd);
} // end Normalize

inline void Lognorm(vector<double> &vd)
{
	double tmpd = vd[0];
	for (int i = 0; i < vd.size(); i += 1)
	{
		if (vd[i] > tmpd)
		{
			tmpd = vd[i];
		}
	} // endfor i
	for (int i = 0; i < vd.size(); i += 1)
	{
		vd[i] -= tmpd;
	} // endfor i
	tmpd = 0;
	for (int i = 0; i < vd.size(); i += 1)
	{
		tmpd += exp(vd[i]);
	} // endfor i
	tmpd = log(tmpd);
	for (int i = 0; i < vd.size(); i += 1)
	{
		vd[i] -= tmpd;
		if (vd[i] < -200)
		{
			vd[i] = -200;
		}
	} // endfor i
} // end Lognorm

inline double Mean(vector<double> &vd)
{
	assert(vd.size() > 0);
	double sum = 0;
	for (int i = 0; i < vd.size(); i += 1)
	{
		sum += vd[i];
	} // endfor i
	return sum / double(vd.size());
} // end Mean

inline double Average(vector<double> &vd)
{
	assert(vd.size() > 0);
	double sum = 0;
	for (int i = 0; i < vd.size(); i += 1)
	{
		sum += vd[i];
	} // endfor i
	return sum / double(vd.size());
} // end Average

inline double StDev(vector<double> &vd)
{
	assert(vd.size() > 0);
	if (vd.size() == 1)
	{
		return 0;
	}
	double ave = Average(vd);
	double sum = 0;
	for (int i = 0; i < vd.size(); i += 1)
	{
		sum += pow(vd[i] - ave, 2.);
	} // endfor i
	return pow(sum / double(vd.size() - 1), 0.5);
} // end StDev

inline double Median(vector<double> vd)
{
	assert(vd.size() > 0);
	sort(vd.begin(), vd.end());
	if (vd.size() % 2 == 1)
	{
		return vd[vd.size() / 2];
	}
	else
	{
		return 0.5 * (vd[vd.size() / 2 - 1] + vd[vd.size() / 2]);
	} // endif
} // end Median

inline int SampleDistr(vector<double> &p)
{
	//	double val=(1.0*rand())/(1.0*RAND_MAX);
	double val = rand1_(mt_);
	for (int i = 0; i < p.size() - 1; i += 1)
	{
		if (val < p[i])
		{
			return i;
		}
		else
		{
			val -= p[i];
		} // endif
	}	  // endfor i
	return p.size() - 1;
}

class Pair
{
public:
	int ID;
	double value;

	Pair()
	{
	} // end Pair
	Pair(int ID_, double value_)
	{
		ID = ID_;
		value = value_;
	} // end Pair
	~Pair()
	{
	} // end ~Pair

}; // endclass Pair

class MorePair
{
public:
	bool operator()(const Pair &a, const Pair &b)
	{
		if (a.value > b.value)
		{
			return true;
		}
		else
		{ // if a.value <= b.value
			return false;
		} // endif
	}	  // end operator()
};


// From Prob_v160925.hpp
template <typename T>
class Prob
{
public:
	vector<double> P;
	vector<double> LP;
	vector<T> samples;

	Prob()
	{
	} // end Prob
	Prob(Prob<T> const &prob_)
	{
		P = prob_.P;
		LP = prob_.LP;
		samples = prob_.samples;
	} // end Prob
	Prob(int dim)
	{
		Resize(dim);
	} // end Prob

	~Prob()
	{
	} // end ~Prob

	Prob &operator=(const Prob<T> &prob_)
	{
		P = prob_.P;
		LP = prob_.LP;
		samples = prob_.samples;
		return *this;
	} // end =

	void Print()
	{
		for (int i = 0; i < P.size(); i += 1)
		{
			cout << i << "\t" << samples[i] << "\t" << P[i] << "\t" << LP[i] << endl;
		} // endfor i
	}	  // end Print

	void Normalize()
	{
		Norm(P);
		PToLP();
	} // end Normalize

	void LogNormalize()
	{
		Lognorm(LP);
		LPToP();
	} // end Normalize

	void PToLP()
	{
		LP.clear();
		LP.resize(P.size());
		for (int i = 0; i < P.size(); i += 1)
		{
			LP[i] = log(P[i]);
		} // endfor i
	}	  // end PToLP

	void LPToP()
	{
		P.clear();
		P.resize(LP.size());
		for (int i = 0; i < LP.size(); i += 1)
		{
			P[i] = exp(LP[i]);
		} // endfor i
	}	  // end LPToP

	T Sample()
	{
		return samples[SampleDistr(P)];
	} // end Sample

	void Clear()
	{
		P.clear();
		LP.clear();
		samples.clear();
	} // end Clear

	void Resize(int _size)
	{
		P.clear();
		LP.clear();
		samples.clear();
		P.resize(_size);
		LP.resize(_size);
		samples.resize(_size);
	} // end Resize

	void Assign(int _size, double value)
	{
		P.clear();
		LP.clear();
		samples.clear();
		P.assign(_size, value);
		LP.resize(_size);
		samples.resize(_size);
	} // end Assign

	double MaxP()
	{
		double max = P[0];
		for (int i = 1; i < P.size(); i += 1)
		{
			if (P[i] > max)
			{
				max = P[i];
			}
		} // endfor i
		return max;
	} // end MaxValue

	int ModeID()
	{
		double max = P[0];
		int modeID = 0;
		for (int i = 1; i < P.size(); i += 1)
		{
			if (P[i] > max)
			{
				modeID = i;
			}
		} // endfor i
		return modeID;
	} // end ModeID

	void Randomize()
	{
		for (int i = 0; i < P.size(); i += 1)
		{
			P[i] = RandDouble();
			//			P[i]=(1.0*rand())/(1.0*RAND_MAX);
		} // endfor i
		Normalize();
	} // end Randomize

	void ChangeTemperature(double beta)
	{
		for (int i = 0; i < P.size(); i += 1)
		{
			P[i] = pow(P[i], beta);
		} // endfor i
		Normalize();
	} // end ChangeTemperature

	void Sort()
	{
		vector<Pair> pairs;
		Pair pair;
		for (int i = 0; i < P.size(); i += 1)
		{
			pair.ID = i;
			pair.value = P[i];
			pairs.push_back(pair);
		} // endfor i
		stable_sort(pairs.begin(), pairs.end(), MorePair());

		Prob<T> tmpProb;
		tmpProb = *this;
		for (int i = 0; i < P.size(); i += 1)
		{
			P[i] = tmpProb.P[pairs[i].ID];
			samples[i] = tmpProb.samples[pairs[i].ID];
		} // endfor i
		PToLP();

	} // end Sort

	double Entropy()
	{
		double ent = 0;
		for (int i = 0; i < P.size(); i += 1)
		{
			if (P[i] < 1E-10)
			{
				continue;
			}
			ent += -P[i] * log(P[i]);
		} // endfor i
		return ent;
	} // end Entropy

	double SelfMatchProb()
	{
		double smp = 0;
		for (int i = 0; i < P.size(); i += 1)
		{
			smp += P[i] * P[i];
		} // endfor i
		return smp;
	} // end SelfMatchProb

}; // endclass Prob

#endif // BasicCalculation_HPP
