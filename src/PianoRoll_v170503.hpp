#ifndef PIANOROLL_HPP
#define PIANOROLL_HPP

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
#include "BasicCalculation_v170122.hpp"
#include "BasicPitchCalculation_v170101.hpp"

using namespace std;

class PianoRollEvt
{
public:
	string ID;
	double ontime;
	double offtime;
	string sitch; // spelled pitch
	int pitch;	  // integral pitch
	int onvel;
	int offvel;
	int channel;
	double endtime; // Including pedalling. Not written in spr/ipr files.
	string label;

	int ext1; // extended variable 1
	double extVal1;
	double extVal2;

	PianoRollEvt()
	{
		ID = "0";
		endtime = 0;
		label = "-";
		ext1 = 0;
		extVal1 = 0;
		extVal2 = 0;
		channel = 0;
		onvel = 80;
		offvel = 80;
	}				   // end PianoRollEvt
	~PianoRollEvt() {} // end ~PianoRollEvt

	void Print()
	{
		cout << ID << "\t" << ontime << "\t" << offtime << "\t" << sitch << "\t" << pitch << "\t" << onvel << "\t" << offvel << "\t" << channel << "\t" << label << endl;
	} // end Print

}; // end class PianoRollEvt

class LessPianoRollEvt
{
public:
	bool operator()(const PianoRollEvt &a, const PianoRollEvt &b)
	{
		if (a.ontime < b.ontime)
		{
			return true;
		}
		else if (a.ontime == b.ontime)
		{
			if (a.pitch < b.pitch)
			{
				return true;
			}
			else
			{
				return false;
			} // endif
		}
		else
		{ // if a.ontime > b.ontime
			return false;
		} // endif
	}	  // end operator()

}; // end class LessPianoRollEvt
// stable_sort(PianoRollEvts.begin(), PianoRollEvts.end(), LessPianoRollEvt());

class LessPitchPianoRollEvt
{
public:
	bool operator()(const PianoRollEvt &a, const PianoRollEvt &b)
	{
		if (a.pitch < b.pitch)
		{
			return true;
		}
		else
		{ // if
			return false;
		} // endif
	}	  // end operator()
};		  // end class LessPitchPianoRollEvt
// stable_sort(PianoRollEvts.begin(), PianoRollEvts.end(), LessPitchPianoRollEvt());

class PedalEvt
{
public:
	string type; // SosPed, SusPed, SofPed
	double time;
	int value;
	int channel;

	PedalEvt() {}  // end PedalEvt
	~PedalEvt() {} // end ~PedalEvt
};				   // end class PedalEvt

class LessPedalEvt
{
public:
	bool operator()(const PedalEvt &a, const PedalEvt &b)
	{
		if (a.time < b.time)
		{
			return true;
		}
		else if (a.time == b.time)
		{
			if (a.value < b.value)
			{
				return true;
			}
			else
			{
				return false;
			} // endif
		}
		else
		{ // if a.time > b.time
			return false;
		} // endif
	}	  // end operator()
};		  // end class LessPedalEvt
// stable_sort(PedalEvts.begin(), PedalEvts.end(), LessPedalEvt());

class PedalInterval
{
public:
	string type; // SosPed, SusPed, SofPed
	double ontime;
	double offtime;
	int channel;

	PedalInterval() {}	// end PedalInterval
	~PedalInterval() {} // end ~PedalInterval
};						// end class PedalInterval

class ProgramChangeEvt
{
public:
	double time;
	int value;
	int channel;
}; // end class ProgramChangeEvt

class PianoRoll
{
public:
	vector<string> comments;
	vector<PianoRollEvt> evts;
	vector<PedalEvt> pedals;
	vector<PedalInterval> pedalIntervals; // Not written in files
	vector<ProgramChangeEvt> programChangeEvts;
	vector<int> programChangeData;

	PianoRoll()
	{
		programChangeData.assign(16, 0);
	}

	~PianoRoll() {}

	void Clear()
	{
		comments.clear();
		evts.clear();
		pedals.clear();
		pedalIntervals.clear();
		programChangeEvts.clear();
	} // end Clear

