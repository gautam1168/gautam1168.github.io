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
		calc_time: 0.0,
		parse_time: 0.0,
		haversinetotal: 0.0,
		receivedResult: false
	},
	worker2: {
		pairs: 0,
		calc_time: 0.0,
		parse_time: 0.0,
		haversinetotal: 0.0,
		receivedResult: false
	}
};

function setWorkerResult(key, value) {
	workerResults[key] = value;
	
	const domnode = document.querySelector("#javascript-out");
	if (workerResults.worker1.receivedResult && workerResults.worker2.receivedResult) {

		const avg = (workerResults.worker1.haversinetotal + workerResults.worker2.haversinetotal)/
			(workerResults.worker1.pairs + workerResults.worker2.pairs);

		const totalPairsProcessed = workerResults.worker1.pairs + workerResults.worker2.pairs;
		const totalCalcTime = workerResults.worker1.calc_time + workerResults.worker2.calc_time;

		domnode.innerText = `
			Average: ${avg}
			Total pairs evaluated: ${totalPairsProcessed}
			Time for parsing worker1: ${workerResults.worker1.parse_time} ms 
			Time for parsing worker2: ${workerResults.worker2.parse_time} ms
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
		setWorkerResult('worker1', {
			pairs: e.data.pairs,
			haversinetotal: e.data.sum,
			receivedResult: true,
			calc_time: e.data.calc_time,
			parse_time: e.data.parse_time
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
		setWorkerResult('worker2', {
			pairs: e.data.pairs,
			haversinetotal: e.data.sum,
			receivedResult: true,
			calc_time: e.data.calc_time,
			parse_time: e.data.parse_time
		});
	} else if (e.data.index == 1 && e.data.type === "progress-update") {
		calcprogress.style.display = "flex";
		calcprogresslevel1.style.width = e.data.level + '%';
	}
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

	const file = await newFileHandle.getFile();
	const buffer = await file.arrayBuffer();

	const buffercopy = buffer.slice(0, buffer.byteLength);

	parseWorker2.postMessage({ 
		buffer: buffercopy,  
		workerIndex: 1,
		numWorkers: 2
	}, [buffercopy]);
	
	parseWorker1.postMessage({ 
		buffer,  
		workerIndex: 0,
		numWorkers: 2
	}, [buffer]);
	
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


