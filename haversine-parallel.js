/*
const workerCommsSab = new SharedArrayBuffer(2 * 32);
const workerComms = new Int32Array(workerCommsSab);
*/

const calcprogress = document.querySelector("#calculation #progress");
const calcprogresslevel = document.querySelector("#calculation #progress #level");
const calcprogresslevel1 = document.querySelector("#calculation #progress #level-1");

const workerResults = {
	worker1: {
		pairs: 0,
		time: 0.0,
		haversinetotal: 0,
		receivedResult: false
	},
	worker2: {
		pairs: 0,
		time: 0.0,
		haversinetotal: 0,
		receivedResult: false
	}
};

function setWorkerResult(key, value) {
	workerResults[key] = value;
	
	const domnode = document.querySelector("#javascript-out");
	if (workerResults.worker1.receivedResult && workerResults.worker2.receivedResult) {

		const avg = (workerResults.worker1.haversinetotal + workerResults.worker2.haversinetotal)/
			(workerResults.worker1.pairs + workerResults.worker2.pairs);

		const parse1time = performance.measure("parse-1", "parse-start-1", "parse-end-1");
		const parse2time = performance.measure("parse-2", "parse-start-2", "parse-end-2");

		const totalPairsProcessed = workerResults.worker1.pairs + workerResults.worker2.pairs;
		const totalCalcTime = workerResults.worker1.time + workerResults.worker2.time;

		domnode.innerText = `
			Average: ${avg}
			Total pairs evaluated: ${totalPairsProcessed}
			Time for parsing worker1: ${parse1time.duration} ms 
			Time for parsing worker2: ${parse2time.duration} ms
			Time for calculation: ${totalCalcTime} ms
			Haversines per ms: ${totalPairsProcessed/totalCalcTime}
		`;
		calcprogress.style.display = "none";
	}
}

const parseWorker1 = new Worker("parseworker.js");
parseWorker1.onmessage = function(e) {
	if (e.data.index == 0 && e.data.type === "parsed-points") {
		const parsedCoordinates = new Float32Array(e.data.parsedCoordinates);
		performance.mark("parse-end-1");
		const result = averageHaverSine(parsedCoordinates);
		setWorkerResult('worker1', {
			pairs: parsedCoordinates.length/4,
			haversinetotal: result.sum,
			receivedResult: true,
			time: result.time
		});
	} else if (e.data.index == 0 && e.data.type === "progress-update") {
		calcprogress.style.display = "flex";
		calcprogresslevel.style.width = e.data.level + '%';
	}
}

const parseWorker2 = new Worker("parseworker.js");
parseWorker2.onmessage = function(e) {
	if (e.data.index == 1 && e.data.type === "parsed-points") {
		const parsedCoordinates = new Float32Array(e.data.parsedCoordinates);
		performance.mark("parse-end-2");
		const result = averageHaverSine(parsedCoordinates);
		setWorkerResult('worker2', {
			pairs: parsedCoordinates.length/4,
			haversinetotal: result.sum,
			receivedResult: true,
			time: result.time
		});
	} else if (e.data.index == 1 && e.data.type === "progress-update") {
		calcprogress.style.display = "flex";
		calcprogresslevel1.style.width = e.data.level + '%';
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

function calculate(coordinates) {
	let sum = 0.0;
	const totalCoordinates = coordinates.length;
	let coordIndex = totalCoordinates;
	for (let i = 0; i < coordinates.length; i += 4) {
		sum += haversine(coordinates[i + 0], coordinates[i + 2], coordinates[i + 1], coordinates[i + 3]);
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
	return sum;
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

	const buffercopy = buffer.slice(0, buffer.byteLength);

	performance.mark("parse-start-1");
	parseWorker2.postMessage({ 
		buffer: buffercopy,  
		workerIndex: 1,
		numWorkers: 2
	}, [buffercopy]);
	
	performance.mark("parse-start-2");
	parseWorker1.postMessage({ 
		buffer,  
		workerIndex: 0,
		numWorkers: 2
	}, [buffer]);
	
}

function averageHaverSine(parsedCoordinates) {
	const start_time = performance.now();
	const pairSum = calculate(parsedCoordinates);
	const end_time = performance.now();
	return { sum: pairSum, time: end_time - start_time };
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


