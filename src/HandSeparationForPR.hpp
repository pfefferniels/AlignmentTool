/*
Copyright 2019 Eita Nakamura

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
#ifndef HandSeparationForPR_HPP
#define HandSeparationForPR_HPP

#define printOn false

#include <fstream>
#include <iostream>
#include <cmath>
#include <string>
#include <sstream>
#include <vector>
#include <algorithm>
#include "stdio.h"
#include "stdlib.h"
#include "PianoRoll.hpp"
#include "HandSeparationData.hpp"

using namespace std;

class HandSeparationEngine
{
public:
	PianoRoll pr;

	std::array<std::array<double, 256>, 2> Lprob;
	std::array<std::array<double, 128>, 2> uniLprob;
	std::array<double, 2> LRLprob;
	int iniPitchLH, iniPitchRH;

	HandSeparationEngine()
	{
		Init();
	}
	
	~HandSeparationEngine()
	{
	}
	
	void Init()
	{
		Lprob = handSaparationLProb;
		uniLprob = handSeparationUniLProb;
		LRLprob = handSeparationLRLProb;
		iniPitchLH = 53;
		iniPitchRH = 71;
	}
	
	void SetInitialPitches(int pitchLH, int pitchRH)
	{
		iniPitchLH = pitchLH;
		iniPitchRH = pitchRH;
	}
	
	void SetPR(PianoRoll pr_)
	{
		pr = pr_;
	}

	/**
	 * Sets the `channel` property of each event in the 
	 * given PianoRoll to either 0 (right hand) or 1 (left hand).
	 */
	void SeparateHands()
	{
		int length = pr.evts.size();

		// Assume a tenth (15 semitones) to be the maximum hand stretch
		int maximumStretch = 15;
		int handPartPreference[length][2]; // HandPartPreference[m][0]=1 if m-th note is likely to be in the right-hand-part
		vector<int> pitches;
		for (int n = 0; n < length; n++)
		{
			PianoRollEvt evt = pr.evts[n];
			handPartPreference[n][0] = 0;
			handPartPreference[n][1] = 0;
			int p_cur = evt.pitch;
			int p_max = p_cur;
			int p_min = p_cur;
			pitches.push_back(p_cur);

			for (int m = 0; m < length; m++)
			{
				// find overlapping piano roll events
				if (pr.evts[m].offtime < evt.ontime) continue;
				else if (pr.evts[m].ontime > evt.offtime) break;

				int p = SitchToPitch(pr.evts[m].sitch);

				// define maximum stretch for the hand
				// in both directions
				if (p > p_max) p_max = p;
				else if (p < p_min) p_min = p;
			}
			
			// notes higher than a tenth from the lowest
			// of all simultaneously played notes are likely
			// played in the right hand.
			if (p_cur > p_min + maximumStretch) handPartPreference[n][0] = 1;

			// notes lower than a tenth from the highest
			// of all simulateously played notes are likely 
			// played in the left hand
			if (p_cur < p_max - maximumStretch) handPartPreference[n][1] = 1;
		}

		vector<int> v(10);
		int Nh = 50;
		vector<double> LP; // k=2*h+sig
		LP.assign(2 * Nh, -1000);
		vector<vector<int>> argmaxHist;
		LP[0] = Lprob[0][pitches[0] - iniPitchRH + 128];
		LP[1] = Lprob[1][pitches[0] - iniPitchLH + 128];
		for (int n = 1; n < length; n += 1)
		{
			double max, logP;
			vector<double> preLP(LP);
			vector<int> argmax(2 * Nh);
			for (int i = 0; i < 2 * Nh; i += 1)
			{ // j -> i
				max = preLP[i] - 10000;
				argmax[i] = i;
				for (int j = 0; j < 2 * Nh; j += 1)
				{
					if (j % 2 == i % 2 && j / 2 == i / 2 - 1)
					{
						logP = preLP[j] + LRLprob[i % 2] + Lprob[i % 2][pitches[n] - pitches[n - 1] + 128];
						if (logP > max)
						{
							max = logP;
							argmax[i] = j;
						}
					} // endif
					if (j % 2 != i % 2 && i / 2 == 0)
					{
						if (n - 2 - j / 2 >= 0)
						{
							logP = preLP[j] + LRLprob[i % 2] + Lprob[i % 2][pitches[n] - pitches[n - 2 - j / 2] + 128];
						}
						else
						{
							logP = preLP[j] + LRLprob[i % 2] + Lprob[i % 2][pitches[n] - ((i % 2 == 0) ? iniPitchRH : iniPitchLH) + 128];
						} // endif
						if (logP > max)
						{
							max = logP;
							argmax[i] = j;
						}
					} // endif
				}	  // endfor j
				if (i % 2 == 0)
				{
					v[1] = 53;
					if (n - 1 - i / 2 >= 0)
					{
						v[1] = pitches[n - 1 - i / 2];
					}
					LP[i] = max + ((v[1] < pitches[n]) ? 0 : -4.605) + ((handPartPreference[n][0] > 0) ? -0.0202027 : -0.693147) + ((handPartPreference[n][1] > 0) ? -3.912023 : -0.693147);
				}
				else
				{
					v[0] = 71;
					if (n - 1 - i / 2 >= 0)
					{
						v[0] = pitches[n - 1 - i / 2];
					}
					LP[i] = max + ((v[0] > pitches[n]) ? 0 : -4.605) + ((handPartPreference[n][0] > 0) ? -3.912023 : -0.693147) + ((handPartPreference[n][1] > 0) ? -0.0202027 : -0.693147);
				}
			}
			argmaxHist.push_back(argmax);
		}

		vector<int> estStates(length);
		double max = LP[0];
		int amax = 0;
		for (int i = 0; i < LP.size(); i += 1)
		{
			if (LP[i] > max)
			{
				max = LP[i];
				amax = i;
			}
		}
		estStates[length - 1] = amax;
		for (int n = 0; n < length - 1; n += 1)
		{
			amax = argmaxHist[length - 2 - n][amax];
			estStates[length - 2 - n] = amax;
		}

		for (int n = 0; n < length; n += 1)
		{
			pr.evts[n].channel = estStates[n] % 2;
		}
	}
};

#endif // HandSeparationForPR_HPP
