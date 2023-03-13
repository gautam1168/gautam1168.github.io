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
})

function getAssemblyTemplate(OpcodeIndex) {
	
	const FirstByte = OpcodeIndex >> 8;
	const SecondByte = (OpcodeIndex & 0b11111111);
	// Register/Memory to/from register
	// 100010,d,w		mod,reg,r/m 	disp-lo 	disp-hi
	if (FirstByte == 0b10001000) {
		const d = 0;
		const w = 0;
		const mod = (SecondByte >> 6);
		const reg = (SecondByte & 0b111000) >> 3;
		const rm = (SecondByte & 0b111);
		let result = "";
		if (mod == 3) {
			result = "MOV " + 
				" " + EffAddress[mod][w][rm] + ", " + regName[w][reg];
		} else {
			result = "MOV " + 
				" " + EffAddress[mod][rm] + ", " + regName[w][reg];
		}

		if (mod == 1) {
			result += " ;1";
		} else if (mod == 2) {
			result += " ;2";
		} else if (mod == 0 && rm == 0b110) {
			result += " ;1";
		} else {
			result += " ;0";
		}
		return result;
	} else if (FirstByte == 0b10001001) {
		const d = 0;
		const w = 1;
		const mod = (SecondByte >> 6);
		const reg = (SecondByte & 0b111000) >> 3;
		const rm = (SecondByte & 0b111);
		let result = "";
		if (mod == 3) {
			result = "MOV " + 
				" " + EffAddress[mod][w][rm] + ", " + regName[w][reg];
		} else {
			result = "MOV " + 
				" " + EffAddress[mod][rm] + ", " + regName[w][reg];
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
	} else if (FirstByte == 0b10001010) {
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
	} else if (FirstByte == 0b10001011) {
		const d = 1;
		const w = 1;
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
			result += " ;2";
		} else {
			result += " ;0";
		}
		return result;
	} 
	// Immediate to register/memory
	// 1100011,w 	mod,000,r/m 	data  data if w=1
	else if (FirstByte == 0b11000110) {
		const w = 0;
		const mod = (SecondByte >> 6);
		const reg = (SecondByte & 0b111000) >> 3;
		const rm = (SecondByte & 0b111);
		let result;
		if (reg == 0) {
			if (mod == 3) {
				result = "MOV " + 
					" " + EffAddress[mod][w][rm] + ", {bytes}";
			} else {
				result = "MOV " + 
					" " + EffAddress[mod][rm] + ", {bytes}";
			}

			if (mod == 1) {
				result += " ;1,1";
			} else if (mod == 2) {
				result += " ;2,1";
			}  else if (mod == 0 && rm == 0b110) {
				result += " ;2,1";
			} else {
				result += " ;1";
			}

			return result;
		}
	} else if (FirstByte == 0b11000111) {
		const w = 1;
		const mod = (SecondByte >> 6);
		const reg = (SecondByte & 0b111000) >> 3;
		const rm = (SecondByte & 0b111);
		if (reg == 0) {
			let result;
			if (mod == 3) {
				result = "MOV " + 
					" " + EffAddress[mod][w][rm] + ", {bytes}";
			} else {
				result = "MOV " + 
					" " + EffAddress[mod][rm] + ", {bytes}";
			}

			if (mod == 1) {
				result += " ;1,2";
			} else if (mod == 2) {
				result += " ;2,2";
			}  else if (mod == 0 && rm == 0b110) {
				result += " ;2,2";
			} else {
				result += " ;2";
			}
			return result;
		}
	}
	// Immediate to register
	// 1011,w,reg 	data		data-1 if w=1
	else if (FirstByte == 0 && SecondByte == 0b10110000) {
		const w = 0;
		const reg = 0b000;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
	} else if (FirstByte == 0 && SecondByte == 0b10110001) {
		const w = 0;
		const reg = 0b001;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
	} else if (FirstByte == 0 && SecondByte == 0b10110010) {
		const w = 0;
		const reg = 0b010;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
	} else if (FirstByte == 0 && SecondByte == 0b10110011) {
		const w = 0;
		const reg = 0b011;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
	} else if (FirstByte == 0 && SecondByte == 0b10110100) {
		const w = 0;
		const reg = 0b100;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
	} else if (FirstByte == 0 && SecondByte == 0b10110101) {
		const w = 0;
		const reg = 0b101;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
	} else if (FirstByte == 0 && SecondByte == 0b10110110) {
		const w = 0;
		const reg = 0b110;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
	} else if (FirstByte == 0 && SecondByte == 0b10110111) {
		const w = 0;
		const reg = 0b111;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
	} else if (FirstByte == 0 && SecondByte == 0b10111000) {
		const w = 1;
		const reg = 0b000;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
	} else if (FirstByte == 0 && SecondByte == 0b10111001) {
		const w = 1;
		const reg = 0b001;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
	} else if (FirstByte == 0 && SecondByte == 0b10111010) {
		const w = 1;
		const reg = 0b010;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
	} else if (FirstByte == 0 && SecondByte == 0b10111011) {
		const w = 1;
		const reg = 0b011;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
	} else if (FirstByte == 0 && SecondByte == 0b10111100) {
		const w = 1;
		const reg = 0b100;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
	} else if (FirstByte == 0 && SecondByte == 0b10111101) {
		const w = 1;
		const reg = 0b101;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
	} else if (FirstByte == 0 && SecondByte == 0b10111110) {
		const w = 1;
		const reg = 0b110;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
	} else if (FirstByte == 0 && SecondByte == 0b10111111) {
		const w = 1;
		const reg = 0b111;
		return "MOV " + regName[w][reg] + ", " + (w == 0 ? "{bytes} ;1" : "{bytes} ;2");
	}
	// Memory to accumulator
	// 1010000,w 	addr-lo		addr-hi
	else if (FirstByte == 0 && SecondByte == 0b10100000) {
		return "MOV AL, [{bytes}] ;2";
	} else if (FirstByte == 0 && SecondByte == 0b10100001) {
		return "MOV AX, [{bytes}] ;2";
	}
	// Accumulator to memory
	// 1010001,w  addr-lo   addr-hi
	else if (FirstByte == 0 && SecondByte == 0b10100010) {
		return "MOV [{bytes}], AL ;2";
	} else if (FirstByte == 0 && SecondByte == 0b10100011) {
		return "MOV [{bytes}], AX ;2";
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

