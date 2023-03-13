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
		const firstByte = bytes[byteIndex++];
		let translation = window.translationKey[firstByte];
		if (translation) {
			const code = translation.split(";");
			let interimCode = code[0];
			const numBytesToReadArray = code[1].split(",").map(it => parseInt(it));
			for (let numBytesToRead of numBytesToReadArray) {
				if (numBytesToRead == 1) {
					const value = bytes[byteIndex++];
					EightBitCaster[0] = value;
					interimCode = interimCode.replace("{bytes}", EightBitCaster[0]);
				} else if (numBytesToRead == 2) {
					const value = ((bytes[byteIndex + 1] << 8) | bytes[byteIndex]);
					SixteenBitCaster[0] = value;
					interimCode = interimCode.replace("{bytes}", SixteenBitCaster[0]);
					byteIndex += 2;
				}
			}
			result.push(interimCode.replace(/\+\-/g, "-"));
		} else {
			const secondByte = bytes[byteIndex++];
			const bigIndex = (firstByte << 8) | secondByte;
			if (!window.translationKey[bigIndex]) {
				throw new Error("Translation not found for " + bigIndex + " , " + bigIndex.toString(2).padStart(16, '0'));
			}
			translation = window.translationKey[bigIndex].split(";");
			let interimTran = translation[0];
			const numBytesToReadArray = translation[1].split(",").map(it => parseInt(it));
			for (let numBytesToRead of numBytesToReadArray) {
				if (numBytesToRead == 1) {
					const value = bytes[byteIndex++];
					EightBitCaster[0] = value;
					interimTran = interimTran.replace("{bytes}", EightBitCaster[0]);
				} else if (numBytesToRead == 2) {
					const value = ((bytes[byteIndex + 1] << 8) | bytes[byteIndex]);
					SixteenBitCaster[0] = value;
					interimTran = interimTran.replace("{bytes}", SixteenBitCaster[0]);
					byteIndex += 2;
				}
			}
			result.push(interimTran.replace(/\+\-/g, "-"));
		}
	}
	return result;
}

window.onload = async function() {
	let button = document.querySelector("#choosebin");
	button.addEventListener("click", showFileBinary);

	await loadDecodeTable();	

	fetch("listing_0039_more_movs")
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
