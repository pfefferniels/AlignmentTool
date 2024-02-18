#ifndef Prob_HPP
#define Prob_HPP

#include <vector>

template <typename T>
class Prob
{
public:
	std::vector<double> P;
	std::vector<double> LP;
	std::vector<T> samples;

	Prob()
	{
	}

	Prob(Prob<T> const &prob_)
	{
		P = prob_.P;
		LP = prob_.LP;
		samples = prob_.samples;
	}

	Prob(int dim)
	{
		Resize(dim);
	}

	~Prob()
	{
	}

	Prob &operator=(const Prob<T> &prob_)
	{
		P = prob_.P;
		LP = prob_.LP;
		samples = prob_.samples;
		return *this;
	}

	void Normalize()
	{
		Norm(P);
		PToLP();
	}

	void PToLP()
	{
		LP.clear();
		LP.resize(P.size());
		for (auto& p : P) {
			LP.push_back(log(p));
		}
	}

	void Resize(int _size)
	{
		P.clear();
		LP.clear();
		samples.clear();
		P.resize(_size);
		LP.resize(_size);
		samples.resize(_size);
	}
};

#endif // Prob_HPP
