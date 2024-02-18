#ifndef PIANOROLL_HPP
#define PIANOROLL_HPP

#include <iostream>
#include <string>
#include <vector>
#include <algorithm>

struct PianoRollEvt
{
	std::string ID;
	double ontime;
	double offtime;
	std::string sitch; // spelled pitch
	int pitch;		   // integral pitch
	int onvel;
	int offvel;
	int channel;
	std::string label;

	// other than offtime, endtime includes pedalling.
	double endtime;

	int ext1; // extended variable 1, used in realignment

	PianoRollEvt()
	{
		ID = "0";
		endtime = 0;
		label = "-";
		ext1 = 0;
		channel = 0;
		onvel = 80;
		offvel = 80;
	}
	~PianoRollEvt() {}

	void Print()
	{
		std::cout << ID << "\t" << ontime << "\t" << offtime << "\t" << sitch << "\t" << pitch << "\t" << onvel << "\t" << offvel << "\t" << channel << "\t" << label << std::endl;
	}
};

struct PianoRoll
{
	std::vector<PianoRollEvt> evts;

	void Clear()
	{
		evts.clear();
	}

	void Sort()
	{
		std::sort(evts.begin(), evts.end(), [](const auto &a, const auto &b) {
			// Consider the onsets. If they are equal, check for pitch instead.
			return (a.ontime < b.ontime) || (a.ontime == b.ontime && a.pitch < b.pitch);
		});
	}
};

#endif // PIANOROLL_HPP
