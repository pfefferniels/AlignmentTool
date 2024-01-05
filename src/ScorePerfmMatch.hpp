/*
Copyright 2019 Eita Nakamura

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
#ifndef SCOREPERFMMATCH_HPP
#define SCOREPERFMMATCH_HPP

#include <iostream>
#include <fstream>
#include <string>
#include <sstream>
#include <vector>
#include <stdio.h>
#include <stdlib.h>
#include <cmath>
#include <iomanip>
#include <algorithm>

using namespace std;

struct ScorePerfmMatchEvt
{
	string ID;
	double ontime;
	double offtime;
	string sitch;
	int onvel;
	int offvel;
	int channel;
	int matchStatus; // 0(with corresponding score time)/1(without corresponding score time; atemporal event)/-1(note match if errorInd=2,3)
	int stime;
	string fmt1ID;
	int errorInd;	// 0(correct)/1(pitch error)/2(note-wise extra note, &)/3(cluster-wise extra note, *)
	string skipInd; // 0(beginning)/1(resumption point)/- or +(otherwise)
};

struct MissingNote
{
	int stime;
	string fmt1ID;
};

struct ScorePerfmMatch
{
	vector<ScorePerfmMatchEvt> evts;
	vector<MissingNote> missingNotes;
};

#endif // SCOREPERFMMATCH_HPP
