class Regions {
    /**
     * Non-overlapping and ordered intervals [ regions[k][0] , regions[k][1] )
     */
    regions: number[][]
}

/*
    public:
        vector<vector<double> > regions;
    
        void Add(double t1,double t2){
            if(t1>=t2){
                cout<<"Invalid region: "<<t1<<"\t"<<t2<<endl;
                assert(false);
            }//endif
            int startPos=-1,endPos=-1;
            for(int i=0;i<regions.size();i+=1){
                if(t1<regions[i][1] && t1>=regions[i][0]){
                    startPos=i;
                }//endif
                if(t2<=regions[i][1] && t2>regions[i][0]){
                    endPos=i;
                }//endif
            }//endfor i
    //cout<<startPos<<"\t"<<endPos<<endl;
    
            vector<double> region(2);
    
            if(startPos==-1 && endPos==-1){//No overlaps
                region[0]=t1; region[1]=t2;
                for(int i=regions.size()-1;i>=0;i-=1){
                    if(regions[i][0]>=region[1] || regions[i][1]<=region[0]){continue;}//endif
                    regions.erase(regions.begin()+i);
                }//endfor i
            }else if(startPos==-1 && endPos!=-1){
                region[0]=t1; region[1]=regions[endPos][1];
                for(int i=endPos;i>=0;i-=1){
                    if(regions[i][1]<region[0]){break;}//endif
                    regions.erase(regions.begin()+i);
                }//endfor i
            }else if(startPos!=-1 && endPos==-1){
                region[0]=regions[startPos][0]; region[1]=t2;
                for(int i=regions.size()-1;i>=startPos;i-=1){
                    if(regions[i][0]>region[1]){continue;}//endif
                    regions.erase(regions.begin()+i);
                }//endfor i
            }else{//if startPos!=-1 && endPos!=-1
                region[0]=regions[startPos][0]; region[1]=regions[endPos][1];
                for(int i=endPos;i>=startPos;i-=1){
                    regions.erase(regions.begin()+i);
                }//endfor i
            }//endif
    
            int insertPos=0;
            for(int i=0;i<regions.size();i+=1){
                if(region[0]>regions[i][0]){insertPos=i+1;}
            }//endfor i
            regions.insert(regions.begin()+insertPos,region);
    
        }//end AddRegion
    
        void Print(){
            for(int i=0;i<regions.size();i+=1){
    cout<<"["<<regions[i][0]<<","<<regions[i][1]<<")"<<endl;
            }//endfor i
        }//end Print
    
        bool IsOverlapping(vector<double>& region){
            assert(region.size()==2);
            bool isOverlapping=false;
            for(int i=0;i<regions.size();i+=1){
                if(region[0]>=regions[i][0] && region[0]<regions[i][1]){isOverlapping=true;break;}
                if(region[1]>regions[i][0] && region[1]<=regions[i][1]){isOverlapping=true;break;}
                if(regions[i][0]>=region[0] && regions[i][0]< region[1]){isOverlapping=true;break;}
                if(regions[i][1]> region[0] && regions[i][1]<=region[1]){isOverlapping=true;break;}
            }//endfor i
            return isOverlapping;
        }//end IsOverlapping
    
        bool IsContained(double &value){
            bool isContained=false;
            for(int i=0;i<regions.size();i+=1){
                if(value>=regions[i][0] && value<regions[i][1]){isContained=true;break;}
            }//endfor i
            return isContained;
        }//end IsContained
    
        int ContainedRegion(double &value){
            int regionID=-1;
            for(int i=0;i<regions.size();i+=1){
                if(value>=regions[i][0] && value<regions[i][1]){regionID=i;break;}
            }//endfor i
            return regionID;
        }//end 
    
    };//end Regions
    */