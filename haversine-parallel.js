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

function consumeNumber(characterView, characterIndex, floatBuffer, bufferIndex, numberCharacters, numberStringBuffer) {
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

	floatBuffer[bufferIndex] = parseFloat(String.fromCharCode.apply(undefined, numberStringBuffer));
	return characterIndex;
}

async function calculate(characterView, startIndex, floatBuffer, numPairs, numberCharacters, 
	{ openBrace, comma, quote, x, y, zero, colon, closeBrace}, numberStringBuffer) {
	let characterIndex = startIndex;
	let numPairsProcessed = 0;
	while (characterIndex < characterView.length && numPairsProcessed < 4096 * 2 * 2) {
		characterIndex = consumeOneCharacter(characterView, characterIndex, openBrace);

		// x0
		characterIndex = consumeCharacters(characterView, characterIndex, 
			[quote,	x, zero, quote, colon]
		);

		characterIndex = consumeNumber(characterView, characterIndex, floatBuffer, 0, numberCharacters, numberStringBuffer);
		characterIndex = consumeOneCharacter(characterView, characterIndex, comma);

		// y0
		characterIndex = consumeCharacters(characterView, characterIndex, 
			[quote,	y, zero, quote, colon]
		);

		characterIndex = consumeNumber(characterView, characterIndex, floatBuffer, 1, numberCharacters, numberStringBuffer);
		characterIndex = consumeOneCharacter(characterView, characterIndex, comma);

		// x1
		characterIndex = consumeCharacters(characterView, characterIndex, 
			[quote,	x, zero + 1, quote, colon]
		);

		characterIndex = consumeNumber(characterView, characterIndex, floatBuffer, 2, numberCharacters, numberStringBuffer);
		characterIndex = consumeOneCharacter(characterView, characterIndex, comma);

		// y1
		characterIndex = consumeCharacters(characterView, characterIndex, 
			[quote,	y, zero + 1, quote, colon]
		);

		characterIndex = consumeNumber(characterView, characterIndex, floatBuffer, 3, numberCharacters, numberStringBuffer);

		characterIndex = consumeCharacters(characterView, characterIndex, [closeBrace, comma]);

		floatBuffer[4] += haversine(floatBuffer[0], floatBuffer[2], floatBuffer[1], floatBuffer[3]);
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

	let numPairs = 0;

	const [newFileHandle] = await window.showOpenFilePicker();

	const start_reading = performance.now();

	const file = await newFileHandle.getFile();
	const buffer = await file.arrayBuffer();
	const characterView = new Uint8Array(buffer);


	const finish_reading = performance.now();

	const numberCharacters = new Array(58).fill(0);
	numberCharacters[decimal] = 1;
	numberCharacters[minus] = 1;
	numberCharacters[space] = 1;
	numberCharacters[zero] = 1;
	numberCharacters[zero + 1] = 1;
	numberCharacters[zero + 2] = 1;
	numberCharacters[zero + 3] = 1;
	numberCharacters[zero + 4] = 1;
	numberCharacters[zero + 5] = 1;
	numberCharacters[zero + 6] = 1;
	numberCharacters[zero + 7] = 1;
	numberCharacters[zero + 8] = 1;
	numberCharacters[zero + 9] = 1;

	const skipCharacters = {
		openBrace, comma, quote, x, y, zero, colon, closeBrace
	};

	const floatBuffer = new Float64Array(5);
	floatBuffer.fill(0);	

	const numberStringBuffer = new Array(19).fill(space); 

	let characterIndex = consumeCharacters(characterView, 0, [openBrace, quote, ...pairs, quote, colon, openBracket]);

	const start_calculation = performance.now();

	while (characterIndex < characterView.length) {
		const result = await calculate(
			characterView, characterIndex, floatBuffer, numPairs, 
			numberCharacters, skipCharacters, numberStringBuffer
		);

		characterIndex = result.characterIndex;
		numPairs = result.numPairs;

		const completion = fullWidth * characterIndex/characterView.length;
		progresslevel.style.width = `${completion}px`;
	}

	const end_calculation = performance.now();
	progress.style.display = "none";

	const domnode = document.querySelector("#javascript-out");
	domnode.innerText = `
		Average: ${floatBuffer[4]/numPairs}
		Total pairs evaluated: ${numPairs}
		Time for reading: ${finish_reading - start_reading} ms
		Time for calculation: ${end_calculation - start_calculation} ms
		Haversines per ms: ${numPairs/(end_calculation - start_calculation)}
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


