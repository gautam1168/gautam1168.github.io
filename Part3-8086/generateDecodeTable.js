const fs = require("fs");

const data = "something to write";

// regName[w][reg]
const regName = [
	["AL", "CL", "DL", "BL", "AH", "CH", "DH", "BH"],
	["AX", "CX", "DX", "BX", "SP", "BP", "SI", "DI"],
];

// EffAddress[mod][rm]
// EffAddress[11][w][rm]
const EffAddress = [
	[
		"[BX+SI]", 
		"[BX+DI]", 
		"[BP+SI]", 
		"[BP+DI]", 
		"[SI]", 
		"[DI]", 
		"[{bytes}]", 
		"[BX]"
	],
	[
		"[BX+SI+{bytes}]", 
		"[BX+DI+{bytes}]", 
		"[BP+SI+{bytes}]", 
		"[BP+DI+{bytes}]", 
		"[SI+{bytes}]", 
		"[DI+{bytes}]", 
		"[BP+{bytes}]", 
		"[BX+{bytes}]"
	],
	[
		"[BX+SI+{bytes}]", 
		"[BX+DI+{bytes}]", 
		"[BP+SI+{bytes}]", 
		"[BP+DI+{bytes}]", 
		"[SI+{bytes}]", 
		"[DI+{bytes}]", 
		"[BP+{bytes}]", 
		"[BX+{bytes}]"
	],
	[["AL", "CL", "DL", "BL", "AH", "CH", "DH", "BH"],
	["AX", "CX", "DX", "BX", "SP", "BP", "SI", "DI"]]
];

fs.open("decodetable.txt", "w", (err, fd) => {
	if (err) {
		console.error("Failed to open file", err);
		return;
	}

	for (let OpcodeIndex = 0; OpcodeIndex < 65536; ++OpcodeIndex) {
		
		Instruction = OpcodeIndex.toString(2).padStart(16, '0');
		Instruction += " " + getAssemblyTemplate(OpcodeIndex);
		Instruction += "\n";
		
		fs.writeSync(fd, Instruction); 
	}

	fs.close(fd);
});

function registerMemoryToFromRegister(OpName, FirstByte, SecondByte) {
	const d = (FirstByte & 0b10) >> 1;
	const w = FirstByte & 0b1;

	const mod = (SecondByte >> 6);
	const reg = (SecondByte & 0b111000) >> 3;
	const rm = (SecondByte & 0b111);
	let result = "";
	if (d == 0) {
		if (mod == 3) {
			result = OpName + 
				" " + EffAddress[mod][w][rm] + ", " + regName[w][reg];
		} else {
			result = OpName + 
				" " + EffAddress[mod][rm] + ", " + regName[w][reg];
		}
	} else {
		if (mod == 3) {
			result = OpName + 
				" " + regName[w][reg] + ", " + EffAddress[mod][w][rm];
		} else {
			result = OpName + 
				" " + regName[w][reg] + ", " + EffAddress[mod][rm];
		}
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
}

function immediateToRegisterMemory(OpName, FirstByte, SecondByte) {
	const w = FirstByte & 0b1;
	const mod = (SecondByte >> 6);
	const reg = (SecondByte & 0b111000) >> 3;
	const rm = (SecondByte & 0b111);
	let result;
	if (reg == 0) {
		if (mod == 3) {
			result = OpName + 
				" " + EffAddress[mod][w][rm] + ", {bytes}";
		} else {
			result = OpName + 
				" " + EffAddress[mod][rm] + ", {bytes}";
		}

		if (mod == 1) {
			result += " ;1," + (w == 0 ? 1 : 2);
		} else if (mod == 2) {
			result += " ;2," + (w == 0 ? 1 : 2);
		}  else if (mod == 0 && rm == 0b110) {
			result += " ;2," + (w == 0 ? 1 : 2);
		} else {
			result += " ;" + (w == 0 ? 1 : 2);
		}

		return result;
	}
}

function immediateToRegister(OpName, FirstByte, SecondByte) {
	const w = (SecondByte & 0b00001000) >> 3;
	const reg = SecondByte & 0b111;
	return OpName + " " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
}

function accumulatorToMemory(OpName, FirstByte, SecondByte) {
	const w = (SecondByte & 0b1);
	return `${OpName} [{bytes}], ${ w == 0 ? 'AL' : 'AX' } ;2`;
}

function memoryToAccumulator(OpName, FirstByte, SecondByte) {
	const w = (SecondByte & 0b1);
	return `${OpName} ${ w == 0 ? 'AL' : 'AX' }, [{bytes}] ;2`;
}

function getAssemblyTemplate(OpcodeIndex) {
	const FirstByte = OpcodeIndex >> 8;
	const FirstSixBits = FirstByte >> 2;
	const FirstSevenBits = FirstByte >> 1;
	const SecondByte = (OpcodeIndex & 0b11111111);
	const SecondNibble = SecondByte >> 4;
	const SecondSevenBits = SecondByte >> 1;
	// Register/Memory to/from register
	// 100010,d,w		mod,reg,r/m 	disp-lo 	disp-hi
	if (FirstSixBits == 0b100010) {
		return registerMemoryToFromRegister("MOV", FirstByte, SecondByte);
	} 
	// Immediate to register/memory
	// 1100011,w 	mod,000,r/m 	data  data if w=1
	else if (FirstSevenBits == 0b1100011) {
		const reg = (SecondByte & 0b111000) >> 3;
		if (reg == 0) {
			return immediateToRegisterMemory("MOV", FirstByte, SecondByte);
		}
	} 
	// Immediate to register
	// 1011,w,reg 	data		data-1 if w=1
	else if (FirstByte == 0 && SecondNibble == 0b1011) {
		return immediateToRegister("MOV", FirstByte, SecondByte);
		/*
		const w = 0;
		const reg = 0b000;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
		*/
	} 
	// Memory to accumulator
	// 1010000,w 	addr-lo		addr-hi
	else if (FirstByte == 0 && SecondSevenBits == 0b1010000) {
		return memoryToAccumulator("MOV", FirstByte, SecondByte);
	} 
	// Accumulator to memory
	// 1010001,w  addr-lo   addr-hi
	else if (FirstByte == 0 && SecondSevenBits == 0b1010001) {
		return accumulatorToMemory("MOV", FirstByte, SecondByte)
	} 
	// Register/memory to segment register
	// 10001110 	mod,0,SR,r/m 	 disp-lo		disp-hi
	else if (FirstByte == 0b10001110 && ((SecondByte & 0b100000) >> 5) == 0) {
		return "NOT IMPLEMENTED";
	} 
	else if (FirstByte == 0b10001100 && ((SecondByte & 0b100000) >> 5) == 0) {
		return "NOT IMPLEMENTED";
	}
	return "";
}

