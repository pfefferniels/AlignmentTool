/*
Copyright 2019 Eita Nakamura

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
#ifndef SCOREPERFMMATCH_HPP
#define SCOREPERFMMATCH_HPP

#include <string>
#include <vector>

enum ErrorIndex {
	Correct = 0,
	PitchError = 1,
	NoteWiseExtraNote = 2,
	ClusterWiseExtraNote = 3
};

struct ScorePerfmMatchEvt
{
	std::string ID;
	double ontime;
	double offtime;
	std::string sitch;
	int onvel;
	int offvel;
	int channel;
	int matchStatus; // 0(with corresponding score time)/1(without corresponding score time; atemporal event)/-1(note match if errorInd=2,3)
	int stime;
	std::string fmt1ID;
	ErrorIndex errorInd;
	std::string skipInd; // 0(beginning)/1(resumption point)/- or +(otherwise)
};

struct MissingNote
{
	int stime;
	std::string fmt1ID;
};

struct ScorePerfmMatch
{
	std::vector<ScorePerfmMatchEvt> evts;
	std::vector<MissingNote> missingNotes;
};

#endif // SCOREPERFMMATCH_HPP
