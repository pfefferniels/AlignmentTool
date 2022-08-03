import { HMM } from "../HMM"
import { ScorePerformanceMatch } from "../Match"

function errLP(pitchError: number) {
    const errMap = new Map<number, number>([
        [0, -0.0512932], 
        [1, -4.892852],
        [2, -4.509860],
        [3, -7.6818715],
        [4, -7.6818715],
        [5, -7.6818715],
        [6, -7.6818715],
        [7, -7.6818715],
        [8, -7.6818715],
        [9, -7.6818715],
        [10, -7.6818715],
        [11, -7.6818715],
        [12, -6.0533399]
    ])

    errMap.get(Math.abs(pitchError)) || -30
}

/**
 * This function 
 * - identifies missing notes in the match and appends them to the `missingNotes` field
 * 
 * @param hmm 
 * @param match 
 */
export function detectErrors(hmm: HMM, match: ScorePerformanceMatch) {
	// find the position of a matched note in 
	// the HMM data structure
	const hmmPositions = []
	match.events.forEach(matchEvent => {
		const index = hmm.events.findIndex(hmmEvent => {
			return hmmEvent.clusters.flat().find(note => note.meiID === matchEvent.meiId) &&
				   hmmEvent.scoreTime === matchEvent.stime
		})
		hmmPositions.push(index)
	})

	// identify missing notes
	match.missingNotes = []
	hmm.events.forEach(hmmEvent => {
		hmmEvent.clusters.flat().forEach(scoreNote => {
			// do not continue searching if this score note
			// is one of the duplicate notes
			// if (duplicateMeiIds.find(scoreNote.meiId)) return
			
			const correspondingMatch = match.events.find(match => match.meiId === scoreNote.meiID)
			if (!correspondingMatch) {
				match.missingNotes.push({
					stime: hmmEvent.scoreTime,
					meiId: scoreNote.meiID
				})
			}
		})
	})
}

