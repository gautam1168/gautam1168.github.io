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

async function extractPoints(characterView, startIndex, endIndex, numPairs, 
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
}

onmessage = async function(e) {
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
	let numPairs = 0;

	await extractPoints(
		characterView, startIndex, endIndex, numPairs, 
		numberCharacters, numberStringBuffer,
		parsedCoordinates, pairsToParse
	);

	postMessage({
		parsedCoordinates,
		type: "parsed-points",
		index: self.index
	}, 
		[parsedCoordinates.buffer]);
}
