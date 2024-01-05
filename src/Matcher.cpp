/*
Copyright 2023 Niels Pfeffer

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
#include <fstream>
#include <iostream>
#include <cmath>
#include <string>
#include <sstream>
#include <vector>
#include <algorithm>
#include "stdio.h"
#include "stdlib.h"
#include "ScoreFollower.hpp"
#include "ErrorDetection.hpp"
#include "Realignment.hpp"
#include <emscripten/bind.h>

using namespace emscripten;

struct MidiNote
{
	double onset;
	double offset;
	std::string id;
	int pitch;
	int channel;
};

struct NoteEvent
{
	int scoreTime;
	int staff; // 1 (RH) or 2 (LH)
	int voice; // starts at 0, counts across staff boundaries
	// subvoice does not play any role either
	int suborder;	  // after-note: -4, -3 etc., short-app on 0, following chord on 1
	std::string type; // 'chord', 'rest', 'after-note', 'short-app'
	int duration;
	// numnotes = sitches.size()

	// the following three vectors do not necessarily have the same size
	std::vector<std::string> sitches;
	std::vector<std::string> notetypes; // 'note' or 'trill'
	std::vector<std::string> ids;
};

struct Match
{
	std::string scoreId;
	std::string midiId;

	// 0 = with corresponding score time
	// 1 = without corresponding score time; atemporal event
	// -1 = note match if errorInd=2,3
	int matchStatus;

	int errorIndex;		   // 0(correct)/1(pitch error)/2(note-wise extra note, &)/3(cluster-wise extra note, *)
	std::string skipIndex; // 0(beginning)/1(resumption point)/- or +(otherwise)
};

struct MatchResult
{
	std::vector<Match> matches;
	std::vector<string> missingNotes; // vector of score IDs
};

PianoRoll convertMidiNotesToPianoRoll(const std::vector<MidiNote> &notes)
{
	PianoRoll pr;

	for (const MidiNote &note : notes)
	{
		PianoRollEvt newEvent;
		newEvent.ID = note.id;
		newEvent.channel = note.channel;
		newEvent.endtime = note.offset;
		newEvent.label = note.id;
		newEvent.offtime = note.offset;
		newEvent.offvel = 80;
		newEvent.onvel = 80;
		newEvent.ontime = note.onset;
		newEvent.pitch = note.pitch;
		newEvent.sitch = PitchToSitch(note.pitch);

		pr.evts.push_back(newEvent);
	}

	return pr;
}

Fmt3x convertNoteEventsToFmt3x(const std::vector<NoteEvent> &events, int ticksPerQuarter)
{
	Fmt3x fmt3x;

	for (const NoteEvent &event : events)
	{
		Fmt3xEvt newEvent;
		newEvent.stime = event.scoreTime;
		newEvent.staff = event.staff;
		newEvent.voice = event.voice;
		newEvent.subOrder = event.suborder;
		newEvent.eventtype = event.type;
		newEvent.dur = event.duration;
		newEvent.numNotes = event.sitches.size();
		newEvent.sitches = event.sitches;
		newEvent.notetypes = event.notetypes;
		newEvent.fmt1IDs = event.ids;

		fmt3x.evts.push_back(newEvent);
	}

	// TODO: fmt3x.duplicateOnsets
	fmt3x.TPQN = ticksPerQuarter;

	return fmt3x;
}

MatchResult convertMatchResult(const ScorePerfmMatch &match)
{
	MatchResult result;
	for (const MissingNote &missingNote : match.missingNotes)
	{
		result.missingNotes.push_back(missingNote.fmt1ID);
	}

	for (const ScorePerfmMatchEvt &event : match.evts)
	{
		Match newMatch = {};
		newMatch.scoreId = event.fmt1ID;
		newMatch.midiId = event.ID;
		newMatch.matchStatus = event.matchStatus;
		newMatch.errorIndex = event.errorInd;
		newMatch.skipIndex = event.skipInd;

		result.matches.push_back(newMatch);
	}

	return result;
}

MatchResult align(
	const std::vector<MidiNote> &midiNotes,
	const std::vector<NoteEvent> &noteEvents,
	double secondsPerQuarterNote,
	int ticksPerQuarterNote)
{
	Fmt3x fmt3x = convertNoteEventsToFmt3x(noteEvents, ticksPerQuarterNote);
	Hmm hmm;
	hmm.ConvertFromFmt3x(fmt3x);
	ScoreFollower follower(hmm, secondsPerQuarterNote);

	PianoRoll pr = convertMidiNotesToPianoRoll(midiNotes);
	ScorePerfmMatch firstMatch = follower.GetMatchResult(pr);
	ScorePerfmMatch matchWithErrors = detectErrors(fmt3x, hmm, firstMatch);
	ScorePerfmMatch realignedMatch = realign(fmt3x, hmm, matchWithErrors, 0.3);

	return convertMatchResult(realignedMatch);
}

// Binding code
EMSCRIPTEN_BINDINGS(score_follower)
{
	value_object<MidiNote>("MidiNote")
		.field("onset", &MidiNote::onset)
		.field("offset", &MidiNote::offset)
		.field("id", &MidiNote::id)
		.field("pitch", &MidiNote::pitch)
		.field("channel", &MidiNote::channel);

	value_object<NoteEvent>("NoteEvent")
		.field("scoreTime", &NoteEvent::scoreTime)
		.field("staff", &NoteEvent::staff)
		.field("voice", &NoteEvent::voice)
		.field("suborder", &NoteEvent::suborder)
		.field("type", &NoteEvent::type)
		.field("duration", &NoteEvent::duration)
		.field("sitches", &NoteEvent::sitches)
		.field("notetypes", &NoteEvent::notetypes)
		.field("ids", &NoteEvent::ids);

	value_object<Match>("Match")
		.field("scoreId", &Match::scoreId)
		.field("midiId", &Match::midiId)
		.field("matchStatus", &Match::matchStatus)
		.field("errorIndex", &Match::errorIndex)
		.field("skipIndex", &Match::skipIndex);

	value_object<MatchResult>("MatchResult")
		.field("matches", &MatchResult::matches)
		.field("missingNotes", &MatchResult::missingNotes);

	register_vector<std::string>("StringVector");
	register_vector<NoteEvent>("NoteEventVector");
	register_vector<MidiNote>("MidiNoteVector");
	register_vector<Match>("MatchVector");

	emscripten::function<MatchResult>("align", &align);
}
