const d = (FirstByte & 0b10) >> 1;
const w = FirstByte & 0b1;

const mod = (SecondByte >> 6);
const reg = (SecondByte & 0b111000) >> 3;
const rm = (SecondByte & 0b111);
let result = "";
if (mod == 3) {
	result = OpName + 
		" " + EffAddress[mod][w][rm] + ", " + regName[w][reg];
} else {
	result = OpName + 
		" " + EffAddress[mod][rm] + ", " + regName[w][reg];
}

if (mod == 1) {
	result += " ;1";
} else if (mod == 2) {
	result += " ;2";
} else if (mod == 0 && rm == 0b110) {
	result += " ;" + (w == 0 ? 1 : 2);
} else {
	result += " ;0";
}
return result;

