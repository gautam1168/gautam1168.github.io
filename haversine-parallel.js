/*
const workerCommsSab = new SharedArrayBuffer(2 * 32);
const workerComms = new Int32Array(workerCommsSab);
*/

const calcprogress = document.querySelector("#calculation #progress");
const calcprogresslevel = document.querySelector("#calculation #progress #level");

const parseWorker = new Worker("parseworker.js");
parseWorker.onmessage = function(e) {
	if (e.data.type === "parsed-points") {
		averageHaverSine(e.data.parsedCoordinates);
	} else if (e.data.type === "progress-update") {
		if (e.data.level < 100) {
			calcprogress.style.display = "flex";
			calcprogresslevel.style.width = e.data.level + '%';
		} else {
			calcprogress.style.display = "none";
		}
	}
}

function radians(degrees) {
	return degrees * 0.0174533;
}

function haversine(lat1, lon1, lat2, lon2) {
	const R = 6372.8;

	const dLat = radians(lat2 - lat1);
	const dLon = radians(lon2 - lon1);

	lat1 = radians(lat1);
	lat2 = radians(lat2);

	const a = Math.sin(dLat/2)**2 + Math.cos(lat2)*Math.cos(lat1)*(Math.sin(dLon/2)**2);
	const c = 2 * R * Math.asin(Math.sqrt(a));

	return c;
}

function generateMultipleCoordinatePairs(numPairs) {
	const coords = new Array(numPairs * 4).fill(0);
	for (let i = 0; i < coords.length; ++i) {
		coords[i] = Math.random()*100;
	}

	let jsonFrag = new Array(numPairs);
	let randIndex = 0;
	for (let i = 0; i < numPairs; ++i) {
		jsonFrag[i] = `{"x0": ${coords[randIndex++]}, "y0": ${coords[randIndex++]}, "x1": ${coords[randIndex++]}, "y1": ${coords[randIndex++]} }`;
	}
	return jsonFrag.join(',');
}

function printBuffer(buf) {
	let text = '';
	for (let i = 0; i < buf.length; ++i) {
		text += String.fromCharCode(buf[i]);
	}
	console.log(text);
}

function setAndCreate(number) {
	const datapoints = document.querySelector("#generation input");
	datapoints.value = number;
	createAFile();
}

async function readAFile() {
	const [newFileHandle] = await window.showOpenFilePicker();
	const file = await newFileHandle.getFile();
	const buffer = await file.arrayBuffer();
	const characterView = new Uint8Array(buffer);
	let contents = '';
	for (let i = 0; i < 32768; i++) {
		contents += String.fromCharCode(characterView[i]);
	}

	if (characterView.length > 32768) {
		contents += ` ...truncated ${characterView.length - 32768} characters`;
	}

	const domnode = document.querySelector("#javascript-out");
	domnode.innerText = contents;
}

async function calculate(coordinates) {
	let average = 0.0;
	const totalCoordinates = coordinates.length;
	let coordIndex = totalCoordinates;
	for (let i = 0; i < coordinates.length; i += 4) {
		average += haversine(coordinates[i + 0], coordinates[i + 2], coordinates[i + 1], coordinates[i + 3]);
	}
	/*
	while (coordIndex) {
		average += haversine(
			coordinates[coordIndex - 3], 
			coordinates[coordIndex - 1], 
			coordinates[coordIndex - 2], 
			coordinates[coordIndex]
		);

		coordIndex -= 4;
	}
	*/
	return average/(coordinates.length/4);
}

async function createAFile() {
	const datapoints = document.querySelector("#generation input");
	const progress = document.querySelector("#generation #progress");
	const progresslevel = document.querySelector("#generation #progress #level");
	const resultdiv = document.querySelector("#javascript-out");

	const numPoints = parseInt(datapoints.value);
	
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
	await writableStream.write(`{ "a": ${numPoints}, "pairs": [`);

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
	progresslevel.style.background = 'blue';
	progress.style.display = "none";

	resultdiv.innerText = `
		Total time: ${end_time - start_time} ms
		Time for generating and writing to stream: ${mid_time - start_time} ms
		Time for closing stream and writing to disk: ${end_time - mid_time} ms
	`;
	// alert("File creation complete! You can click on Read file to view the result");
}

async function readAFileAndParseIt() {
	const progress = document.querySelector("#calculation #progress");
	const progresslevel = document.querySelector("#calculation #progress #level");
	const domnode = document.querySelector("#javascript-out");
	domnode.innerText = "";
	progress.style.display = "flex";
	progresslevel.style.width = "0px";
	const fullWidth = progress.getBoundingClientRect().width;

	const [newFileHandle] = await window.showOpenFilePicker();

	const start_reading = performance.now();

	const file = await newFileHandle.getFile();
	const buffer = await file.arrayBuffer();
	performance.mark("parse-start");
	parseWorker.postMessage(buffer, [buffer]);
}

async function averageHaverSine(buffer) {
	const parsedCoordinates = new Float32Array(buffer);
	performance.mark("parse-end");

	const start_calculation = performance.now();
	const avgDistance = await calculate(parsedCoordinates);
	const end_calculation = performance.now();

	const domnode = document.querySelector("#javascript-out");
	const totalPairsProcessed = parsedCoordinates.length / 4;

	const parseMeasure = performance.measure("parse-measure", "parse-start", "parse-end");

	domnode.innerText = `
		Average: ${avgDistance}
		Total pairs evaluated: ${totalPairsProcessed}
		Time for parsing: ${parseMeasure.duration} ms
		Time for calculation: ${end_calculation - start_calculation} ms
		Haversines per ms: ${totalPairsProcessed/(end_calculation - start_calculation)}
	`;
	calcprogress.style.display = "none";
}

window.onload = function() {
	let button;

	button = document.querySelector("#generation button#write-10-k");
	button.addEventListener("click", () => setAndCreate(16384));

	button = document.querySelector("#generation button#write-100-k");
	button.addEventListener("click", () => setAndCreate(131072));

	button = document.querySelector("#generation button#write-mil");
	button.addEventListener("click", () => setAndCreate(1048576));

	button = document.querySelector("#generation button#write-8-mil");
	button.addEventListener("click", () => setAndCreate(8388608));

	button = document.querySelector("#generation button#write-16-mil");
	button.addEventListener("click", () => setAndCreate(16777216));

	button = document.querySelector("button#read");
	button.addEventListener("click", readAFileAndParseIt);
}


