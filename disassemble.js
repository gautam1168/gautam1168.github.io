const InstructionBitPatterns = {
	'100010': 'MOV',
};

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
		const instrbyte = bytes[i].toString(2).padStart(8, '0');
		const regbyte = bytes[i + 1].toString(2).padStart(8, '0');

		const instr = instrbyte.slice(0, 6);
		const mnemonic = InstructionBitPatterns[instr];

		const wcode = instrbyte.slice(7, 8);
		
		const reg1 = regbyte.slice(2, 5);
		const reg2 = regbyte.slice(5, 8);

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
}

window.onload = function() {
	let button = document.querySelector("#choosebin");
	button.addEventListener("click", disassembleFile);
}
