const pairs = [112, 97, 105, 114, 115];
const colon = 58;
const quote = 34;
const openBracket = 91;
const closeBracket = 93;
const openBrace = 123;
const closeBrace = 125;
const comma = 44;
const decimal = 46;
const minus = 45;
const zero = 48;
const x = 120;
const y = 121;
const a = 97;
const space = 32;

/*
const workerCommsSab = new SharedArrayBuffer(2 * 32);
const workerComms = new Int32Array(workerCommsSab);
*/

const calcprogress = document.querySelector("#calculation #progress");
const calcprogresslevel = document.querySelector("#calculation #progress #level");

const parseWorker = new Worker("parseworker.js");
parseWorker.onmessage = function(e) {
	if (e.data.type === "parsed-points") {
		performance.mark("parse-end");
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

function consumeCharacters(buffer, bufferIndex, charactersToConsume) {
	let numCharactersConsumed = 0;
	while (numCharactersConsumed < charactersToConsume.length && bufferIndex < buffer.length) {
		const character = buffer[bufferIndex++];
		if (character === charactersToConsume[numCharactersConsumed]) {
			numCharactersConsumed++;
		}
	}
	return bufferIndex;
}

function consumeOneCharacter(buffer, bufferIndex, character) {
	do {
	} while (buffer[bufferIndex++] != character);
	return bufferIndex;
}

function consumePositiveInteger(characterView, characterIndex, numberStringBuffer, parsedNumber) {
	let charIndex = 0;
	const allowedCharacters = new Array(58).fill(0);
	allowedCharacters[space] = 1;
	for (let i = 0; i < 10; ++i) {
		allowedCharacters[zero + i] = 1;
	}

	numberStringBuffer.fill(32);
	while (allowedCharacters[characterView[characterIndex]]) {
		numberStringBuffer[charIndex++] = characterView[characterIndex++];
	}

	parsedNumber[0] = parseInt(String.fromCharCode(...numberStringBuffer));

	return characterIndex;
}

function consumeNumber(characterView, characterIndex, outputBuffer, bufferIndex, numberCharacters, numberStringBuffer) {
	let charIndex = 0;
	let numberLength = 16;
	while (numberLength) {
		numberStringBuffer[charIndex++] = numberCharacters[characterView[characterIndex]] ? characterView[characterIndex++] : 32;
		numberStringBuffer[charIndex++] = numberCharacters[characterView[characterIndex]] ? characterView[characterIndex++] : 32;
		numberStringBuffer[charIndex++] = numberCharacters[characterView[characterIndex]] ? characterView[characterIndex++] : 32;
		numberStringBuffer[charIndex++] = numberCharacters[characterView[characterIndex]] ? characterView[characterIndex++] : 32;
		numberLength -= 4;
	}
	numberStringBuffer[charIndex++] = numberCharacters[characterView[characterIndex]] ? characterView[characterIndex++] : 32;
	numberStringBuffer[charIndex++] = numberCharacters[characterView[characterIndex]] ? characterView[characterIndex++] : 32;
	numberStringBuffer[charIndex++] = numberCharacters[characterView[characterIndex]] ? characterView[characterIndex++] : 32;

	outputBuffer[bufferIndex] = parseFloat(String.fromCharCode.apply(undefined, numberStringBuffer));
	return characterIndex;
}

async function extractPoints(characterView, startIndex, numPairs, numberCharacters, 
	{ openBrace, comma, quote, x, y, zero, colon, closeBrace}, numberStringBuffer, outputBuffer) {
	let characterIndex = startIndex;
	let numPairsProcessed = 0;
	while (characterIndex < characterView.length) {
		characterIndex = consumeOneCharacter(characterView, characterIndex, openBrace);

		// x0
		characterIndex = consumeCharacters(characterView, characterIndex, 
			[quote,	x, zero, quote, colon]
		);

		characterIndex = consumeNumber(characterView, characterIndex, outputBuffer, 
			((numPairs + numPairsProcessed) * 4 + 0), numberCharacters, numberStringBuffer);
		characterIndex = consumeOneCharacter(characterView, characterIndex, comma);

		// y0
		characterIndex = consumeCharacters(characterView, characterIndex, 
			[quote,	y, zero, quote, colon]
		);

		characterIndex = consumeNumber(characterView, characterIndex, outputBuffer, 
			((numPairs + numPairsProcessed) * 4 + 1), numberCharacters, numberStringBuffer);
		characterIndex = consumeOneCharacter(characterView, characterIndex, comma);

		// x1
		characterIndex = consumeCharacters(characterView, characterIndex, 
			[quote,	x, zero + 1, quote, colon]
		);

		characterIndex = consumeNumber(characterView, characterIndex, outputBuffer, 
			((numPairs + numPairsProcessed) * 4 + 2), numberCharacters, numberStringBuffer);
		characterIndex = consumeOneCharacter(characterView, characterIndex, comma);

		// y1
		characterIndex = consumeCharacters(characterView, characterIndex, 
			[quote,	y, zero + 1, quote, colon]
		);

		characterIndex = consumeNumber(characterView, characterIndex, outputBuffer, 
			((numPairs + numPairsProcessed) * 4 + 3), numberCharacters, numberStringBuffer);

		characterIndex = consumeCharacters(characterView, characterIndex, [closeBrace, comma]);

		numPairsProcessed++;
	}

	/*
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({
				numPairs: numPairs + numPairsProcessed,
				characterIndex
			});
		})
	});
	*/
	return {
		numPairs: numPairs + numPairsProcessed,
		characterIndex
	};
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
	const start_calculation = performance.now();
	const parsedCoordinates = new Float32Array(buffer);
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