	void SetPedalIntervals()
	{
		pedalIntervals.clear();
		PedalInterval pedalInt; // type,ontime,offtime,channel
		vector<PedalInterval> pendingIntervals;
		int onoffthres = 63; // or 0??
		for (int i = 0; i < pedals.size(); i += 1)
		{
			if (pedals[i].value <= onoffthres)
			{
				int pendingPos = -1;
				for (int k = 0; k < pendingIntervals.size(); k += 1)
				{
					if (pendingIntervals[k].channel == pedals[i].channel && pendingIntervals[k].type == pedals[i].type)
					{
						pendingPos = k;
						break;
					} // endif
				}	  // endfor k
				if (pendingPos >= 0)
				{
					pendingIntervals[pendingPos].offtime = pedals[i].time;
					pedalIntervals.push_back(pendingIntervals[pendingPos]);
					pendingIntervals.erase(pendingIntervals.begin() + pendingPos);
				} // endif
			}
			else if (pedals[i].value > onoffthres)
			{
				int pendingPos = -1;
				for (int k = 0; k < pendingIntervals.size(); k += 1)
				{
					if (pendingIntervals[k].channel == pedals[i].channel && pendingIntervals[k].type == pedals[i].type)
					{
						pendingPos = k;
						break;
					} // endif
				}	  // endfor k
				if (pendingPos < 0)
				{
					pedalInt.type = pedals[i].type;
					pedalInt.ontime = pedals[i].time;
					pedalInt.offtime = pedalInt.ontime + 10; // Cutoff = 10 sec
					pedalInt.channel = pedals[i].channel;
					pendingIntervals.push_back(pedalInt);
				}
				else
				{ // pendingPos>=0
				  // Do nothing
				} // endif
			}	  // endif
		}		  // endfor i
		for (int k = 0; k < pendingIntervals.size(); k += 1)
		{
			pedalIntervals.push_back(pendingIntervals[k]);
		} // endfor k
	}	  // end SetPedalIntervals

	void SetEndtimes()
	{ // Currently use only sustain pedals
		for (int n = 0; n < evts.size(); n += 1)
		{
			evts[n].endtime = evts[n].offtime;
			// pedalInterval s.t. pedal.ontime <= note.offtime < pedal.offtime
			// If sostenuto pedal, further require pedal.ontime >= note.ontime
			//  -> Set endtime = pedal.offtime
			//  If found next onset with next.ontime < pedal.offtime
			//  -> Set endtime = next.ontime
			for (int k = 0; k < pedalIntervals.size(); k += 1)
			{
				if (pedalIntervals[k].type != "SusPed" && pedalIntervals[k].type != "SosPed")
				{
					continue;
				}
				if (pedalIntervals[k].channel != evts[n].channel)
				{
					continue;
				}
				if (pedalIntervals[k].ontime <= evts[n].offtime && pedalIntervals[k].offtime > evts[n].offtime)
				{
					if (pedalIntervals[k].type == "SosPed" && pedalIntervals[k].ontime < evts[n].ontime)
					{
						continue;
					}
					evts[n].endtime = pedalIntervals[k].offtime;
					break;
				} // endif
			}	  // endfor k
			for (int m = n + 1; m < evts.size(); m += 1)
			{
				if (evts[m].ontime >= evts[n].endtime)
				{
					break;
				}
				if (evts[m].channel != evts[n].channel)
				{
					continue;
				}
				if (evts[m].pitch != evts[n].pitch)
				{
					continue;
				}
				evts[n].endtime = evts[m].ontime;
				break;
			} // endfor m
		}	  // endfor n
	}

	void Sort()
	{
		stable_sort(evts.begin(), evts.end(), LessPianoRollEvt());
	}

	void SetEndtimeToOfftime()
	{
		for (int n = 0; n < evts.size(); n += 1)
		{
			evts[n].offtime = evts[n].endtime;
		} // endfor n
	}

	void Trim(double startTime, double endTime)
	{
		for (int n = evts.size() - 1; n >= 0; n -= 1)
		{
			if (evts[n].ontime > endTime)
			{
				evts.erase(evts.begin() + n);
				continue;
			}
			else if (evts[n].endtime < startTime)
			{
				evts.erase(evts.begin() + n);
				continue;
			} // endif
			if (evts[n].ontime < startTime)
			{
				evts[n].ontime = startTime;
			} // endif
			if (evts[n].offtime > endTime)
			{
				evts[n].offtime = endTime;
			} // endif
			if (evts[n].endtime > endTime)
			{
				evts[n].endtime = endTime;
			} // endif
		}	  // endfor n
	}		  // end Trim

	vector<double> GetPitchHistogram()
	{
		vector<double> ret;
		ret.assign(128, 0);
		for (int n = 0; n < evts.size(); n++)
		{
			if (evts[n].pitch < 0)
			{
				continue;
			}
			ret[evts[n].pitch] += evts[n].offtime - evts[n].ontime;
		} // endfor n
		Normalize(ret);
		return ret;
	} // end GetPitchHistogram

}; // end class PianoRoll

#endif // PIANOROLL_HPP
