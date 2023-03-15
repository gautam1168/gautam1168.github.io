const fs = require("fs");

const data = "something to write";

// regName[w][reg]
const regName = [
	["AL", "CL", "DL", "BL", "AH", "CH", "DH", "BH"],
	["AX", "CX", "DX", "BX", "SP", "BP", "SI", "DI"],
];

const segRegName = [
	"ES", "CS", "SS", "DS"
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
		result += " ;2";
	} else {
		result += " ;0";
	}
	return result;
}

function immediateToRegisterMemoryMov(OpName, FirstByte, SecondByte) {
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

function immediateToRegisterMemoryArith(OpName, FirstByte, SecondByte) {
	const s = (FirstByte & 0b10) >> 1;
	const w = FirstByte & 0b1;
	const sw = s + '' + w;
	const mod = (SecondByte >> 6);
	const reg = (SecondByte & 0b111000) >> 3;
	const rm = (SecondByte & 0b111);
	let result;
	if (mod == 3) {
		result = OpName + 
			" " + EffAddress[mod][w][rm] + ", {bytes}";
	} else {
		result = OpName + 
			" " + EffAddress[mod][rm] + ", {bytes}";
	}

	if (mod == 1) {
		result += " ;1," + (sw == '01' ? 2 : 1);
	} else if (mod == 2) {
		result += " ;2," + (sw == '01' ? 2 : 1);
	}  else if (mod == 0 && rm == 0b110) {
		result += " ;2," + (sw == '01' ? 2 : 1);
	} else {
		result += " ;" + (sw == '01' ? 2 : 1);
	}

	return result;
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

function immediateToAccumulatorAdd(OpName, FirstByte, SecondByte) {
	const w = (SecondByte & 0b1);
	return `${OpName} ${ w == 0 ? 'AL' : 'AX' }, {bytes} ;${w == 0 ? 1 : 2}`
}

function opToRegisterMemory(OpName, FirstByte, SecondByte) {
	const mod = (SecondByte >> 6);
	const rm = (SecondByte & 0b111);

	let result;
	if (mod == 3) {
		result = OpName + 
			" " + EffAddress[mod][1][rm];
	} else {
		result = OpName + 
			" " + EffAddress[mod][rm];
	}

	if (mod == 1) {
		result += " ;1";
	} else if (mod == 2) {
		result += " ;2";
	}  else if (mod == 0 && rm == 0b110) {
		result += " ;2";
	} else {
		result += " ;0";
	}

	return result;
}

function opToRegister(OpName, FirstByte, SecondByte) {
	const reg = (SecondByte & 0b111);
	return `${OpName} ${regName[1][reg]} ;0`;
}

function opToSegment(OpName, FirstByte) {
	const reg = (FirstByte & 0b11000) >> 3;
	return `${OpName} ${segRegName[reg]} ;0`;
}

function getAssemblyTemplate(OpcodeIndex) {
	const FirstByte = OpcodeIndex >> 8;
	const FirstSixBits = FirstByte >> 2;
	const FirstSevenBits = FirstByte >> 1;
	const SecondByte = (OpcodeIndex & 0b11111111);
	const SecondNibble = SecondByte >> 4;
	const SecondSevenBits = SecondByte >> 1;

	 
	if (FirstByte == 0 && SecondByte == 0b01110101) {
		return `JNE {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b01110100) {
		return `JE {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b01111100) {
		return `JL {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b01111110) {
		return `JLE {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b01110010) {
		return `JB {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b01110110) {
		return `JBE {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b01111010) {
		return `JP {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b01110000) {
		return `JO {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b01111000) {
		return `JS {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b01111101) {
		return `JNL {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b01111111) {
		return `JG {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b01110011) {
		return `JNB {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b01110111) {
		return `JA {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b01111011) {
		return `JNP {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b01110001) {
		return `JNO {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b01111001) {
		return `JNS {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b11100010) {
		return `LOOP {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b11100001) {
		return `LOOPZ {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b11100000) {
		return `LOOPNZ {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b11100011) {
		return `JCXZ {bytes} ;1`;
	}
	// Memory to accumulator
	// 1010000,w 	addr-lo		addr-hi
	else if (FirstByte == 0 && SecondSevenBits == 0b1010000) {
		return memoryToAccumulator("MOV", FirstByte, SecondByte);
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
	// Accumulator to memory
	// 1010001,w  addr-lo   addr-hi
	else if (FirstByte == 0 && SecondSevenBits == 0b1010001) {
		return accumulatorToMemory("MOV", FirstByte, SecondByte)
	} 
	// Immediate to register/memory
	// 1100011,w 	mod,000,r/m disp-lo disp-hi	data  data if w=1
	else if (FirstSevenBits == 0b1100011) {
		const reg = (SecondByte & 0b111000) >> 3;
		if (reg == 0) {
			return immediateToRegisterMemoryMov("MOV", FirstByte, SecondByte);
		}
	}
	// Register/memory to segment register
	// 10001110 	mod,0,SR,r/m 	 disp-lo		disp-hi
	else if (FirstByte == 0b10001110 && ((SecondByte & 0b100000) >> 5) == 0) {
		return "NOT IMPLEMENTED";
	} 
	else if (FirstByte == 0b10001100 && ((SecondByte & 0b100000) >> 5) == 0) {
		return "NOT IMPLEMENTED";
	} 
	// Register/Memory to/from register
	// 100010,d,w		mod,reg,r/m 	disp-lo 	disp-hi
	else if (FirstSixBits == 0b100010) {
		return registerMemoryToFromRegister("MOV", FirstByte, SecondByte);
	} 
	// Add register to from memory
	// 100000,s,w  	mod,reg,rm 	disp-lo   disp-hi 	data 	dataifw=1
	else if (FirstSixBits == 0b100000) {
		const reg = (SecondByte & 0b111000) >> 3;
		if (reg == 0) {
			return immediateToRegisterMemoryArith("ADD", FirstByte, SecondByte);	
		} else if (reg == 0b101) {
			return immediateToRegisterMemoryArith("SUB", FirstByte, SecondByte);
		} else if (reg == 0b111) {
			return immediateToRegisterMemoryArith("CMP", FirstByte, SecondByte);
		}
	}
	// Add immediate to accumulator
	// 0000010,w 	data 	dataifw=1 
	else if (FirstByte == 0 && SecondSevenBits == 0b10) {
		return immediateToAccumulatorAdd("ADD", FirstByte, SecondByte);
	} else if (FirstByte == 0 && SecondSevenBits == 0b0010110) {
		return immediateToAccumulatorAdd("SUB", FirstByte, SecondByte);
	} else if (FirstByte == 0 && SecondSevenBits == 0b0011110) {
		return immediateToAccumulatorAdd("CMP", FirstByte, SecondByte);
	}

	else if (FirstByte == 0 && (SecondByte >> 3) == 0b01010) {
		return opToRegister("PUSH", FirstByte, SecondByte);
	}
	else if (FirstByte == 0 && (SecondByte >> 3) == 0b01011) {
		return opToRegister("POP", FirstByte, SecondByte);
	}
	else if ((FirstByte == 0) && 
		((SecondByte & 0b11100000) == 0) && 
		((SecondByte & 0b111) == 0b110)) {
		return opToSegment("PUSH", SecondByte);
	}
	else if ((FirstByte == 0) && 
		((SecondByte & 0b11100000) == 0) && 
		((SecondByte & 0b111) == 0b111)) {
		return opToSegment("POP", SecondByte);
	}
	// 11111111, 	mod,110,r/m		disp-lo 	disp-hi
	else if (FirstByte == 0b11111111) {
		const reg = (SecondByte & 0b111000) >> 3;
		if (reg == 0b110) {
			return opToRegisterMemory("PUSH", FirstByte, SecondByte);
		}
	}
	else if (FirstByte == 0b10001111) {
		const reg = (SecondByte & 0b111000) >> 3;
		if (reg == 0) {
			return opToRegisterMemory("POP", FirstByte, SecondByte);
		}
	}

	// 001110,d,w  	mod,reg,rm	disp-lo		disp-hi
	else if (FirstSixBits == 0b001110) {
		return registerMemoryToFromRegister("CMP", FirstByte, SecondByte);
	}
	// 001010,d,w 	mod,reg,rm 	disp-lo 	disp-hi
	else if (FirstSixBits == 0b001010) {
		return registerMemoryToFromRegister("SUB", FirstByte, SecondByte);
	}
	// Add  
	// 000000,d,w 	mod,reg,rm 	disp-lo 	disp-hi
	else if (FirstSixBits == 0) {
		return registerMemoryToFromRegister("ADD", FirstByte, SecondByte);
	}
	
	
	return "";
}

