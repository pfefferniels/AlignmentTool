#ifndef BASICPITCHCALCULATION_HPP
#define BASICPITCHCALCULATION_HPP

#include <string>
#include <sstream>

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
 */
int SitchToPitch(std::string sitch)
{
	if (sitch == "R")
	{
		return -1;
	}
	if (sitch == "rest")
	{
		return -1;
	}
	int p_rel, p;
	if (sitch[0] == 'C')
	{
		p_rel = 60;
	}
	else if (sitch[0] == 'D')
	{
		p_rel = 62;
	}
	else if (sitch[0] == 'E')
	{
		p_rel = 64;
	}
	else if (sitch[0] == 'F')
	{
		p_rel = 65;
	}
	else if (sitch[0] == 'G')
	{
		p_rel = 67;
	}
	else if (sitch[0] == 'A')
	{
		p_rel = 69;
	}
	else if (sitch[0] == 'B')
	{
		p_rel = 71;
	}
	sitch.erase(sitch.begin());
	int oct = sitch[sitch.size() - 1] - '0';
	sitch.erase(sitch.end() - 1);
	p = p_rel + (oct - 4) * 12;
	if (sitch == "")
	{
		p += 0;
	}
	else if (sitch == "#")
	{
		p += 1;
	}
	else if (sitch == "##")
	{
		p += 2;
	}
	else if (sitch == "b")
	{
		p -= 1;
	}
	else if (sitch == "bb")
	{
		p -= 2;
	}
	else if (sitch == "+")
	{
		p += 1;
	}
	else if (sitch == "++")
	{
		p += 2;
	}
	else if (sitch == "-")
	{
		p -= 1;
	}
	else if (sitch == "--")
	{
		p -= 2;
	}
	return p;
}
#endif // BASICPITCHCALCULATION_HPP
