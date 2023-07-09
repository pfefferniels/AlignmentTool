import { HMMEvent } from "./HMMEvent"

export type ClusterNote = {
	sitch: string,
	voice: number,
	meiID: string
}

export type Cluster = ClusterNote[]

type DuplicateOnsetEvent = {
	scoreTime: number
	sitch: string
	numOnsets: number
	meiIDs: string[]
}

export class HMM {
	events: HMMEvent[] = []
	duplicateOnsets: DuplicateOnsetEvent[] = []
	ppq = 4

	fromMEI(mei: string) {
		// TODO create HMM representation of a MEI score

		/*
		HmmEvt evt;
		evt.numNotesPerCluster.resize(1);
		evt.sitchesPerCluster.resize(1);
		evt.voicesPerCluster.resize(1);
		evt.fmt1IDsPerCluster.resize(1);
		vector < int > vi;

		for (int i = 0; i < fmt3x.evts.size(); i += 1) {
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
		}//endfor i

		for (int i = 0; i < fmt3x.duplicateOnsets.size(); i += 1) {
			DuplicateOnsetEvt dup;
			dup.stime = fmt3x.duplicateOnsets[i].stime;
			dup.sitch = fmt3x.duplicateOnsets[i].sitch;
			dup.numOnsets = fmt3x.duplicateOnsets[i].numOnsets;
			dup.fmt1IDs = fmt3x.duplicateOnsets[i].fmt1IDs;
			duplicateOnsets.push_back(dup);
		}//endfor i*/

	}

	serialize() {
		return ''
	}
}
