function showBinaryContents(bytes) {
	const binaryDisplay = document.querySelector("#binarydata");
	let contents = "";
	for (let i = 0; i < bytes.length; ++i) {
		contents += bytes[i].toString(2).padStart(8, '0') + ' ';
	}
	binaryDisplay.innerText = contents;
}

async function getFileBytes() {
	const [newFileHandle] = await window.showOpenFilePicker();
	const file = await newFileHandle.getFile();
	const buffer = await file.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	return bytes;
}

async function showFileBinary() {
	const bytes = await getFileBytes();
	showBinaryContents(bytes);
	const asm = decompile(bytes);
	const disasmDisplay = document.querySelector("#fulltabledecode");
	disasmDisplay.innerHTML = asm.join('<br/>');
}

async function loadDecodeTable() {
	const res = await fetch("decodetable.txt")
	const rawData = await res.text();

	const lines = rawData.split("\n");
	window.translationKey = new Array(65536);
	for (let i = 0; i < 65536; ++i) {
		const translation = lines[i].split(' ');
		if (translation[1]) {
			window.translationKey[i] = translation.slice(1).join(' ');
		}
	}
}

function decompile(bytes) {
	let byteIndex = 0;
	let result = [];
	const EightBitCaster = new Int8Array(1);
	const SixteenBitCaster = new Int16Array(1);
	while (byteIndex < bytes.length) {
		const firstByte = bytes[byteIndex];
		const secondByte = bytes[byteIndex + 1];
		const bigIndex = (firstByte << 8) | secondByte;

		let interimCode = "";
		let translation;
		if (translation = window.translationKey[bigIndex]) {
			byteIndex += 2;
			/*
			interimCode += firstByte.toString(2).padStart(8, '0') + " " + 
				secondByte.toString(2).padStart(8, '0');
			*/
		} else if (translation = window.translationKey[firstByte]) {
			byteIndex += 1;
			// interimCode += firstByte.toString(2).padStart(8, '0') + " ";
		} else {
			console.log(result);
			throw new Error("Cannot translate " + 
				firstByte.toString(2).padStart(8, '0') + ", " + 
				secondByte.toString(2).padStart(8, '0'));
		}

		const code = translation.split(";");
		const numBytesToReadArray = code[1].split(",").map(it => parseInt(it));
		for (let numBytesToRead of numBytesToReadArray) {
			if (numBytesToRead == 1) {
				const value = bytes[byteIndex++];
				// interimCode += " " + value.toString(2).padStart(8, '0');
				EightBitCaster[0] = value;
				code[0] = code[0].replace("{bytes}", EightBitCaster[0]);
			} else if (numBytesToRead == 2) {
				const value = ((bytes[byteIndex + 1] << 8) | bytes[byteIndex]);
				/*
				interimCode += " " + bytes[byteIndex].toString(2).padStart(8, '0') +
					" " + bytes[byteIndex + 1].toString(2).padStart(8, '0');
				*/
				SixteenBitCaster[0] = value;
				code[0] = code[0].replace("{bytes}", SixteenBitCaster[0]);
				byteIndex += 2;
			} 
		}
		interimCode += " " + code[0];
		result.push(interimCode.replace(/\+\-/g, "-"));
	}
	return result;
}

window.onload = async function() {
	let button = document.querySelector("#choosebin");
	button.addEventListener("click", showFileBinary);

	await loadDecodeTable();	

	fetch("listing_0041_add_sub_cmp_jnz")
		.then(res => res.blob())
		.then(res => res.arrayBuffer())
		.then(res => {
			const bytes = new Uint8Array(res);
			showBinaryContents(bytes);
			const asm = decompile(bytes);
			const disasmDisplay = document.querySelector("#fulltabledecode");
			disasmDisplay.innerHTML = asm.join('<br/>');
		});
}
