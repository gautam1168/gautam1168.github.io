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
}

window.onload = function() {
	let button = document.querySelector("#choosebin");
	button.addEventListener("click", showFileBinary);

	fetch("listing_0039_more_movs")
		.then(res => res.blob())
		.then(res => res.arrayBuffer())
		.then(res => {
			const bytes = new Uint8Array(res);
			showBinaryContents(bytes);
		});
}
