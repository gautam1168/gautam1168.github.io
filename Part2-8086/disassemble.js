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
	while (byteIndex < bytes.length) {
		const firstByte = bytes[byteIndex++];
		if (window.translationKey[firstByte]) {
			result.push(window.translationKey[firstByte]);
		} else {
			const secondByte = bytes[byteIndex++];
			const bigIndex = (firstByte << 8) | secondByte;
			result.push(window.translationKey[bigIndex]);
		}
	}
	return result;
}

window.onload = async function() {
	let button = document.querySelector("#choosebin");
	button.addEventListener("click", showFileBinary);

	loadDecodeTable();	

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
