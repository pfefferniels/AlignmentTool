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
#include "PianoRoll_v170503.hpp"

using namespace std;

struct Fmt3xEvt
{
	int stime;
	string barnum;
	int staff;
	int voice; // Note: different from xml-voice.
	int subvoice;
	int subOrder;
	string eventtype;
	int dur;
	int numNotes;			  //=sitches.size()
	vector<string> sitches;	  // sitch content
	vector<string> notetypes; // N or Tr etc.
	vector<string> fmt1IDs;	  // id in fmt1
	vector<string> AFInfo;	  // information on arpeggio and fermata. Used only internally (not written in fmt3x files).
};

struct LessFmt3xEvt
{
	bool operator()(const Fmt3xEvt &a, const Fmt3xEvt &b)
	{
		if (a.stime < b.stime)
		{
			return true;
		}
		else if (a.stime == b.stime)
		{
			if (a.voice < b.voice)
			{
				return true;
			}
			else if (a.voice > b.voice)
			{
				return false;
			}
			else if (a.subvoice < b.subvoice)
			{
				return true;
			}
			else
			{
				return false;
			} // endif
		}
		else
		{
			return false;
		}
	}
};

struct DuplicateOnsetEvtInFmt3x
{
	int stime;
	string sitch;
	int numOnsets;
	vector<string> fmt1IDs;
};

struct VoiceInfo
{ // Voice 0(voiceID) 1(part) 1(xml-voice)" etc. Note: Voice can cross staffs in musicXML
	int ID;
	int part;
	int voice_xml;
};

struct SubVoice
{
	vector<int> status;				   //-1: nothing, 0: onset, 1: tied from previous
	vector<vector<vector<int>>> poses; // posses[][][0,1]=i,j <-> fmt1x.evts[i].sitches[j]
};

class SubVoiceStructure
{
public:
	vector<SubVoice> subVoices;
	vector<int> durations;

	void Update(int pos1, int pos2, vector<int> noteStatus)
	{
		int accommodatingVoice = -1;
		if (subVoices.size() == 0)
		{
		}
		else
		{
			assert(subVoices[0].status.size() == noteStatus.size());
			for (int vv = 0; vv < subVoices.size(); vv += 1)
			{
				bool accommodatesAllFree = true;
				bool accommodatesAllMatch = true;
				for (int i = 0; i < noteStatus.size(); i += 1)
				{
					if (noteStatus[i] == -1)
					{
						continue;
					}
					if (subVoices[vv].status[i] != -1)
					{
						accommodatesAllFree = false;
					} // endif
					if (subVoices[vv].status[i] != noteStatus[i])
					{
						accommodatesAllMatch = false;
					} // endif
					if (i < noteStatus.size() - 1)
					{
						if (noteStatus[i + 1] == -1 && subVoices[vv].status[i + 1] == 1)
						{
							accommodatesAllMatch = false;
							break;
						} // endif
					}	  // endif
				}		  // endfor i
				if (accommodatesAllFree || accommodatesAllMatch)
				{
					accommodatingVoice = vv;
					break;
				} // endif
			}	  // endfor vv
		}		  // endif

		if (accommodatingVoice < 0)
		{
			SubVoice subVoice;
			subVoice.status.assign(noteStatus.size(), -1);
			subVoice.poses.resize(noteStatus.size());
			subVoices.push_back(subVoice);
			accommodatingVoice = subVoices.size() - 1;
		} // endif
		vector<int> pos(2);
		for (int i = 0; i < noteStatus.size(); i += 1)
		{
			if (noteStatus[i] == -1)
			{
				continue;
			}
			pos[0] = pos1;
			pos[1] = pos2;
			subVoices[accommodatingVoice].status[i] = noteStatus[i];
			subVoices[accommodatingVoice].poses[i].push_back(pos);
		} // endfor i

	} // end Update

