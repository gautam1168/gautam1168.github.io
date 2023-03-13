const d = 1;
const w = 0;
const mod = (SecondByte >> 6);
const reg = (SecondByte & 0b111000) >> 3;
const rm = (SecondByte & 0b111);
let result = "";
if (mod == 3) {
	result = "MOV " + 
		" " + regName[w][reg] + ", " + EffAddress[mod][w][rm];
} else {
	result = "MOV " + 
		" " + regName[w][reg] + ", " + EffAddress[mod][rm];
}

if (mod == 1) {
	result += " ;1";
} else if (mod == 2) {
	result += " ;2";
}  else if (mod == 0 && rm == 0b110) {
	result += " ;1";
} else {
	result += " ;0";
}
return result;
