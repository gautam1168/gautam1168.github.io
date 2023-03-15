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
	
	// const testresult = getAssemblyTemplate(0b1000011000000000);

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

function loadVariant(OpName, SecondByte) {
	const mod = (SecondByte >> 6);
	const reg = (SecondByte & 0b111000) >> 3;
	const rm = (SecondByte & 0b111);
	let result = "";
	if (mod == 3) {
		result = OpName + 
			" " + regName[1][reg] + ", " + EffAddress[mod][1][rm];
	} else {
		result = OpName + 
			" " + regName[1][reg] + ", " + EffAddress[mod][rm];
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

function incVariant(OpName, FirstByte, SecondByte) {
	const w = FirstByte & 0b1;
	const mod = (SecondByte >> 6);
	const rm = (SecondByte & 0b111);
	
	let result = "";
	if (mod == 3) {
		result = OpName + " " + EffAddress[mod][w][rm];
	} else {
		result = OpName + " " + EffAddress[mod][rm];
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

function shlVariant(OpName, FirstByte, SecondByte) {
	const v = (FirstByte & 0b10) >> 1;
	const w = (FirstByte & 0b1);
	const mod = (SecondByte >> 6);
	const rm = (SecondByte & 0b111);

	let result;
	const source = v == 0 ? 1 : 'CL';
	if (mod == 3) {
		result = `${OpName} ${EffAddress[mod][w][rm]}, ${source}`;
	} else {
		result = `${OpName} ${EffAddress[mod][rm]}, ${source}`;
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

function repInstruction(FirstByte, SecondByte) {
	const SecondSevenBits = SecondByte >> 1;
	const w = SecondByte & 0b1;

	if (SecondSevenBits == 0b1010010) {
		return `REP MOVS${w == 0 ? 'B' : 'W'} ;0`;
	} else if (SecondSevenBits == 0b1010011) {
		return `REP CMPS${w == 0 ? 'B' : 'W'} ;0`;
	} else if (SecondSevenBits == 0b1010111) {
		return `REP SCAS${w == 0 ? 'B' : 'W'} ;0`;
	} else if (SecondSevenBits == 0b1010110) {
		return `REP LODS${w == 0 ? 'B' : 'W'} ;0`;
	} else if (SecondSevenBits == 0b1010101) {
		return `REP STOS${w == 0 ? 'B' : 'W'} ;0`;
	}
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
	} else if (FirstByte == 0 && SecondByte == 0b11010111) {
		return `XLAT ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b10011111) {
		return `LAHF ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b10011110) {
		return `LAHF ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b10011100) {
		return `PUSHF ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b10011101) {
		return `POPF ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b00110111) {
		return `AAA ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b00100111) {
		return `DAA ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b00111111) {
		return `AAS ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b00101111) {
		return `DAS ;0`;
	} else if (FirstByte == 0b11010100 && SecondByte == 0b00001010) {
		return `AAM ;0`;
	} else if (FirstByte == 0b11010101 && SecondByte == 0b00001010) {
		return `AAD ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b10011000) {
		return `CBW ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b10011001) {
		return `CWD ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b11000011) {
		return `RET ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b11001101) {
		return `INT {bytes} ;1`;
	} else if (FirstByte == 0 && SecondByte == 0b11001110) {
		return `INTO ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b11001111) { 
		return `IRET ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b11111000) {
		return `CLC ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b11110101) {
		return `CMC ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b11111001) {
		return `STC ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b11111100) {
		return `CLD ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b11111101) {
		return `STD ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b11111010) {
		return `CLI ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b11111011) {
		return `STI ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b11110100) {
		return `HLT ;0`;
	} else if (FirstByte == 0 && SecondByte == 0b10011011) {
		return `WAIT ;0`;
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
	} else if (FirstSevenBits == 0b1000000) {
		const reg = (SecondByte & 0b111000) >> 3;
		if (reg == 0b100) {
			return immediateToRegisterMemoryMov("AND", FirstByte, SecondByte);
		} else if (reg == 0b001) {
			return immediateToRegisterMemoryMov("OR", FirstByte, SecondByte);
		}
	} else if (FirstSevenBits == 0b1111011) {
		const reg = (SecondByte & 0b111000) >> 3;
		if (reg == 0) {
			return immediateToRegisterMemoryMov("TEST", FirstByte, SecondByte);
		}
	} else if (FirstSevenBits == 0b0011010) {
		const reg = (SecondByte & 0b111000) >> 3;
		if (reg == 0b110) {
			return immediateToRegisterMemoryMov("XOR", FirstByte, SecondByte);
		}
	}
	else if (FirstByte == 0b11110011) {
		return repInstruction(FirstByte, SecondByte);
	}
	// Register/memory to segment register
	// 10001110 	mod,0,SR,r/m 	 disp-lo		disp-hi
	else if (FirstByte == 0b10001110 && ((SecondByte & 0b100000) >> 5) == 0) {
		return "NOT IMPLEMENTED";
	} 
	else if (FirstByte == 0b10001100 && ((SecondByte & 0b100000) >> 5) == 0) {
		return "NOT IMPLEMENTED";
	} 
	else if (FirstSevenBits == 0b1000011) {
		return registerMemoryToFromRegister("XCHG", FirstByte, SecondByte);
	}
	// 11111111, 	mod,110,r/m		disp-lo 	disp-hi
	else if (FirstByte == 0b11111111) {
		const reg = (SecondByte & 0b111000) >> 3;
		if (reg == 0b110) {
			return opToRegisterMemory("PUSH", FirstByte, SecondByte);
		} else if (reg == 0b010) {
			return incVariant("CALL", FirstByte, SecondByte);
		} else if (reg == 0b011) {
			return incVariant("CALL", FirstByte, SecondByte);
		} else if (reg == 0b100) {
			return incVariant("JMP", FirstByte, SecondByte);
		} else if (reg == 0b101) {
			return incVariant("JMP", FirstByte, SecondByte);
		}
	}
	else if (FirstByte == 0 && SecondByte == 0b11000010) {
		return `RET {bytes} ;2`;
	}
	else if (FirstSevenBits == 0b1111111) {
		const reg = (SecondByte & 0b111000) >> 3;
		if (reg == 0) {
			return incVariant("INC", FirstByte, SecondByte);
		} else if (reg == 0b001) {
			return incVariant("DEC", FirstByte, SecondByte);
		} 	
	}
	else if (FirstSevenBits == 0b1111011) {
		const reg = (SecondByte & 0b111000) >> 3;
		if (reg == 0b011) {
			return incVariant("NEG", FirstByte, SecondByte);
		} else if (reg == 0b100) {
			return incVariant("MUL", FirstByte, SecondByte);
		} else if (reg == 0b101) {
			return incVariant("IMUL", FirstByte, SecondByte);
		} else if (reg == 0b110) {
			return incVariant("DIV", FirstByte, SecondByte);
		} else if (reg == 0b111) {
			return incVariant("IDIV", FirstByte, SecondByte);
		} else if (reg == 0b010) {
			return incVariant("NOT", FirstByte, SecondByte);
		}
	}
	// Register/Memory to/from register
	// 100010,d,w		mod,reg,r/m 	disp-lo 	disp-hi
	else if (FirstSixBits == 0b100010) {
		return registerMemoryToFromRegister("MOV", FirstByte, SecondByte);
	} 
	// load ea to register
	// 10001101 	mod,reg,r/m 	disp-lo 	disp-hi
	else if (FirstByte == 0b10001101) {
		return loadVariant("LEA", SecondByte);
	} else if (FirstByte == 0b11000101) {
		return loadVariant("LDS", SecondByte);
	} else if (FirstByte == 0b11000100) {
		return loadVariant("LES", SecondByte);
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
		} else if (reg == 0b010) {
			return immediateToRegisterMemoryArith("ADC", FirstByte, SecondByte);
		} else if (reg == 0b011) {
			return immediateToRegisterMemoryArith("SBB", FirstByte, SecondByte);
		}
	}
	// shl variant
	// 110100,v,w 	mod,100,r/m 	disp-lo		disp-hi
	else if (FirstSixBits == 0b110100) {
		const reg = (SecondByte & 0b111000) >> 3;
		if (reg == 0b100) {
			return shlVariant("SHL", FirstByte, SecondByte);
		} else if (reg == 0b101) {
			return shlVariant("SHR", FirstByte, SecondByte);
		} else if (reg == 0b111) {
			return shlVariant("SAR", FirstByte, SecondByte);
		} else if (reg == 0) {
			return shlVariant("ROL", FirstByte, SecondByte);
		} else if (reg == 0b001) {
			return shlVariant("ROR", FirstByte, SecondByte);
		} else if (reg == 0b010) {
			return shlVariant("RCL", FirstByte, SecondByte);
		} else if (reg == 0b011) {
			return shlVariant("RCR", FirstByte, SecondByte);
		}
	}
	// Xchange register with accumulator
	else if (FirstByte == 0 && ((SecondByte >> 3) == 0b10010)) {
		const reg = (SecondByte & 0b111);
		return `XCHG AX, ${regName[1][reg]} ;0`;
	}
	else if (FirstByte == 0 && ((SecondByte >> 3) == 0b01000)) {
		const reg = (SecondByte & 0b111);
		return `INC ${regName[1][reg]} ;0`;
	}
	else if (FirstByte == 0 && ((SecondByte >> 3) == 0b01001)) {
		const reg = (SecondByte & 0b111);
		return `DEC ${regName[1][reg]} ;0`;
	}
	// Add immediate to accumulator
	// 0000010,w 	data 	dataifw=1 
	else if (FirstByte == 0 && SecondSevenBits == 0b10) {
		return immediateToAccumulatorAdd("ADD", FirstByte, SecondByte);
	} else if (FirstByte == 0 && SecondSevenBits == 0b0010110) {
		return immediateToAccumulatorAdd("SUB", FirstByte, SecondByte);
	} else if (FirstByte == 0 && SecondSevenBits == 0b0011110) {
		return immediateToAccumulatorAdd("CMP", FirstByte, SecondByte);
	} else if (FirstByte == 0 && SecondSevenBits == 0b0001010) {
		return immediateToAccumulatorAdd("ADC", FirstByte, SecondByte);
	} else if (FirstByte == 0 && SecondSevenBits == 0b0001110) {
		return immediateToAccumulatorAdd("SBB", FirstByte, SecondByte);
	} else if (FirstByte == 0 && SecondSevenBits == 0b0010010) {
		return immediateToAccumulatorAdd("AND", FirstByte, SecondByte);
	} else if (FirstByte == 0 && SecondSevenBits == 0b1010100) {
		return immediateToAccumulatorAdd("TEST", FirstByte, SecondByte);
	} else if (FirstByte == 0 && SecondSevenBits == 0b0000110) {
		return immediateToAccumulatorAdd("OR", FirstByte, SecondByte);
	} else if (FirstByte == 0 && SecondSevenBits == 0b0011010) {
		return immediateToAccumulatorAdd("XOR", FirstByte, SecondByte);
	} else if (FirstByte == 0 && SecondSevenBits == 0b1110010) {
		const w = SecondByte & 0b1;
		return `IN ${w == 0 ? 'AL' : 'AX'}, {bytes} ;-1`;
	} else if (FirstByte == 0 && SecondSevenBits == 0b1110011) {
		const w = SecondByte & 0b1;
		return `OUT {bytes}, ${w == 0 ? 'AL' : 'AX'} ;-1`;
	} else if (FirstByte == 0 && SecondSevenBits == 0b1110110) {
		const w = SecondByte & 0b1;
		return `IN ${w == 0 ? 'AL' : 'AX'}, DX ;0`;
	} else if (FirstByte == 0 && SecondSevenBits == 0b1110111) {
		const w = SecondByte & 0b1;
		return `OUT DX, ${w == 0 ? 'AL' : 'AX'} ;0`;
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
	// 000110,d,w 	mode,reg,rm 	disp-lo 	disp-hi
	else if (FirstSixBits == 0b000110) {
		return registerMemoryToFromRegister("SBB", FirstByte, SecondByte);
	}
	// 001010,d,w 	mod,reg,rm 	disp-lo 	disp-hi
	else if (FirstSixBits == 0b001010) {
		return registerMemoryToFromRegister("SUB", FirstByte, SecondByte);
	}
	// 000100,d,w 	mod,reg,rm disp-lo		disp-hi
	else if (FirstSixBits == 0b000100) {
		return registerMemoryToFromRegister("ADC", FirstByte, SecondByte);
	}
	// 001000,d,w 	mod,reg,rm 	disp-lo 	disp-hi
	else if (FirstSixBits == 0b001000) {
		return registerMemoryToFromRegister("AND", FirstByte, SecondByte);
	}
	// 000100,d,w 	mod,reg,rm 	disp-lo 	disp-hi
	else if (FirstSixBits == 0b000100) {
		return registerMemoryToFromRegister("TEST", FirstByte, SecondByte);
	}
	// 000010,d,w 	mod,reg,rm 	disp-lo		disp-hi
	else if (FirstSixBits == 0b000010) {
		return registerMemoryToFromRegister("OR", FirstByte, SecondByte);
	}
	// 001100,d,w 	mod,reg,rm 	disp-lo 	disp-hi
	else if (FirstSixBits == 0b001100) {
		return registerMemoryToFromRegister("XOR", FirstByte, SecondByte);
	}
	// Add  
	// 000000,d,w 	mod,reg,rm 	disp-lo 	disp-hi
	else if (FirstSixBits == 0) {
		return registerMemoryToFromRegister("ADD", FirstByte, SecondByte);
	}
	
	
	return "";
}

