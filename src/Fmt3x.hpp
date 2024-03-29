﻿/*
Copyright 2019 Eita Nakamura

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
#ifndef FMT3X_HPP
#define FMT3X_HPP

#include <iostream>
#include <fstream>
#include <string>
#include <sstream>
#include <vector>
#include <tuple>
#include <stdio.h>
#include <stdlib.h>
#include <cmath>
#include <cassert>
#include <algorithm>
#include "BasicPitchCalculation.hpp"
#include "PianoRoll.hpp"

std::vector<std::string> Split(const std::string &str, char delim)
{
	std::istringstream iss(str);
	std::string tmp;
	std::vector<std::string> res;
	while (std::getline(iss, tmp, delim))
		res.push_back(tmp);
	return res;
}

struct Fmt3xEvt
{
	int stime;
	int staff;
	int voice; // Note: different from xml-voice.
	int subOrder;
	std::string eventtype;
	int dur;
	int numNotes;						//=sitches.size()
	std::vector<std::string> sitches;	// sitch content
	std::vector<std::string> notetypes; // N or Tr etc.
	std::vector<std::string> fmt1IDs;	// id in fmt1
};

struct DuplicateOnsetEvtInFmt3x
{
	int stime;
	std::string sitch;
	int numOnsets;
	std::vector<std::string> fmt1IDs;
};

class Fmt3x
{
public:
	std::vector<Fmt3xEvt> evts;
	std::vector<DuplicateOnsetEvtInFmt3x> duplicateOnsets;
	int TPQN;

	void Clear()
	{
		evts.clear();
		duplicateOnsets.clear();
	}

	/**
	 * Finds the position of a given ID in the score as 
	 * a tuplet (i, j) meaning that the ID was found in
	 * evts[i].fmt1IDs[j].
	 */
	std::tuple<int, int> FindFmt3xScorePos(std::string searchedID, int startPos = 0)
	{
		for (int i = startPos; i < evts.size(); i++)
		{
			for (int j = 0; j < evts[i].fmt1IDs.size(); j++)
			{
				std::vector<std::string> tmp = Split(evts[i].fmt1IDs[j], ',');
				for (int k = 0; k < tmp.size(); k++)
				{
					if (searchedID == tmp[k])
						return std::make_tuple(i, j);
				}
			}
		}

		return std::make_tuple(-1, -1);
	}

	/**
	 * Converts a piano roll into a score object (for MIDI-to-MIDI alignment).
	 *
	 * @param threshold Threshold for chord clustering in s. 35 ms by default (0.035)
	 */
	void ConvertFromPianoRoll(PianoRoll pr, double threshold = 0.035)
	{
		// save the indices of the events building a cluster
		std::vector<std::vector<int>> clusters;
		{
			std::vector<int> vi;
			vi.push_back(0);
			for (int n = 1; n < pr.evts.size(); n += 1)
			{
				if (pr.evts[n].ontime - pr.evts[n - 1].ontime > threshold)
				{
					clusters.push_back(vi);
					vi.clear();
				}
				vi.push_back(n);
			}
			clusters.push_back(vi);
		}

		Clear();
		TPQN = 1000; // 1 tick <-> 1 ms

		{
			Fmt3xEvt evt;
			evt.staff = 0;
			evt.voice = 0;
			evt.subOrder = 0;
			evt.eventtype = "chord";
			std::vector<std::string> vs;
			std::vector<std::vector<std::string>> fmt1IDsPerPitch;

			for (int i = 0; i < clusters.size(); i += 1)
			{
				fmt1IDsPerPitch.assign(128, vs);

				double clusterOntime = 0;
				for (int j = 0; j < clusters[i].size(); j += 1)
				{
					clusterOntime += pr.evts[clusters[i][j]].ontime;
				}
				clusterOntime /= double(clusters[i].size());
				evt.stime = int(1000 * clusterOntime);

				evt.sitches.clear();
				evt.notetypes.clear();
				evt.fmt1IDs.clear();
				for (int j = 0; j < clusters[i].size(); j++)
				{
					PianoRollEvt correspEvent = pr.evts[clusters[i][j]];
					evt.sitches.push_back(correspEvent.sitch);
					evt.notetypes.push_back("N..");
					evt.fmt1IDs.push_back(correspEvent.ID);
					fmt1IDsPerPitch[SitchToPitch(correspEvent.sitch)].push_back(correspEvent.ID);
				}

				evt.numNotes = evt.sitches.size();

				evts.push_back(evt);

				for (int k = 0; k < 128; k += 1)
				{
					if (fmt1IDsPerPitch[k].size() > 1)
					{
						DuplicateOnsetEvtInFmt3x dup;
						dup.stime = evt.stime;
						dup.sitch = PitchToSitch(k);
						dup.numOnsets = fmt1IDsPerPitch[k].size();
						dup.fmt1IDs = fmt1IDsPerPitch[k];
					}
				}
			}

			// Set durations
			for (int i = 1; i < evts.size(); i += 1)
			{
				evts[i - 1].dur = evts[i].stime - evts[i - 1].stime;
			}
			evts[evts.size() - 1].dur = TPQN;
		}
	}
};

#endif // FMT3X_HPP
