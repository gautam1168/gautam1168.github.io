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

function parseNumber(bytes) {
	let afterDecimal = false;
	let number = 0;
	let isNegative = false;

	for (let i = 0; i < bytes.length; ++i) {
		const charCode = bytes[i];
		if (charCode >= zero) {
			const digit = charCode - zero;
			if (afterDecimal) {
				number = number + (digit * 0.1);
			} else {
				number = (number * 10) + digit;
			}
		} else if (charCode == space) {
			continue;
		} else if (charCode == decimal) {
			afterDecimal = true;
		} else if (charCode == minus) {
			isNegative = true;
		}
	}

	if (isNegative) {
		number = -number;
	}
	return number;
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

	outputBuffer[bufferIndex] = parseNumber(numberStringBuffer);
	//outputBuffer[bufferIndex] = parseFloat(String.fromCharCode.apply(undefined, numberStringBuffer));
	return characterIndex;
}

function extractPoints(characterView, startIndex, endIndex, numPairs, 
	numberCharacters, numberStringBuffer, 
	outputBuffer, pairsToParse) {
	let prevUpdateTime = performance.now();
	let characterIndex = startIndex;
	let numPairsProcessed = 0;
	while (numPairsProcessed <= pairsToParse && characterIndex <= endIndex) {
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

		const now = performance.now();
		if (now - prevUpdateTime >= 1000) {
			prevUpdateTime = now;
			postMessage({
				type: "progress-update",
				level: 100 * (numPairsProcessed / pairsToParse),
				index: self.index
			});
		} 
	}
	return numPairsProcessed;
}

function averageHaverSine(parsedCoordinates) {
	const start_time = performance.now();
	const pairSum = calculate(parsedCoordinates);
	const end_time = performance.now();
	return { sum: pairSum, time: end_time - start_time };
}

function calculate(coordinates) {
	let sum = 0.0;
	const totalCoordinates = coordinates.length;
	let coordIndex = totalCoordinates;

	for (let i = 0; i < coordinates.length; i += 4) {
		let lat1 = coordinates[i];
		let lon1 = coordinates[i + 1];
		let lat2 = coordinates[i + 2];
		let lon2 = coordinates[i + 3];
		const R = 6372.8;

		const dLat = radians(lat2 - lat1);
		const dLon = radians(lon2 - lon1);

		lat1 = radians(lat1);
		lat2 = radians(lat2);

		const a = Math.sin(dLat/2)**2 + Math.cos(lat2)*Math.cos(lat1)*(Math.sin(dLon/2)**2);
		sum += 2 * R * Math.asin(Math.sqrt(a));
	}

	return sum;
}

onmessage = async function(e) {
	const parse_start = performance.now();
	const workerIndex = e.data.workerIndex;
	const numWorkers = e.data.numWorkers;

	self.index = workerIndex;
	const characterView = new Uint8Array(e.data.buffer);

	let startIndex = 0;
	let endIndex = characterView.length - 1;

	const numberCharacters = new Array(58).fill(0);
	numberCharacters[decimal] = 1;
	numberCharacters[minus] = 1;
	numberCharacters[space] = 1;
	for (let i = 0; i < 10; ++i) {
		numberCharacters[zero + i] = 1;
	}

	const totalPairsInFileRef = [];
	const numberStringBuffer = new Array(19).fill(space); 

	let characterIndex = startIndex;
	characterIndex = consumeCharacters(characterView, characterIndex, [openBrace, quote, a, quote, colon]);

	characterIndex = consumePositiveInteger(
		characterView, 
		characterIndex, 
		numberStringBuffer, 
		totalPairsInFileRef
	);

	characterIndex = consumeCharacters(
		characterView, 
		characterIndex, 
		[comma, quote, ...pairs, quote, colon, openBracket]
	);

	if (self.index == 0) {
		endIndex = Math.ceil((characterView.length - characterIndex) / numWorkers);
		while (characterView[endIndex] !== closeBrace) {
			endIndex++;
		}
	} else {
		startIndex = Math.floor((characterView.length - characterIndex) / numWorkers);
		while (characterView[startIndex] !== openBrace) {
			startIndex--;
		}
	}

	const pairsToParse = Math.ceil(totalPairsInFileRef[0]/numWorkers);
	const parsedCoordinates = new Float32Array(pairsToParse * 4);

	const numPairs = extractPoints(
		characterView, startIndex, endIndex, 0, 
		numberCharacters, numberStringBuffer,
		parsedCoordinates, pairsToParse
	);
	
	const parse_end = performance.now();

	const res = averageHaverSine(parsedCoordinates);

	postMessage({
		pairs: numPairs,
		sum: res.sum,
		calc_time: res.time,
		parse_time: parse_end - parse_start,
		type: "parsed-points",
		index: self.index
	});
}
