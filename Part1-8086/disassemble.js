const InstructionBitPatterns = {
	'100010': 'MOV',
};

// Register names for REG encoding when W is 0 or 1
const Registers = {
	'0': {
		'000': 'AL',
		'001': 'CL',
		'010': 'DL',
		'011': 'BL',
		'100': 'AH',
		'101': 'CH',
		'110': 'DH',
		'111': 'BH'
	},
	'1': {
		'000': 'AX',
		'001': 'CX',
		'010': 'DX',
		'011': 'BX',
		'100': 'SP',
		'101': 'BP',
		'110': 'SI',
		'111': 'DI'
	}
};

const r8 = {
	'000': 'AL',
	'001': 'CL',
	'010': 'DL',
	'011': 'BL',
	'100': 'AH',
	'101': 'CH',
	'110': 'DH',
	'111': 'BH'
};

const r16 = {
	'000': 'AX',
	'001': 'CX',
	'010': 'DX',
	'011': 'BX',
	'100': 'SP',
	'101': 'BP',
	'110': 'SI',
	'111': 'DI'
};

const readByte = ['immed8', null, 0];
const readWord = [['datalo', null, 0], ['datahi', null, 0]];
const regSourceByte = ['a', r8, 0, 'b', r8, 3];
const regDestByte = ['a', r8, 3, 'b', r8, 0];
const regSourceWord = ['a', r16, 0, 'b', r16, 3];
const regDestWord = ['a', r16, 3, 'b', r16, 0];
const segRegSourceWord = [];
const segRegDestWord = [];