	void Print()
	{
		cout << "subVoices.size() : " << subVoices.size() << endl;
		for (int i = 0; i < subVoices.size(); i += 1)
		{
			cout << "Subvoice " << i << endl;
			for (int j = 0; j < durations.size(); j += 1)
			{
				cout << j << "\t" << subVoices[i].status[j] << "\t";
				for (int k = 0; k < subVoices[i].poses[j].size(); k += 1)
				{
					cout << subVoices[i].poses[j][k][0] << "," << subVoices[i].poses[j][k][1] << " ";
				} // endfor k
				cout << endl;
			} // endfor j
		}	  // endfor i
	}		  // end Print

}; // endclass SubVoiceStructure

class Fmt3x
{
public:
	vector<string> comments;
	vector<Fmt3xEvt> evts;
	vector<VoiceInfo> voiceinfos; // "//Voice 0(voiceID) 1(part) 1(xml-voice)" etc.
	vector<DuplicateOnsetEvtInFmt3x> duplicateOnsets;
	int TPQN;

	void Clear()
	{
		comments.clear();
		evts.clear();
		voiceinfos.clear();
		duplicateOnsets.clear();
	}

	vector<string> Split(const string &str, char delim)
	{
		istringstream iss(str);
		string tmp;
		vector<string> res;
		while (getline(iss, tmp, delim))
			res.push_back(tmp);
		return res;
	} // end Split

	vector<int> FindFmt3xScorePos(string Id_fmt1, int startPos = 0)
	{
		vector<int> out(3); // Found in evts[i].fmt1IDs[j] -> out[0]=i, out[1]=j, out[2,...]=corresponding pitches
		out[0] = -1;
		out[1] = -1;
		out[2] = -1;
		for (int i = startPos; i < evts.size(); i += 1)
		{
			for (int j = 0; j < evts[i].fmt1IDs.size(); j += 1)
			{
				if (evts[i].fmt1IDs[j].find(",") == string::npos)
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
					vector<string> tmp = Split(evts[i].fmt1IDs[j], ',');
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
			vector<string> tmp = Split(evts[out[0]].sitches[out[1]], ',');
			for (int k = 0; k < tmp.size(); k += 1)
			{
				out.push_back(SitchToPitch(tmp[k]));
			} // endfor k
		}	  // endif
		return out;
	} // end FindFmt3xScorePos

	bool IsPitchError(string fmt1ID_, int performedPitch_)
	{
		vector<int> scorePos = FindFmt3xScorePos(fmt1ID_);
		bool isPitchError = true;
		for (int i = 2; i < scorePos.size(); i += 1)
		{
			if (performedPitch_ == scorePos[i])
			{
				isPitchError = false;
			}
		} // endfor i
		return isPitchError;
	} // end FindFmt3xScorePos

	Fmt3x SubScore(int minStime, int maxStime)
	{
		Fmt3x subScore;
		subScore.Clear();
		subScore.TPQN = TPQN;
		for (int n = 0; n < evts.size(); n += 1)
		{
			if (evts[n].stime < minStime || evts[n].stime > maxStime)
			{
				continue;
			}
			subScore.evts.push_back(evts[n]);
		} // endfor n
		return subScore;
	} // end SubScore

	void ConvertFromPianoRoll(PianoRoll pr)
	{

		stringstream ss;
		vector<vector<int>> clusters;
		double thres = 0.035; // 35 ms for chord clustering

		{
			vector<int> vi;
			vi.push_back(0);
			for (int n = 1; n < pr.evts.size(); n += 1)
			{
				if (pr.evts[n].ontime - pr.evts[n - 1].ontime > thres)
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
			evt.barnum = "1";
			evt.staff = 0;
			evt.voice = 0;
			evt.subvoice = 0;
			evt.subOrder = 0;
			evt.eventtype = "chord";
			vector<string> vs;
			vector<vector<string>> fmt1IDsPerPitch;

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

		} //

	} // end ConvertFromPianoRoll

}; // endclass Fmt3x

#endif // FMT3X_HPP
