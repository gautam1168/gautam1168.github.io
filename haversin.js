function radians(degrees) {
	return degrees * 0.0174533;
}

function haversine(lat1, lon1, lat2, lon2) {
	const R = 6372.8;

	const dLat = radians(lat2 - lat1);
	const dLon = radians(lon2 - lon1);

	lat1 = radians(lat1);
	lat2 = radians(lat2);

	const a = Math.sin(dLat/2)**2 + Math.cos(lat2)*Math.cos(lat2)*Math.sin(dLon/2)**2;
	const c = 2 * Math.asin(Math.sqrt(a));

	return R * c;
}

function generateCoordinatePair() {
	const coords = [0, 0, 0, 0];
	for (let i = 0; i < 4; ++i) {
		coords[i] = Math.random()*200 - 100;
	}
	return `{"x1": ${coords[0]}, "y1": ${coords[1]}, "x2": ${coords[2]}, "y2": ${coords[3]} }`;
}

function generateMultipleCoordinatePairs(numPairs) {
	const coords = new Array(numPairs * 4).fill(0);
	for (let i = 0; i < coords.length; ++i) {
		coords[i] = Math.random()*200 - 100;
	}

	let jsonFrag = new Array(numPairs);
	let randIndex = 0;
	for (let i = 0; i < numPairs; ++i) {
		jsonFrag[i] = `{"x1": ${coords[randIndex++]}, "y1": ${coords[randIndex++]}, "x2": ${coords[randIndex++]}, "y2": ${coords[randIndex++]} }`;
	}
	return jsonFrag.join(',');
}

const templates = {};

// This is slower. Maybe profiling this function will tell us why 
function generateMultipleCoordinatePairs2(numPairs) {
	if (!templates[numPairs]) {
		templates[numPairs] = makeTemplate(numPairs);
	}

	const coords = new Array(numPairs * 4).fill(0);
	for (let i = 0; i < coords.length; ++i) {
		coords[i] = Math.random()*200 - 100;
	}

	const template = templates[numPairs];
	const BUFFLENGTH = 109;
	const X1_OFFSET = 7;
	const Y1_OFFSET = 34;
	const X2_OFFSET = 61;
	const Y2_OFFSET = 88;

	let coordIndex = 0;
	for (let pairIndex = 0; pairIndex < numPairs; ++pairIndex) {
		const startIndex = BUFFLENGTH * pairIndex + pairIndex;

		let coord = coords[coordIndex++].toString().padStart(19, ' ');
		let coordCharIndex = 0;
		for (let charIndex = startIndex + X1_OFFSET; 
			charIndex < startIndex + X1_OFFSET + 19;
			++charIndex, ++coordCharIndex)
		{
			template[charIndex] = coord.charCodeAt(coordCharIndex);
		}

		coord = coords[coordIndex++].toString().padStart(19, ' ');
		coordCharIndex = 0;
		for (let charIndex = startIndex + Y1_OFFSET; 
			charIndex < startIndex + Y1_OFFSET + 19;
			++charIndex, ++coordCharIndex)
		{
			template[charIndex] = coord.charCodeAt(coordCharIndex);
		}

		coord = coords[coordIndex++].toString().padStart(19, ' ');
		coordCharIndex = 0;
		for (let charIndex = startIndex + X2_OFFSET; 
			charIndex < startIndex + X2_OFFSET + 19;
			++charIndex, ++coordCharIndex)
		{
			template[charIndex] = coord.charCodeAt(coordCharIndex);
		}

		coord = coords[coordIndex++].toString().padStart(19, ' ');
		coordCharIndex = 0;
		for (let charIndex = startIndex + Y2_OFFSET; 
			charIndex < startIndex + Y2_OFFSET + 19;
			++charIndex, ++coordCharIndex)
		{
			template[charIndex] = coord.charCodeAt(coordCharIndex);
		}

	}
	return templates[numPairs];
}

function makeTemplate(numPairs) {
	const template = `{"x1": ___________________, "y1": ___________________, "x2": ___________________, "y2": ___________________ }`;
	const buf = new Uint8Array(template.length);
	for (let i = 0; i < template.length; i++) {
		buf[i] = template.charCodeAt(i);
	}

	const finalBuf = new Uint8Array(buf.length * numPairs + numPairs);
	let bufIndex = 0;
	for (let pairIndex = 0; pairIndex < numPairs; ++pairIndex) {
		let charIndex = 0;
		while (charIndex < buf.length) {
			finalBuf[bufIndex++] = buf[charIndex++];
		}

		if (bufIndex < numPairs * buf.length - 2) {
			finalBuf[bufIndex++] = ",".charCodeAt(0);
		}
	}

	return finalBuf;
}

function printBuffer(buf) {
	let text = '';
	for (let i = 0; i < buf.length; ++i) {
		text += String.fromCharCode(buf[i]);
	}
	console.log(text);
}

async function createAFile() {
	const datapoints = document.querySelector("#generation input");
	const progress = document.querySelector("#generation #progress");
	const progresslevel = document.querySelector("#generation #progress #level");
	const resultdiv = document.querySelector("#javascript-out");

	const numPoints = datapoints.value;
	
	let showingProgress = false;
	let fullWidth = 0;
	if (numPoints > 1024) {
		showingProgress = true;
		progress.style.display = "flex";
		progresslevel.style.width = '0px';
		fullWidth = progress.getBoundingClientRect().width;
	}

	const newFileHandle = await window.showSaveFilePicker();
	const writableStream = await newFileHandle.createWritable();
	await writableStream.write('{ "coordinates": [');

	const start_time = performance.now();

	const pairChunkSize = 1024;
	for (let i = 0; i < (numPoints/pairChunkSize) - 1; ++i) {
		const pair = generateMultipleCoordinatePairs(pairChunkSize) + ','
		await writableStream.write(pair);
		if (showingProgress && ((i % (512)) == 0)) {
			progresslevel.style.width = (fullWidth * ((i*pairChunkSize) / numPoints)) + 'px';
		}
	}

	await writableStream.write(generateMultipleCoordinatePairs(pairChunkSize));
	await writableStream.write('] }');
	const mid_time = performance.now();
	progresslevel.style.background = 'green';
	await writableStream.close();

	const end_time = performance.now();
	progress.style.display = "none";

	resultdiv.innerText = `
		Total time: ${end_time - start_time} ms
		Time for writing to stream: ${mid_time - start_time} ms
		Time for closing stream: ${end_time - mid_time} ms
	`;
	// alert("File creation complete! You can click on Read file to view the result");
}

async function readAFile() {
	const [newFileHandle] = await window.showOpenFilePicker();
	const file = await newFileHandle.getFile();
	const buffer = await file.arrayBuffer();
	const characterView = new Uint8Array(buffer);
	let contents = '';
	for (let i = 0; i < characterView.length; i++) {
		contents += String.fromCharCode(characterView[i]);
	}
	const domnode = document.querySelector("#javascript-out");
	domnode.innerText = contents;
}

window.onload = function() {
	let button = document.querySelector("#generation button#write");
	button.addEventListener("click", createAFile);

	button = document.querySelector("button#read");
	button.addEventListener("click", readAFile);
}

/*
const start_time = performance.now();
let pointsLeft = 1000 * 1000 * 10;
while (pointsLeft--) {
	haversine(36.12, -86.67, 33.94, -118.40);
}
const end_time = performance.now();
const elapsed_time = (end_time - start_time);
const measure = document.querySelector("#javascript-out");
measure.innerText = `Time elapsed for js: ${elapsed_time}ms`;
*/