// Table 4-13 from https://edge.edx.org/c4x/BITSPilani/EEE231/asset/8086_family_Users_Manual_1_.pdf
const MachineInstructionDecodingGuide = [
	[[0x00, 'ADD {a}, {b}'], regSourceByte],
	[[0x01, 'ADD {a}, {b}'], regSourceWord],
	[[0x02, 'ADD {a}, {b}'], regDestByte],
	[[0x03, 'ADD {a}, {b}'], regDestWord],
	[[0x04, 'ADD AL, {immed8}'], readByte],
	[[0x05, 'ADD AX, {datahi}{datalo}'], ...readWord],
	[[0x06, 'PUSH ES']],
	[[0x07, 'POP ES']],
	[[0x08, 'OR {a}, {b}'], regSourceByte],
	[[0x09, 'OR {a}, {b}'], regSourceWord],
	[[0x0a, 'OR {a}, {b}'], regDestByte],
	[[0x0b, 'OR {a}, {b}'], regDestWord],
	[[0x0c, 'OR AL, {immed8}'], readByte],
	[[0x0d, 'OR AX, {datahi}{datalo}'], ...readWord],
	[[0x0e, 'PUSH CS']],
	[[0x0f, '']],

	[[0x10, 'ADC {a}, {b}'], regSourceByte],
	[[0x11, 'ADC {a}, {b}'], regSourceWord],
	[[0x12, 'ADC {a}, {b}'], regDestByte],
	[[0x13, 'ADC {a}, {b}'], regDestWord],
	[[0x14, 'ADC AL, {immed8}'], readByte],
	[[0x15, 'ADC AL, {datahi}{datalo}'], ...readWord],
	[[0x16, 'PUSH SS']],
	[[0x17, 'POP SS']],
	[[0x18, 'SBB {a}, {b}'], regSourceByte],
	[[0x19, 'SBB {a}, {b}'], regSourceWord],
	[[0x1a, 'SBB {a}, {b}'], regDestByte],
	[[0x1b, 'SBB {a}, {b}'], regSourceWord],
	[[0x1c, 'SBB AL, {immed8}'], readByte],
	[[0x1d, 'SBB AX, {datahi}{datalo}'], ...readWord],
	[[0x1e, 'PUSH DS']],
	[[0x1f, 'POP DS']],

	[[0x20, 'AND {a}, {b}'], regSourceByte],
	[[0x21, 'AND {a}, {b}'], regSourceWord],
	[[0x22, 'AND {a}, {b}'], regDestByte],
	[[0x23, 'AND {a}, {b}'], regSourceWord],
	[[0x24, 'AND AL, {immed8}'], readByte],
	[[0x25, 'AND AX, {datahi}{datalo}'], ...readWord],
	[[0x26, 'ES:']],
	[[0x27, 'DAA']],
	[[0x28, 'SUB {a}, {b}'], regSourceByte],
	[[0x29, 'SUB {a}, {b}'], regSourceWord],
	[[0x2a, 'SUB {a}, {b}'], regDestByte],
	[[0x2b, 'SUB {a}, {b}'], regSourceWord],
	[[0x2c, 'SUB AL, {immed8}'], readByte],
	[[0x2d, 'SUB AX, {datahi}{datalo}'], ...readWord],
	[[0x2e, 'CS:']],
	[[0x2f, 'DAS']],

	[[0x30, 'XOR {a}, {b}'], regSourceByte],
	[[0x31, 'XOR {a}, {b}'], regSourceWord],
	[[0x32, 'XOR {a}, {b}'], regDestByte],
	[[0x33, 'XOR {a}, {b}'], regSourceWord],
	[[0x34, 'XOR AL, {immed8}'], readByte],
	[[0x35, 'XOR AX, {datahi}{datalo}'], ...readWord],
	[[0x36, 'SS:']],
	[[0x37, 'AAA']],
	[[0x38, 'CMP {a}, {b}'], regSourceByte],
	[[0x39, 'CMP {a}, {b}'], regSourceWord],
	[[0x3a, 'CMP {a}, {b}'], regDestByte],
	[[0x3b, 'CMP {a}, {b}'], regSourceWord],
	[[0x3c, 'CMP AL, {immed8}'], readByte],
	[[0x3d, 'CMP AX, {datahi}{datalo}'], ...readWord],
	[[0x3e, 'DS:']],
	[[0x3f, 'AAS']],

	[[0x40, 'INC AX']],
	[[0x41, 'INC CX']],
	[[0x42, 'INC DX']],
	[[0x43, 'INC BX']],
	[[0x44, 'INC SP']],
	[[0x45, 'INC BP']],
	[[0x46, 'INC SI']],
	[[0x47, 'INC DI']],
	[[0x48, 'DEC AX']],
	[[0x49, 'DEC CX']],
	[[0x4a, 'DEC DX']],
	[[0x4b, 'DEC BX']],
	[[0x4c, 'DEC SP']],
	[[0x4d, 'DEC BP']],
	[[0x4e, 'DEC SI']],
	[[0x4f, 'DEC DI']],

	[[0x50, 'PUSH AX']],
	[[0x51, 'PUSH CX']],
	[[0x52, 'PUSH DX']],
	[[0x53, 'PUSH BX']],
	[[0x54, 'PUSH SP']],
	[[0x55, 'PUSH BP']],
	[[0x56, 'PUSH SI']],
	[[0x57, 'PUSH DI']],
	[[0x58, 'POP AX']],
	[[0x59, 'POP CX']],
	[[0x5a, 'POP DX']],
	[[0x5b, 'POP BX']],
	[[0x5c, 'POP SP']],
	[[0x5d, 'POP BP']],
	[[0x5e, 'POP SI']],
	[[0x5f, 'POP DI']],

	[[0x60, '']],
	[[0x61, '']],
	[[0x62, '']],
	[[0x63, '']],
	[[0x64, '']],
	[[0x65, '']],
	[[0x66, '']],
	[[0x67, '']],
	[[0x68, '']],
	[[0x69, '']],
	[[0x6a, '']],
	[[0x6b, '']],
	[[0x6c, '']],
	[[0x6d, '']],
	[[0x6e, '']],
	[[0x6f, '']],

	[[0x70, 'JO {shortlabel}']],
	[[0x71, 'JNO {shortlabel}']],
	[[0x72, 'JB/JNAE/JC {shortlabel}']],
	[[0x73, 'JNB/JAE/JNC {shortlabel}']],
	[[0x74, 'JE/JZ {shortlabel}']],
	[[0x75, 'JNE/JNZ {shortlabel}']],
	[[0x76, 'JBE/JNA {shortlabel}']],
	[[0x77, 'JNBE/JA {shortlabel}']],
	[[0x78, 'JS {shortlabel}']],
	[[0x79, 'JNS {shortlabel}']],
	[[0x7a, 'JP/JPE {shortlabel}']],
	[[0x7b, 'JNP/JPO {shortlabel}']],
	[[0x7c, 'JL/JNGE {shortlabel}']],
	[[0x7d, 'JNL/JGE {shortlabel}']],
	[[0x7e, 'JLE/JNG {shortlabel}']],
	[[0x7f, 'JNLE/JG {shortlabel}']],

	[[0x80], {
		extract: 0b00111000,
		'000': ['ADD {a}, {immed8}', ['a', r8, 0b00111000], ['immed8', null, 0b11111111]],
		'001': ['OR {a}, {immed8}', ['a', r8, 0b00111000], ['immed8', null, 0b11111111]],
		'010': ['ADC {a}, {immed8}', ['a', r8, 0b00111000], ['immed8', null, 0b11111111]],
		'011': ['SBB {a}, {immed8}', ['a', r8, 0b00111000], ['immed8', null, 0b11111111]],
		'100': ['AND {a}, {immed8}', ['a', r8, 0b00111000], ['immed8', null, 0b11111111]],
		'101': ['SUM {a}, {immed8}', ['a', r8, 0b00111000], ['immed8', null, 0b11111111]],
		'110': ['SUB {a}, {immed8}', ['a', r8, 0b00111000], ['immed8', null, 0b11111111]],
		'111': ['XOR {a}, {immed8}', ['a', r8, 0b00111000], ['immed8', null, 0b11111111]],
	}],
	[[0x81], {
		extract: 0b00111000,
		'000': ['ADD {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['immed8', null, 0b11111111]],
		'001': ['OR {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'010': ['ADC {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'011': ['SBB {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'100': ['AND {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'101': ['SUM {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'110': ['SUB {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'111': ['XOR {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
	}],
	[[0x82], {
		extract: 0b00111000,
		'000': ['ADD {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['immed8', null, 0b11111111]],
		'001': ['OR {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'010': ['ADC {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'011': ['SBB {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'100': ['AND {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'101': ['SUM {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'110': ['SUB {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'111': ['XOR {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
	}],
	[[0x83], {
		extract: 0b00111000,
		'000': ['ADD {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['immed8', null, 0b11111111]],
		'001': ['OR {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'010': ['ADC {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'011': ['SBB {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'100': ['AND {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'101': ['SUM {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'110': ['SUB {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'111': ['XOR {a}, {datahi}|{datalo}', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
	}],
	[[0x84, 'TEST {a} {b}'], regSourceByte],
	[[0x85, 'TEST {a} {b}'], regSourceWord],
	[[0x86, 'XCHG {a} {b}'], regDestByte],
	[[0x87, 'XCHG {a} {b}'], regDestWord],
	[[0x88, 'MOV {a} {b}'], regSourceByte],
	[[0x89, 'MOV {a} {b}'], regSourceWord],
	[[0x8a, 'MOV {a} {b}'], regDestByte],
	[[0x8b, 'MOV {a} {b}'], regDestWord],
	[[0x8c, 'MOV {a} {b}'], segRegSourceWord],
	[[0x8d, 'LEA {a} {b}'], regSourceWord],
	[[0x8e, 'LEA {a} {b}'], segRegDestWord],
	[[0x8f, 'POP {a}'], ['a', r8, 0b00111000]],

	[[0x90, 'NOP']],
	[[0x91, 'XCHG AX, CX']],
	[[0x92, 'XCHG AX, DX']],
	[[0x93, 'XCHG AX, BX']],
	[[0x94, 'XCHG AX, SP']],
	[[0x95, 'XCHG AX, BP']],
	[[0x96, 'XCHG AX, SI']],
	[[0x97, 'XCHG AX, DI']],
	[[0x98, 'CBW']],
	[[0x99, 'CWD']],
	[[0x9a, 'CALL FAR_PROC']],
	[[0x9b, 'WAIT']],
	[[0x9c, 'PUSHF']],
	[[0x9d, 'POPF']],
	[[0x9e, 'SAHF']],
	[[0x9f, 'LAHF']],

	[[0xa0, 'MOV AL, {mem8}']],
	[[0xa1, 'MOV AX, {mem16}']],
	[[0xa2, 'MOV {mem8}, AL']],
	[[0xa3, 'MOV {mem16}, AL']],
	[[0xa4, 'MOVS DEST-STR8, SRC-STR8']],
	[[0xa5, 'MOVS DEST-STR16, SRC-STR16']],
	[[0xa6, 'CMPS DEST-STR8, SRC-STR8']],
	[[0xa7, 'CMPS DEST-STR16, SRC-STR16']],
	[[0xa8, 'TEST AL, {immed8}']],
	[[0xa9, 'TEST AX, {immed16}']],
	[[0xaa, 'STOS DEST-STR8']],
	[[0xab, 'STOS DEST-STR16']],
	[[0xac, 'LODS SRC-STR8']],
	[[0xad, 'LODS SRC-STR16']],
	[[0xae, 'SCAS DEST-STR8']],
	[[0xaf, 'SCAS DEST-STR16']],

	[[0xb0, 'MOV AL, {immed8}']],
	[[0xb1, 'MOV CL, {immed8}']],
	[[0xb2, 'MOV DL, {immed8}']],
	[[0xb3, 'MOV BL, {immed8}']],
	[[0xb4, 'MOV AH, {immed8}']],
	[[0xb5, 'MOV CH, {immed8}']],
	[[0xb6, 'MOV DH, {immed8}']],
	[[0xb7, 'MOV BH, {immed8}']],
	[[0xb8, 'MOV AX, {immed16}']],
	[[0xb9, 'MOV CX, {immed16}']],
	[[0xba, 'MOV DX, {immed16}']],
	[[0xbb, 'MOV BX, {immed16}']],
	[[0xbc, 'MOV SP, {immed16}']],
	[[0xbd, 'MOV BP, {immed16}']],
	[[0xbe, 'MOV SI, {immed16}']],
	[[0xbf, 'MOV DI, {immed16}']],

	[[0xc0, '']],
	[[0xc1, '']],
	[[0xc2, 'RET {immed16}']],
	[[0xc3, 'RET']],
	[[0xc4, 'LES {a}, {b}']],
	[[0xc5, 'LDS {a}, {b}']],
	[[0xc6, 'MOV {a}, {b}']],
	[[0xc7, 'MOV {a}, {b}']],
	[[0xc8, '']],
	[[0xc9, '']],
	[[0xca, 'RET {immed16}']],
	[[0xcb, 'RET']],
	[[0xcc, 'INT 3']],
	[[0xcd, 'INT {immed8}']],
	[[0xce, 'INTO']],
	[[0xcf, 'IRET']],

	[[0xd0, '']],
	[[0xd1], {
		extract: 0b00111000,
		'101': ['SHR {a}, 1', ['a', r8, 0b00111000], ['immed8', null, 0b11111111]],
		'110': ['', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'111': ['SAR {a}, 1', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]]
	}],
	[[0xd2], {
		extract: 0b00111000,
		'000': ['ROL {a}, CL', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'001': ['ROR {a}, CL', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'010': ['RCL {a}, CL', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'011': ['RCR {a}, CL', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'100': ['SAL/SHL {a}, CL', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'101': ['SHR {a}, CL', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'110': ['', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'111': ['SHR {a}, CL', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
	}],
	[[0xd3], {
		extract: 0b00111000,
		'000': ['ROL {a}, CL', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'001': ['ROR {a}, CL', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'010': ['RCL {a}, CL', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'011': ['RCR {a}, CL', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'100': ['SAL/SHL {a}, CL', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'101': ['SHR {a}, CL', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'110': ['', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
		'111': ['SAR {a}, CL', ['a', r8, 0b00111000], ['datalo', null, 0b11111111], ['datahi', null, 0b11111111]],
	}],
	[[0xd4], {
		extract: 0b11111111,
		'00001010': ['AAM'],
	}],
	[[0xd5], {
		extract: 0b11111111,
		'00001010': ['AAD'],
	}],
	[[0xd6, '']],
	[[0xd7, 'XLAT SOURCE-TABLE']],
	[[0xd8, '']],
	[[0xd9, '']],
	[[0xda, '']],
	[[0xdb, '']],
	[[0xdc, '']],
	[[0xdd, '']],
	[[0xde, '']],
	[[0xdf, '']],

	[[0xe0, 'LOOPNE/LOOPZ SHORT-LABEL']],
	[[0xe1, 'LOOPE/LOOPZ SHORT-LABEL']],
	[[0xe2, 'LOOP SHORT-LABEL']],
	[[0xe3, 'JCXZ SHORT-LABEL']],
	[[0xe4, 'IN AL, {immed8}']],
	[[0xe5, 'IN AX, {immed8}']],
	[[0xe6, 'OUT AL, {immed8}']],
	[[0xe7, 'OUT AX, {immed8}']],
	[[0xe8, 'CALL NEAR-PROC']],
	[[0xe9, 'JMP NEAR-LABEL']],
	[[0xea, 'JMP FAR-LABEL']],
	[[0xeb, 'JMP SHORT-LABEL']],
	[[0xec, 'IN AL, DX']],
	[[0xed, 'IN AX, DX']],
	[[0xee, 'OUT AL, DX']],
	[[0xef, 'OUT AX, DX']],

	[[0xf0, 'LOCK (prefix)']],
	[[0xf1, '']],
	[[0xf2, 'REPNE/REPNZ']],
	[[0xf3, 'REP/REPE/REPZ']],
	[[0xf4, 'HLT']],
	[[0xf5, 'CMC']],
	[[0xf6], {
		extract: 0b00111000,
		'000': ['TEST {a}, {b}'],
		'001': [''],
		'010': ['NOT {a}'],
		'011': ['NEG {a}'],
		'100': ['MUL {a}'],
		'101': ['IMUL {a}'],
		'110': ['DIV {a}'],
		'111': ['IDIV {a}'],
	}],
	[[0xf7], {
		extract: 0b00111000,
		'000': ['TEST {a}, {immed16}'],
		'001': [''],
		'010': ['NOT {a}'],
		'011': ['NEG {a}'],
		'100': ['MUL {a}'],
		'101': ['IMUL {a}'],
		'110': ['DIV {a}'],
		'111': ['IDIV {a}'],
	}],
	[[0xf8, 'CLC']],
	[[0xf9, 'STC']],
	[[0xfa, 'CLI']],
	[[0xfb, 'STI']],
	[[0xfc, 'CLD']],
	[[0xfd, 'STD']],
	[[0xfe], {
		extract: 0b00111000,
		'000': ['INC {a}'],
		'001': ['DEC {a}']
	}],
	[[0xff], {
		extract: 0b00111000,
		'000': ['INC {a}'],
		'001': ['DEC {a}'],
		'010': ['CALL {a}'],
		'011': ['CALL {a}'],
		'100': ['JMP {a}'],
		'101': ['JMP {a}'],
		'110': ['PUSH {a}'],
	}]
];

function decompileUsingTable(bytes) {
	let cursor = 0;
	while (cursor < bytes.length) {
		const byteFromBin = bytes[cursor++];
		const instructionEntry = MachineInstructionDecodingGuide[byteFromBin];

		const asmInstruction = instructionEntry[0];

		let mnemonicTemplate = asmInstruction[1];

		const secondByteDecode = instructionEntry[1];
		if (secondByteDecode) {
			const secondByte = bytes[cursor++];
			if (Array.isArray(secondByteDecode)) {
				const target = secondByteDecode[0];
				const regNameMap = secondByteDecode[1];
				const downshift = secondByteDecode[2];

				let regCode = 0b0;
				if (target == 'a' || target == 'b') {
					regCode = ((secondByte >> downshift) & 0b111).toString(2).padStart(3, '0');	
				}
				const stringCode = regCode.toString(2);
				const regName = regNameMap[stringCode]
				mnemonicTemplate = mnemonicTemplate.replace(`{${target}}`, regName);
			} else {
			}
		}
		
		console.log("Mnemonic template: ", mnemonicTemplate);
	}
}

function showBinaryContents(bytes) {
	const binaryDisplay = document.querySelector("#binarydata");
	let contents = "";
	for (let i = 0; i < bytes.length; ++i) {
		contents += bytes[i].toString(2).padStart(8, '0') + ' ';
	}
	binaryDisplay.innerText = contents;
}

function decompile(bytes) {
	let content = '';
	for (let i = 0; i < bytes.length; i += 2) {
		const byte0 = bytes[i].toString(2).padStart(8, '0');
		const byte1 = bytes[i + 1].toString(2).padStart(8, '0');

		const instr = byte0.slice(0, 6);
		const mnemonic = InstructionBitPatterns[instr];

		const wcode = byte0.slice(7, 8);
		
		const reg1 = byte1.slice(2, 5);
		const reg2 = byte1.slice(5, 8);

		content += `<div>${mnemonic} &nbsp; ${Registers[wcode][reg2]}, &nbsp; ${Registers[wcode][reg1]}</div>`;
	}

	document.querySelector("#decompiled").innerHTML = content;
}

function showSlottedView(bytes) {
	const firstByte = bytes[0].toString(2).padStart(8, '0'); 

	const instruction = document.querySelector("#slottedview .instruction .bits");
	const instr = firstByte.slice(0, 6);
	instruction.innerText = instr;
	const mnemonic = document.querySelector("#slottedview .instruction .mnemonic");
	mnemonic.innerText = InstructionBitPatterns[instr];

	const d = document.querySelector("#slottedview .d .bits");
	d.innerText = firstByte.slice(6, 7);

	const w = document.querySelector("#slottedview .w .bits");
	const wcode = firstByte.slice(7, 8);
	w.innerText = wcode;

	const secondByte = bytes[1].toString(2).padStart(8, '0');

	const mod = document.querySelector("#slottedview .mod .bits");
	mod.innerText = secondByte.slice(0, 2);

	const reg = document.querySelector("#slottedview .reg .bits");
	const regcode = secondByte.slice(2, 5);
	reg.innerText = regcode;
	const regname = document.querySelector("#slottedview .reg .regname");
	regname.innerText = Registers[wcode][regcode];

	const rm = document.querySelector("#slottedview .r-m .bits");
	const rmcode = secondByte.slice(5, 8);
	rm.innerText = rmcode;
	const rmname = document.querySelector("#slottedview .r-m .rmname");
	rmname.innerText = Registers[wcode][rmcode];
}

async function disassembleFile() {
	const [newFileHandle] = await window.showOpenFilePicker();
	const file = await newFileHandle.getFile();
	const buffer = await file.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	
	showBinaryContents(bytes);
	decompile(bytes);
	showSlottedView(bytes);
	decompileUsingTable(bytes);
}

window.onload = function() {
	let button = document.querySelector("#choosebin");
	button.addEventListener("click", disassembleFile);
}