/*
	vector<int> v(100);
	vector<double> d(100);
	vector<string> s(100);
	stringstream ss;

	/// Aligned clusters
	vector<vector<int> > hmmID_noteID;//hmmID_noteID[][0,1,2]=hmmID,noteID,0(normal)/1(extra)
{
	int curID=-1;
	vector<int> vi3(3);
	for(int i=0;i<hmmStateIDs.size();i+=1){
		if(hmmStateIDs[i]!=curID){
			vi3[0]=hmmStateIDs[i]; vi3[1]=i; vi3[2]=0;
			hmmID_noteID.push_back(vi3);
			curID=hmmStateIDs[i];
		}//endif
	}//endfor i
}//


	////// cluster-wise LR alignment
	int numHMMState=hmm.evts.size();
	vector<double> LP;
	vector<vector<int> > amax;
	amax.resize(hmmID_noteID.size());
	for(int i=0;i<hmmID_noteID.size();i+=1){
		amax[i].resize(numHMMState);
	}//endfor i

	LP.assign(numHMMState,0);
	for(int i=0;i<numHMMState;i+=1){
		LP[i]+=((1==hmmID_noteID[0][0])? 0:-1);
	}//endfor i

	for(int n=1;n<hmmID_noteID.size();n+=1){
		vector<double> prevLP(LP);
		for(int i=0;i<numHMMState;i+=1){//j->i
			LP[i]=prevLP[i];
			amax[n][i]=i;
			for(int j=0;j<i;j+=1){
				if(prevLP[j]>LP[i]){
					LP[i]=prevLP[j];
					amax[n][i]=j;
				}//endif
			}//endfor j
			LP[i]+=((i==hmmID_noteID[n][0])? 0:-1);
		}//endfor i
	}//endfor n

	vector<int> opt(hmmID_noteID.size());
{
	double max=LP[0];
	opt[opt.size()-1]=0;
	for(int i=0;i<numHMMState;i+=1){
		if(LP[i]>max){
			max=LP[i];
			opt[opt.size()-1]=i;
		}//endif
	}//endfor i
}//

	for(int n=opt.size()-2;n>=0;n-=1){
		opt[n]=amax[n+1][opt[n+1]];
	}//endfor n

	for(int n=0;n<opt.size();n+=1){
		if(hmmID_noteID[n][0]!=opt[n]){//Insertion of cluster: If the cluster IDs do not match
			hmmID_noteID[n][2]=1;
		}else{//Insertion of cluster: If the cluster ID appears more than once
			bool found=false;
			for(int j=0;j<n;j+=1){
				if(opt[j]==opt[n]&&hmmID_noteID[j][0]==opt[j]){found=true; break;}
			}//endfor j
			if(found){hmmID_noteID[n][2]=1;}
		}//endif
	}//endfor n



	//// Note-wise matching
	vector<string> duplicateFmt1IDs;
	for(int i=0;i<hmm.duplicateOnsets.size();i+=1){
		for(int j=1;j<hmm.duplicateOnsets[i].fmt1IDs.size();j+=1){
			duplicateFmt1IDs.push_back(hmm.duplicateOnsets[i].fmt1IDs[j]);
		}//endfor j
	}//endfor i

	vector<double> medianTimes;//define for all hmm states (-1 if undefined);
	medianTimes.assign(hmm.evts.size(),-1);
	for(int i=0;i<hmmID_noteID.size();i+=1){
		if(hmmID_noteID[i][2]==1){continue;}
		if(hmm.evts[hmmID_noteID[i][0]].stateType!="CH"){continue;}

		int nextClusterNoteID;
		if(i==hmmID_noteID.size()-1){nextClusterNoteID=match.evts.size();
		}else{nextClusterNoteID=hmmID_noteID[i+1][1];}//endif

		vector<double> reftimes;
		for(int m=hmmID_noteID[i][1];m<nextClusterNoteID;m+=1){
			reftimes.push_back(match.evts[m].ontime);
		}//endfor m
		sort(reftimes.begin(),reftimes.end());
		medianTimes[hmmID_noteID[i][0]]=reftimes[reftimes.size()/2];

	}//endfor i



	for(int n=0;n<hmmID_noteID.size();n+=1){
		int nextClusterNoteID;
		if(n==hmmID_noteID.size()-1){nextClusterNoteID=match.evts.size();
		}else{nextClusterNoteID=hmmID_noteID[n+1][1];}//endif

		if(hmmID_noteID[n][2]>0){//Extra cluster
			for(int i=hmmID_noteID[n][1];i<nextClusterNoteID;i+=1){
				match.evts[i].fmt1ID="*";
				match.evts[i].errorInd=3;
			}//endfor i
			continue;
		}//endif

		if(hmm.evts[hmmID_noteID[n][0]].stateType=="TR"){
			vector<double> refPitches;
			for(int j=0;j<hmm.evts[hmmID_noteID[n][0]].sitchesPerCluster.size();j+=1){
				for(int k=0;k<hmm.evts[hmmID_noteID[n][0]].sitchesPerCluster[j].size();k+=1){
					refPitches.push_back(SitchToPitch(hmm.evts[hmmID_noteID[n][0]].sitchesPerCluster[j][k]));
				}//endfor k
			}//endfor j
			for(int m=hmmID_noteID[n][1];m<nextClusterNoteID;m+=1){
				if(find(refPitches.begin(),refPitches.end(),SitchToPitch(match.evts[m].sitch))==refPitches.end()){
					match.evts[m].fmt1ID="*";
					match.evts[m].errorInd=3;
				}//endif
			}//endfor m
			continue;
		}//endif

		/// Define reference time
		double refT;
		bool refT_defined=false;

		if(hmmID_noteID[n][0]>0 && hmmID_noteID[n][0]<hmm.evts.size()-1){
			if(medianTimes[hmmID_noteID[n][0]-1]>=0 && medianTimes[hmmID_noteID[n][0]+1]>=0){
				//t1 and t-1 are defined
				refT_defined=true;

				if(medianTimes[hmmID_noteID[n][0]]>=0){
					refT=1./3.*medianTimes[hmmID_noteID[n][0]]
					     +2./3.*(medianTimes[hmmID_noteID[n][0]+1]*(hmm.evts[hmmID_noteID[n][0]].stime-hmm.evts[hmmID_noteID[n][0]-1].stime)+medianTimes[hmmID_noteID[n][0]-1]*(hmm.evts[hmmID_noteID[n][0]+1].stime-hmm.evts[hmmID_noteID[n][0]].stime))/double(hmm.evts[hmmID_noteID[n][0]+1].stime-hmm.evts[hmmID_noteID[n][0]-1].stime);
				}else{
					refT=(medianTimes[hmmID_noteID[n][0]+1]*(hmm.evts[hmmID_noteID[n][0]].stime-hmm.evts[hmmID_noteID[n][0]-1].stime)+medianTimes[hmmID_noteID[n][0]-1]*(hmm.evts[hmmID_noteID[n][0]+1].stime-hmm.evts[hmmID_noteID[n][0]].stime))/double(hmm.evts[hmmID_noteID[n][0]+1].stime-hmm.evts[hmmID_noteID[n][0]-1].stime);
				}//endif

			}//endif
		}else{
			if(medianTimes[hmmID_noteID[n][0]]>=0){
				//only t0 is defined
				refT_defined=true;
				refT=medianTimes[hmmID_noteID[n][0]];
			}//endif
		}//endif

		if(!refT_defined){
			vector<double> reftimes;
			for(int m=hmmID_noteID[n][1];m<nextClusterNoteID;m+=1){
				reftimes.push_back(match.evts[m].ontime);
			}//endfor m
			sort(reftimes.begin(),reftimes.end());
			refT=reftimes[reftimes.size()/2];
			refT_defined=true;
		}//endif

		vector<ScoreNote> scoreClusterContent;
{
		ScoreNote scoreNote;
		for(int j=0;j<hmm.evts[hmmID_noteID[n][0]].fmt1IDsPerCluster.size();j+=1){
			for(int k=0;k<hmm.evts[hmmID_noteID[n][0]].fmt1IDsPerCluster[j].size();k+=1){
				bool found=false;
				for(int l=0;l<duplicateFmt1IDs.size();l+=1){
					if(hmm.evts[hmmID_noteID[n][0]].fmt1IDsPerCluster[j][k]==duplicateFmt1IDs[l]){
						found=true; break;
					}//endif
				}//endfor l
				if(found){continue;}
				scoreNote.pitch=SitchToPitch(hmm.evts[hmmID_noteID[n][0]].sitchesPerCluster[j][k]);
				scoreNote.sitch=hmm.evts[hmmID_noteID[n][0]].sitchesPerCluster[j][k];
				scoreNote.fmt1ID=hmm.evts[hmmID_noteID[n][0]].fmt1IDsPerCluster[j][k];
				scoreNote.noteStatus=0;
				scoreNote.hmmID1=hmmID_noteID[n][0];
				scoreNote.hmmID2=j;
				scoreNote.hmmID3=k;
				scoreClusterContent.push_back(scoreNote);
			}//endfor k
		}//endfor j
}//
		stable_sort(scoreClusterContent.begin(), scoreClusterContent.end(), LessScoreNote());

		vector<PerfmNote> perfmClusterContent;
{
		PerfmNote perfmNote;
		for(int m=hmmID_noteID[n][1];m<nextClusterNoteID;m+=1){
			perfmNote.pitch=SitchToPitch(match.evts[m].sitch);
			perfmNote.noteID=m;
			perfmNote.noteStatus=-1;
			perfmClusterContent.push_back(perfmNote);
		}//endfor m
}//
		stable_sort(perfmClusterContent.begin(), perfmClusterContent.end(), LessPerfmNote());


		/// Select best synchronised performed note for each pitch -> others are extra notes
		/// Identify correct notes
{
		int count;
		int amin;
		double min;
		for(int m=0;m<perfmClusterContent.size();m+=1){
			count=1;
			amin=m;
			min=abs(match.evts[perfmClusterContent[m].noteID].ontime-refT);
			perfmClusterContent[m].noteStatus=1;
			for(int mp=m+1;mp<perfmClusterContent.size();mp+=1){
				if(perfmClusterContent[mp].pitch!=perfmClusterContent[m].pitch){break;}
				count+=1;
				perfmClusterContent[mp].noteStatus=1;
				if(abs(match.evts[perfmClusterContent[mp].noteID].ontime-refT)<min){
					amin=mp;
					min=abs(match.evts[perfmClusterContent[mp].noteID].ontime-refT);
				}//endif
			}//endfor mp
			perfmClusterContent[amin].noteStatus=-1;
			for(int l=0;l<scoreClusterContent.size();l+=1){
				if(perfmClusterContent[amin].pitch==scoreClusterContent[l].pitch){
					perfmClusterContent[amin].noteStatus=0;
					scoreClusterContent[l].noteStatus=1;
					match.evts[perfmClusterContent[amin].noteID].fmt1ID=scoreClusterContent[l].fmt1ID;
					match.evts[perfmClusterContent[amin].noteID].sitch=scoreClusterContent[l].sitch;
					match.evts[perfmClusterContent[amin].noteID].errorInd=0;
					break;
				}//endif
			}//endfor l
			m=m+count-1;
		}//endfor m
}//
		for(int m=perfmClusterContent.size()-1;m>=0;m-=1){
			if(perfmClusterContent[m].noteStatus==1){
				match.evts[perfmClusterContent[m].noteID].fmt1ID="*";
				match.evts[perfmClusterContent[m].noteID].errorInd=3;
				perfmClusterContent.erase(perfmClusterContent.begin()+m);
			}else if(perfmClusterContent[m].noteStatus==0){
				perfmClusterContent.erase(perfmClusterContent.begin()+m);
			}//endif
		}//endfor m

		/// Identify pitch error or extra note
		int scoreClusterSize=scoreClusterContent.size();
		for(int l=-1;l<scoreClusterSize;l+=1){

			int minPitch=-1;
			int maxPitch=500;

			if(l>=0){
				minPitch=scoreClusterContent[l].pitch;
			}//endif
			vector<int> SCIDs;//ID for notes in score cluster content
			for(int lp=l+1;lp<scoreClusterContent.size();lp+=1){
				l=lp-1;
				if(scoreClusterContent[lp].noteStatus==1){
					maxPitch=scoreClusterContent[lp].pitch;
					break;
				}//endif
				SCIDs.push_back(lp);
				if(lp==scoreClusterContent.size()-1 && scoreClusterContent[lp].noteStatus==0){
					l=lp;
				}//endif
			}//endfor lp

			vector<int> PCIDs;//ID for notes in perform cluster content
			for(int m=0;m<perfmClusterContent.size();m+=1){
				if(perfmClusterContent[m].pitch>minPitch && perfmClusterContent[m].pitch<maxPitch){
					PCIDs.push_back(m);
					perfmClusterContent[m].noteStatus=1;
				}//endif
			}//endfor m

			if(PCIDs.size()==0){continue;}
			if(SCIDs.size()==0){
				for(int mm=0;mm<PCIDs.size();mm+=1){
					perfmClusterContent[PCIDs[mm]].noteStatus=1;//extra note
				}//endfor mm
				continue;
			}//endif

			if(PCIDs.size()==SCIDs.size()){
				for(int mm=0;mm<PCIDs.size();mm+=1){
					perfmClusterContent[PCIDs[mm]].noteStatus=2;//pitch error
					perfmClusterContent[PCIDs[mm]].scoreNoteRef=SCIDs[mm];
				}//endfor mm
				continue;
			}//endif

			/// Reach here only if (PCIDs.size()>1 or SCIDs.size()>1)
			/// note-wise LR alignment for (minPitch,maxPitch)
			int stateSize=PCIDs.size()+2;//state = 0(N/A) / PCID+1 / 9999(N/A)
			vector<double> LP(stateSize);
			vector<vector<int> > amax(SCIDs.size());
			for(int i=0;i<SCIDs.size();i+=1){amax[i].resize(stateSize);}

			//Initial probability (uniform);
			LP[0]=-100;
			for(int i=1;i<stateSize-1;i+=1){
				LP[i]=errLP(perfmClusterContent[PCIDs[i-1]].pitch-scoreClusterContent[SCIDs[0]].pitch);
			}//endfor i
			LP[stateSize-1]=-100;

			double logP;
			for(int t=1;t<SCIDs.size();t+=1){
				vector<double> preLP(LP);

				LP[0]=preLP[0]-100;
				amax[t][0]=0;

				for(int i=1;i<stateSize-1;i+=1){
					amax[t][i]=0;
					LP[i]=preLP[0];
					for(int j=1;j<i;j+=1){
						logP=preLP[j];
						if(logP>LP[i]){LP[i]=logP;amax[t][i]=j;}//endif
					}//endfor j					
					LP[i]+=errLP(perfmClusterContent[PCIDs[i-1]].pitch-scoreClusterContent[SCIDs[t]].pitch);
				}//endfor i

					amax[t][stateSize-1]=stateSize-1;
					LP[stateSize-1]=preLP[stateSize-1];
					for(int j=1;j<stateSize-1;j+=1){
						logP=preLP[j];
						if(logP>LP[stateSize-1]){LP[stateSize-1]=logP;amax[t][stateSize-1]=j;}//endif
					}//endfor j
					LP[stateSize-1]-=100;

			}//endfor t

			vector<int> optPath(SCIDs.size());
			optPath[SCIDs.size()-1]=0;
			double max=LP[0];
			for(int i=1;i<stateSize;i+=1){
				if(LP[i]>max){
					max=LP[i];
					optPath[SCIDs.size()-1]=i;
				}//endif
			}//endfor i
			for(int t=SCIDs.size()-2;t>=0;t-=1){
				optPath[t]=amax[t+1][optPath[t+1]];
			}//endfor t

			for(int i=0;i<SCIDs.size();i+=1){
				if(optPath[i]==0 || optPath[i]==PCIDs.size()+1){continue;}
				perfmClusterContent[PCIDs[optPath[i]-1]].noteStatus=2;
				perfmClusterContent[PCIDs[optPath[i]-1]].scoreNoteRef=SCIDs[i];
			}//endfor i

		}//endfor l

		for(int m=0;m<perfmClusterContent.size();m+=1){
			if(perfmClusterContent[m].noteStatus==1){//extra note
				match.evts[perfmClusterContent[m].noteID].fmt1ID="*";
				match.evts[perfmClusterContent[m].noteID].errorInd=3;
			}else if(perfmClusterContent[m].noteStatus==2){//pitch error
				match.evts[perfmClusterContent[m].noteID].fmt1ID=scoreClusterContent[perfmClusterContent[m].scoreNoteRef].fmt1ID;
				match.evts[perfmClusterContent[m].noteID].errorInd=1;
			}else{//never reach here

				assert(false);
			}//endif
		}//endfor m

	}//endfor n

	ss.str(""); ss<<" fmt3x: "<<fmt3FileName;
	match.comments.push_back(ss.str());

	match.WriteFile(out_witherror_matchFileName);
}

*/