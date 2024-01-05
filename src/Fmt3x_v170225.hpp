/*
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
#include <stdio.h>
#include <stdlib.h>
#include <cmath>
#include <cassert>
#include <algorithm>
#include "BasicPitchCalculation_v170101.hpp"
#include "PianoRoll.hpp"

struct Fmt3xEvt
{
	int stime;
	int staff;
	int voice; // Note: different from xml-voice.
	int subOrder;
	std::string eventtype;
	int dur;
	int numNotes;			  //=sitches.size()
	std::vector<std::string> sitches;	// sitch content
	std::vector<std::string> notetypes;	// N or Tr etc.
	std::vector<std::string> fmt1IDs;	// id in fmt1
};

struct LessFmt3xEvt
{
	bool operator()(const Fmt3xEvt &a, const Fmt3xEvt &b)
	{
		if (a.stime < b.stime) return true;
		if (a.stime == b.stime) return a.voice < b.voice;
		return false;
	}
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
	std::vector<std::string> comments;
	std::vector<Fmt3xEvt> evts;
	std::vector<DuplicateOnsetEvtInFmt3x> duplicateOnsets;
	int TPQN;

	void Clear()
	{
		comments.clear();
		evts.clear();
		duplicateOnsets.clear();
	}

	std::vector<std::string> Split(const std::string &str, char delim)
	{
		std::istringstream iss(str);
		std::string tmp;
		std::vector<std::string> res;
		while (std::getline(iss, tmp, delim))
			res.push_back(tmp);
		return res;
	}
	
	std::vector<int> FindFmt3xScorePos(std::string Id_fmt1, int startPos = 0)
	{
		std::vector<int> out(3); // Found in evts[i].fmt1IDs[j] -> out[0]=i, out[1]=j, out[2,...]=corresponding pitches
		out[0] = -1;
		out[1] = -1;
		out[2] = -1;
		for (int i = startPos; i < evts.size(); i += 1)
		{
			for (int j = 0; j < evts[i].fmt1IDs.size(); j += 1)
			{
				if (evts[i].fmt1IDs[j].find(",") == std::string::npos)
				{
					if (Id_fmt1 == evts[i].fmt1IDs[j])
					{
						out[0] = i;
						out[1] = j;
						break;
					}
				}
				else
				{
					std::vector<std::string> tmp = Split(evts[i].fmt1IDs[j], ',');
					for (int k = 0; k < tmp.size(); k += 1)
					{
						if (Id_fmt1 == tmp[k])
						{
							out[0] = i;
							out[1] = j;
							break;
						} // endif
					}	  // endfor k
				}		  // endif
			}			  // endfor j
			if (out[0] >= 0)
			{
				break;
			}
		} // endfor i
		if (out[0] >= 0)
		{
			std::vector<std::string> tmp = Split(evts[out[0]].sitches[out[1]], ',');
			for (int k = 0; k < tmp.size(); k += 1)
			{
				out.push_back(SitchToPitch(tmp[k]));
			} // endfor k
		}	  // endif
		return out;
	} // end FindFmt3xScorePos

	/**
	 * Converts a piano roll into a score object (for MIDI-to-MIDI alignment).
	 * 
	 * @param threshold Threshold for chord clustering in s. 35 ms by default (0.035)
	 */
	void ConvertFromPianoRoll(PianoRoll pr, double threshold = 0.035)
	{
		std::stringstream ss;
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
				} // endif
				vi.push_back(n);
			} // endfor n
			clusters.push_back(vi);
		} //

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
				} // endfor j
				clusterOntime /= double(clusters[i].size());
				evt.stime = int(1000 * clusterOntime);

				evt.sitches.clear();
				evt.notetypes.clear();
				evt.fmt1IDs.clear();
				for (int j = 0; j < clusters[i].size(); j += 1)
				{
					evt.sitches.push_back(pr.evts[clusters[i][j]].sitch);
					evt.notetypes.push_back("N..");
					ss.str("");
					ss << "P1-1-" << clusters[i][j];
					evt.fmt1IDs.push_back(ss.str());
					fmt1IDsPerPitch[SitchToPitch(pr.evts[clusters[i][j]].sitch)].push_back(ss.str());
				} // endfor j
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
					} // endif
				}	  // endfor k

			} // endfor i

			/// Set dur
			for (int i = 1; i < evts.size(); i += 1)
			{
				evts[i - 1].dur = evts[i].stime - evts[i - 1].stime;
			} // endfor i
			evts[evts.size() - 1].dur = TPQN;
		}
	}
};

#endif // FMT3X_HPP
