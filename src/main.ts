import { HMM, HMMEvent } from "./HMM";
import { StateType } from "./HMMState";
import { PianoRoll } from "./PianoRoll";
import { ScoreFollower } from "./score-follower/ScoreFollower";

const hmm = new HMM()
hmm.events = [
  new HMMEvent(0, 3, [
    [{ sitch: 'A3', meiID: '#note1', voice: 3 },
    { sitch: 'E4', meiID: '#note2', voice: 2 },
    { sitch: 'C#5', meiID: '#note3', voice: 1 }]]),
  new HMMEvent(3, 4, [
    [{ sitch: 'D5', meiID: '#note4', voice: 1 },
    { sitch: 'B3', meiID: '#note5', voice: 3 }]
  ])]

const follower = new ScoreFollower(hmm, 1)

const pr = new PianoRoll()
pr.events =
  [
    { ontime: 1.008333, offtime: 2.307292, id: '002', pitch: 73, sitch: 'C#5', onvel: 80, offvel: 80, channel: 1, endtime: 2.5, label: '002' },
    { ontime: 1.025000, offtime: 2.333333, id: '000', pitch: 57, sitch: 'A3', onvel: 80, offvel: 80, channel: 1, endtime: 2.5, label: '000' },
    { ontime: 1.037500, offtime: 2.584375, id: '001', pitch: 64, sitch: 'E4', onvel: 80, offvel: 80, channel: 1, endtime: 2.5, label: '001' },
    { ontime: 2.445833, offtime: 2.595833, id: '003', pitch: 59, sitch: 'B3', onvel: 80, offvel: 80, channel: 1, endtime: 2.5, label: '000' },
    { ontime: 2.458333, offtime: 2.604167, id: '004', pitch: 74, sitch: 'D5', onvel: 80, offvel: 80, channel: 1, endtime: 2.5, label: '001' },
  ]

const result = follower.getMatchResult(pr)
console.log(result.events)
