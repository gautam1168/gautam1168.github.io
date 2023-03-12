typedef unsigned char uint8;
typedef short int16;
typedef unsigned short uint16;
typedef int int32;
typedef unsigned int uint32;

enum mnemonic
{
	MOV
};

typded struct encoding
{
	uint8 NumBytes;
	char Asm[256];
} encoding;

encoding DecodingTable[65536];

// op     d w mod reg rm
// 100010 0 0 00  000 000
// 10001000   00000000
// 0x88 0x00
DecodingTable[0x8800].NumBytes = 2;
DecodingTable[0x8800].Asm = "MOV [BX + SI], AL";

// op     d w mod reg rm
// 100010 0 1 00  000 000
// 10001001   00000000
// 0x89 0x00
DecodingTable[0x8900].NumBytes = 2;
DecodingTable[0x8900].Asm = "MOV [BX + SI], AX";

// op     d w mod reg rm
// 100010 1 0 00  000 000
// 10001010   00000000
// 0x8a 0x00
DecodingTable[0x8a00].NumBytes = 2;
DecodingTable[0x8a00].Asm = "MOV AL, [BX + SI]";

// op     d w mod reg rm
// 100010 1 1 00  000 000
// 10001011   00000000
// 0x8b 0x00
DecodingTable[0x8b00].NumBytes = 2;
DecodingTable[0x8b00].Asm = "MOV AX, [BX + SI]";

instruction *
GetInstruction(uint8 *Bytes, uint32 NumBytes) 
{
}

