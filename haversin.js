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
	return `{"x0": ${coords[0]}, "y0": ${coords[1]}, "x1": ${coords[2]}, "y2": ${coords[3]} }`;
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
	const template = `{"x0": ___________________, "y0": ___________________, "x1": ___________________, "y1": ___________________ }`;
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

function setAndCreate(number) {
	const datapoints = document.querySelector("#generation input");
	datapoints.value = number;
	createAFile();
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
	await writableStream.write('{ "pairs": [');

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

function consumeNumber(characterView, characterIndex, floatBuffer, bufferIndex, numberCharacters) {
	let numberString = '';
	while (numberCharacters.has(characterView[characterIndex])) {
		numberString += String.fromCharCode(characterView[characterIndex++]);
	}
	floatBuffer[bufferIndex] = parseFloat(numberString);
	return characterIndex;
}

async function calculate(characterView, startIndex, floatBuffer, numPairs, numberCharacters, 
	{ openBrace, comma, quote, x, y, zero, colon, closeBrace}) {
	let characterIndex = startIndex;
	let numPairsProcessed = 0;
	while (characterIndex < characterView.length && numPairsProcessed < 4096 * 2 * 2) {
		characterIndex = consumeCharacters(characterView, characterIndex, [openBrace]);

		// x0
		characterIndex = consumeCharacters(characterView, characterIndex, 
			[quote,	x, zero, quote, colon]
		);

		characterIndex = consumeNumber(characterView, characterIndex, floatBuffer, 0, numberCharacters);
		characterIndex = consumeCharacters(characterView, characterIndex, [comma]);

		// y0
		characterIndex = consumeCharacters(characterView, characterIndex, 
			[quote,	y, zero, quote, colon]
		);

		characterIndex = consumeNumber(characterView, characterIndex, floatBuffer, 1, numberCharacters);
		characterIndex = consumeCharacters(characterView, characterIndex, [comma]);

		// x1
		characterIndex = consumeCharacters(characterView, characterIndex, 
			[quote,	x, zero + 1, quote, colon]
		);

		characterIndex = consumeNumber(characterView, characterIndex, floatBuffer, 2, numberCharacters);
		characterIndex = consumeCharacters(characterView, characterIndex, [comma]);

		// y1
		characterIndex = consumeCharacters(characterView, characterIndex, 
			[quote,	y, zero + 1, quote, colon]
		);

		characterIndex = consumeNumber(characterView, characterIndex, floatBuffer, 3, numberCharacters);
		// characterIndex = consumeCharacters(characterView, characterIndex, [comma]);

		characterIndex = consumeCharacters(characterView, characterIndex, [closeBrace, comma]);

		floatBuffer[4] += haversine(floatBuffer[0], floatBuffer[1], floatBuffer[2], floatBuffer[3]);
		numPairsProcessed++;
	}

	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({
				numPairs: numPairs + numPairsProcessed,
				characterIndex
			});
		})
	});
}

async function readAFileAndParseIt() {
	const progress = document.querySelector("#calculation #progress");
	const progresslevel = document.querySelector("#calculation #progress #level");
	progress.style.display = "flex";
	progresslevel.style.width = "0px";
	const fullWidth = progress.getBoundingClientRect().width;

	let haverSineSum = 0;
	let numPairs = 0;

	const [newFileHandle] = await window.showOpenFilePicker();

	const start_reading = performance.now();

	const file = await newFileHandle.getFile();
	const buffer = await file.arrayBuffer();
	const characterView = new Uint8Array(buffer);


	const finish_reading = performance.now();

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
	const space = 32;

	const numberCharacters = new Set([
		decimal,
		minus,
		space,
		zero,
		zero + 1,
		zero + 2,
		zero + 3,
		zero + 4,
		zero + 5,
		zero + 6,
		zero + 7,
		zero + 8,
		zero + 9
	]);

	const floatBuffer = new Float64Array(5);
	floatBuffer.fill(0);	

	let characterIndex = 0;
	
	characterIndex = consumeCharacters(characterView, characterIndex, [openBrace]);
	characterIndex = consumeCharacters(characterView, characterIndex, [quote]);
	characterIndex = consumeCharacters(characterView, characterIndex, pairs);
	characterIndex = consumeCharacters(characterView, characterIndex, [quote]);
	characterIndex = consumeCharacters(characterView, characterIndex, [colon, openBracket]);

	const start_calculation = performance.now();

	while (characterIndex < characterView.length) {
		const result = await calculate(
			characterView, characterIndex, floatBuffer, numPairs, numberCharacters,
			{
				openBrace, comma, quote, x, y, zero, colon, closeBrace
			});
		characterIndex = result.characterIndex;
		numPairs = result.numPairs;

		const completion = fullWidth * characterIndex/characterView.length;
		progresslevel.style.width = `${completion}px`;
	}

	const end_calculation = performance.now();
	progress.style.display = "none";

	const domnode = document.querySelector("#javascript-out");
	domnode.innerText = `
		Total pairs evaluated: ${numPairs}
		Time for reading: ${finish_reading - start_reading} ms
		Time for calculation: ${end_calculation - start_calculation} ms
	`;
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
