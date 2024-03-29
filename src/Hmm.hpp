#ifndef Hmm_HPP
#define Hmm_HPP

#include <iostream>
#include <fstream>
#include <string>
#include <sstream>
#include <vector>
#include <stdio.h>
#include <cmath>
#include <cassert>
#include "Fmt3x.hpp"
#include "BasicPitchCalculation.hpp"

using namespace std;

class HmmEvt
{
public:
	int stime;
	int endstime;
	int internalPosition;
	string stateType; // CH,SA,AN,TR
	int numClusters;
	int numSitches;
	int numCh;
	int numArp;
	int numInterCluster; //(Ncluster-1)
	// For CH/SA/AN: numSitches=numClusters+numCh+numArp, numInterCluster=numClusters-1
	// For TR: numSitches=numCh=numArp=numInterCluster=0
	vector<int> numNotesPerCluster;
	vector<vector<string>> sitchesPerCluster;
	vector<vector<int>> voicesPerCluster;
	vector<vector<string>> fmt1IDsPerCluster;
}; // endclass HmmEvt

class DuplicateOnsetEvt
{
public:
	int stime;
	string sitch;
	int numOnsets;
	vector<string> fmt1IDs;
}; // endclass DuplicateOnsetEvt

struct Hmm
{
public:
	vector<HmmEvt> evts;
	vector<DuplicateOnsetEvt> duplicateOnsets;
	int TPQN;

	void Clear()
	{
		evts.clear();
		duplicateOnsets.clear();
	}

	void ConvertFromFmt3x(Fmt3x fmt3x)
	{
		Clear();
		TPQN = fmt3x.TPQN;

		{
			HmmEvt evt;
			evt.numNotesPerCluster.resize(1);
			evt.sitchesPerCluster.resize(1);
			evt.voicesPerCluster.resize(1);
			evt.fmt1IDsPerCluster.resize(1);
			vector<int> vi;

			for (int i = 0; i < fmt3x.evts.size(); i += 1)
			{
				evt.stime = fmt3x.evts[i].stime;
				evt.endstime = fmt3x.evts[i].stime;
				evt.internalPosition = 1;
				evt.stateType = "CH";

				evt.numClusters = 1;
				evt.numSitches = fmt3x.evts[i].numNotes;
				evt.numCh = fmt3x.evts[i].numNotes - 1;
				evt.numArp = 0;
				evt.numInterCluster = 0;

				evt.numNotesPerCluster[0] = fmt3x.evts[i].numNotes;
				evt.sitchesPerCluster[0] = fmt3x.evts[i].sitches;
				vi.assign(fmt3x.evts[i].numNotes, 0);
				evt.voicesPerCluster[0] = vi;
				evt.fmt1IDsPerCluster[0] = fmt3x.evts[i].fmt1IDs;

				evts.push_back(evt);
			} // endfor i
		}	  //

		for (int i = 0; i < fmt3x.duplicateOnsets.size(); i += 1)
		{
			DuplicateOnsetEvt dup;
			dup.stime = fmt3x.duplicateOnsets[i].stime;
			dup.sitch = fmt3x.duplicateOnsets[i].sitch;
			dup.numOnsets = fmt3x.duplicateOnsets[i].numOnsets;
			dup.fmt1IDs = fmt3x.duplicateOnsets[i].fmt1IDs;
			duplicateOnsets.push_back(dup);
		} // endfor i

	} // end ConvertFromFmt3x

	void ResetInternalPosition()
	{ // AN have negative internal positions
		int preStime = -1000;
		int NTmpEvts = 0;
		int numANs = 0;
		for (int i = 0; i < evts.size(); i += 1)
		{
			if (evts[i].stime != preStime)
			{
				for (int i_ = i - 1; i_ >= i - NTmpEvts; i_ -= 1)
				{
					evts[i_].internalPosition -= numANs;
				} // endfor i_
				preStime = evts[i].stime;
				NTmpEvts = 0;
				numANs = 0;
			} // endif

			NTmpEvts += 1;
			if (evts[i].stateType == "AN")
			{
				numANs += 1;
			} // endif

		} // endfor i
		for (int i_ = evts.size() - 1; i_ >= evts.size() - NTmpEvts; i_ -= 1)
		{
			evts[i_].internalPosition -= numANs;
		} // endfor i_

	} // end ResetInternalPosition

	bool IsDuplicate(string searchId) const
	{
		for (const auto& duplicateOnset : duplicateOnsets) {
			for (const auto& id : duplicateOnset.fmt1IDs) {
				if (id == searchId) return true;
			}
		}
		return false;
	}
};

#endif // Hmm_HPP
