import { HMM } from "../HMM";

/*
export function realign(score: Score, hmm: HMM, match: ScorePerfMatch) {

}

vector<int> v(100);
vector<double> d(100);
vector<string> s(100);
stringstream ss;
if(argc!=6){cout<<"Error in usage! : $./this in_fmt3x.txt in_hmm.txt in_err_match.txt out_realigned_match.txt widthSec"<<endl; return -1;}

string fmt3xFile=string(argv[1]);
string hmmFile=string(argv[2]);
string inMatchFile=string(argv[3]);
string outMatchFile=string(argv[4]);
double widthSec=atof(argv[5]);

Fmt3x fmt3x;
fmt3x.ReadFile(fmt3xFile);
ScorePerfmMatch match;
match.ReadFile(inMatchFile);
Hmm hmm;
hmm.ReadFile(hmmFile);
hmm.ResetInternalPosition();

/// Normalise duplicate note labels
for(int n=0;n<match.evts.size();n+=1){
    for(int k=0;k<hmm.duplicateOnsets.size();k+=1){
        for(int l=1;l<hmm.duplicateOnsets[k].numOnsets;l+=1){
            if(match.evts[n].fmt1ID==hmm.duplicateOnsets[k].fmt1IDs[l]){
                match.evts[n].fmt1ID=hmm.duplicateOnsets[k].fmt1IDs[0];
            }//endif
        }//endfor l
    }//endfor k
}//endfor n

/// Pick up performacne errors
vector<int> pitchErrPos;
vector<int> extraNotePos;
vector<int> reorderdNotePos;
vector<vector<int> > missNoteIDs;

int preStime=-1;
vector<int> stimes;
vector<double> times;
for(int n=0;n<match.evts.size();n+=1){

    if(match.evts[n].errorInd==1){
        pitchErrPos.push_back(n);
    }//endif

    if(match.evts[n].errorInd==2 || match.evts[n].errorInd==3){
        extraNotePos.push_back(n);
    }//endif

    if(match.evts[n].errorInd!=2 && match.evts[n].errorInd!=3){
        stimes.push_back(match.evts[n].stime);
        times.push_back(match.evts[n].ontime);

        if(match.evts[n].stime<preStime){
            reorderdNotePos.push_back(n);
        }//endif
        preStime=match.evts[n].stime;
    }//endif

}//endfor n

for(int i=0;i<match.missingNotes.size();i+=1){
    missNoteIDs.push_back( fmt3x.FindFmt3xScorePos(match.missingNotes[i].fmt1ID) );
}//endfor i

TempoTracker tempoTracker;
tempoTracker.SetData(stimes,times);


/// Get error regions
Regions errRegions;
Regions pitchErrRegions;
Regions extraNoteRegions;
Regions reorderdNoteRegions;
Regions missNoteRegions;

for(int k=0;k<pitchErrPos.size();k+=1){
    pitchErrRegions.Add(match.evts[pitchErrPos[k]].ontime-widthSec,match.evts[pitchErrPos[k]].ontime+widthSec);
    errRegions.Add(match.evts[pitchErrPos[k]].ontime-widthSec,match.evts[pitchErrPos[k]].ontime+widthSec);
}//endfor k

for(int k=0;k<extraNotePos.size();k+=1){
//cout<<match.evts[extraNotePos[k]].ontime<<endl;
    extraNoteRegions.Add(match.evts[extraNotePos[k]].ontime-widthSec,match.evts[extraNotePos[k]].ontime+widthSec);
    errRegions.Add(match.evts[extraNotePos[k]].ontime-widthSec,match.evts[extraNotePos[k]].ontime+widthSec);
}//endfor k

for(int k=0;k<reorderdNotePos.size();k+=1){
    reorderdNoteRegions.Add(match.evts[reorderdNotePos[k]].ontime-widthSec,match.evts[reorderdNotePos[k]].ontime+widthSec);
    errRegions.Add(match.evts[reorderdNotePos[k]].ontime-widthSec,match.evts[reorderdNotePos[k]].ontime+widthSec);
}//endfor k

for(int k=0;k<missNoteIDs.size();k+=1){
    double evtTime=tempoTracker.GetTime(fmt3x.evts[missNoteIDs[k][0]].stime);
    missNoteRegions.Add(evtTime-widthSec,evtTime+widthSec);
    errRegions.Add(evtTime-widthSec,evtTime+widthSec);
}//endfor k

//extraNoteRegions.Print();

MOHMM mohmm;
mohmm.SetScorePerfmMatch(match);
mohmm.SetHmm(hmm);

for(int i=0;i<errRegions.regions.size();i+=1){

    ///Select regions
    bool includePitchErr=false;
    bool includeExtraNote=false;
    bool includeMissNote=false;
    bool includeReorderedNote=false;
    includePitchErr=pitchErrRegions.IsOverlapping(errRegions.regions[i]);
    includeExtraNote=extraNoteRegions.IsOverlapping(errRegions.regions[i]);
    includeMissNote=missNoteRegions.IsOverlapping(errRegions.regions[i]);
    includeReorderedNote=reorderdNoteRegions.IsOverlapping(errRegions.regions[i]);

    int maxStime=fmt3x.evts[0].stime;
    int minStime=fmt3x.evts[fmt3x.evts.size()-1].stime;
    double maxTime;
    double minTime=errRegions.regions[i][1];
    for(int n=0;n<match.evts.size();n+=1){
        if(match.evts[n].ontime<errRegions.regions[i][0]){continue;}
        if(match.evts[n].ontime>=errRegions.regions[i][1]){break;}
        if(match.evts[n].errorInd<2 && match.evts[n].stime>maxStime){maxStime=match.evts[n].stime;}
        if(match.evts[n].errorInd<2 && match.evts[n].stime<minStime){minStime=match.evts[n].stime;}
        if(match.evts[n].ontime<minTime){minTime=match.evts[n].ontime;}
        maxTime=match.evts[n].ontime;
    }//endfor n

//cout<<"("<<errRegions.regions[i][0]<<" , "<<errRegions.regions[i][1]<<")\t("<<minTime<<" , "<<maxTime<<")\t("<<minStime<<" , "<<maxStime<<")\t(perr,ext,miss,reord) "<<includePitchErr<<" "<<includeExtraNote<<" "<<includeMissNote<<" "<<includeReorderedNote<<endl;
//		if(!includeExtraNote || !includeMissNote){continue;}

    if(!( (includeExtraNote&&includeMissNote) || (includeMissNote&&includePitchErr) || (includeExtraNote&&includePitchErr) )){continue;}

    if(minTime>=maxTime){continue;}
    if(minStime>=maxStime){continue;}

//if(minTime>19.6634){break;}

//cout<<"("<<errRegions.regions[i][0]<<" , "<<errRegions.regions[i][1]<<")\t("<<minTime<<" , "<<maxTime<<")\t("<<minStime<<" , "<<maxStime<<")"<<endl;

    mohmm.Realign(minStime,maxStime,minTime,maxTime);

}//endfor i
//cout<<endl;

//		mohmm.Realign(37,52,4.57265,5.69978);
//(4.50502 , 5.74204)	(4.57265 , 5.69978)	(37 , 52)

match=mohmm.match;
match.WriteFile(outMatchFile);
}
*/
