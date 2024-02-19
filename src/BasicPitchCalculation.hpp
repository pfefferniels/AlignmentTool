#ifndef BASICPITCHCALCULATION_HPP
#define BASICPITCHCALCULATION_HPP

#include <string>
#include <sstream>
#include <unordered_map>

/**
 * Transforms MIDI pitch to spelled pitch (sitch)
 */
std::string PitchToSitch(int p)
{
	if (p < 0)
	{
		return "R";
	} // old rest
	int q = (p + 120) % 12;
	std::string qstr;
	std::stringstream ss;
	switch (q)
	{
	case 0:
		qstr = "C";
		break;
	case 1:
		qstr = "C#";
		break;
	case 2:
		qstr = "D";
		break;
	case 3:
		qstr = "Eb";
		break;
	case 4:
		qstr = "E";
		break;
	case 5:
		qstr = "F";
		break;
	case 6:
		qstr = "F#";
		break;
	case 7:
		qstr = "G";
		break;
	case 8:
		qstr = "G#";
		break;
	case 9:
		qstr = "A";
		break;
	case 10:
		qstr = "Bb";
		break;
	case 11:
		qstr = "B";
		break;
	} // endswitch
	ss.str("");
	ss << qstr << (p / 12 - 1);
	return ss.str();
}

/**
 * Transforms spelled pitch to MIDI pitch.
 * @returns -1 if the provided sitch is invalid.
 */
int SitchToPitch(std::string sitch)
{
	if (sitch.empty()) return -1;
	if (sitch == "R" || sitch == "rest") return -1; 

    std::unordered_map<char, int> pitchMap = {
        {'C', 60},
        {'D', 62},
        {'E', 64},
        {'F', 65},
        {'G', 67},
        {'A', 69},
        {'B', 71}
    };

    int p_rel;

    auto it = pitchMap.find(sitch[0]);
    if (it != pitchMap.end()) {
        p_rel = it->second;
    } else {
        std::cerr << "Invalid sitch " << sitch[0] << std::endl;
        return -1;
    }
	sitch.erase(sitch.begin());

    // Extract the last character as the octave
	// and remove it.
    int oct = sitch.back() - '0';
    sitch.pop_back();
	
	int p = p_rel + (oct - 4) * 12;

	if (sitch == "#" || sitch == "+")
	{
		p += 1;
	}
	else if (sitch == "##" || sitch == "++")
	{
		p += 2;
	}
	else if (sitch == "b" || sitch == "-")
	{
		p -= 1;
	}
	else if (sitch == "bb" || sitch == "--")
	{
		p -= 2;
	}

	return p;
}

#endif // BASICPITCHCALCULATION_HPP
