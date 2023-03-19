let canvas;
let ctx;
let windowWidth;
let windowHeight;

let controlPanel;
let wasmInterface;

export async function mount(rootEl) {
	canvas = document.createElement("canvas");		
	windowWidth = window.innerWidth;
	windowHeight = window.innerHeight;
	canvas.setAttribute("width", windowWidth);
	canvas.setAttribute("height", windowHeight);
	rootEl.appendChild(canvas);

	ctx = canvas.getContext("2d");

	appendControlPanel(rootEl);

	await loadRecursiveSolution();
}

function appendControlPanel(rootEl) {
	const panelRoot = document.createElement("div");
	panelRoot.setAttribute("style", `
		display: flex;
		flex-direction: column;
		position: fixed;
		top: 0;
		right: 0;
		width: 300px;
		height: 500px;
		background: #ffffff9e;
	`);
	panelRoot.innerHTML = `
		<div>
			<input id="string-input" type="text" placeholder="String...">
		</div>
		<div>
			<input id="pattern-input" type="text" placeholder="Pattern...">
		</div>
	`;
	rootEl.appendChild(panelRoot);

	controlPanel = {
		panelRoot,
		stringInput: document.querySelector("input#string-input"),
		patternInput: document.querySelector("input#pattern-input"),
	};

	controlPanel.stringInput.addEventListener("input", (ev) => {
		evaluateInputs();
	});

	controlPanel.patternInput.addEventListener("input", (ev) => {
		evaluateInputs();
	});
}

function updateAndRender() {
	ctx.clearRect(0, 0, windowWidth, windowHeight);
	ctx.fillRect(0, 0, 100, 100);
}

function putString(memory, base, text) {
	for (let i = 0; i < text.length; ++i) {
		memory[base + i] = text.charCodeAt(i);
	}
	memory[base + text.length] = 0;
	return base + text.length + 1;
}

function putFontTextureInBuffer(view, start) {
	const ofCanvas = new OffscreenCanvas(40, 40);	
	const ofCtx = ofCanvas.getContext("2d");
	ofCtx.font = "15px sans-serif"
	const characters = "abcdefghijklmnopqrstuvwxyz0123456789.* ";
	for (let i = 0; i < characters.length; ++i) {
		const character = characters[i];
		const measure = ofCtx.measureText(character);
		ofCtx.clearRect(0, 0, ofCanvas.width, ofCanvas.height);
		ofCtx.fillText(character, 0, measure.fontBoundingBoxAscent);
		const imageData = ofCtx.getImageData(0, 0, measure.width, 
			measure.fontBoundingBoxDescent + measure.fontBoundingBoxAscent);

		const imageView = new Uint8Array(imageData.data);

		view[start++] = imageData.width;
		view[start++] = imageData.height;

		for (let i = 0; i < imageView.length; ++i) {
			view[start++] = imageView[i]; 
		}
	}
	return start;
}

async function loadRecursiveSolution() {
	// 1 page is 64kb 
	const BytesRequiredForBuffer = Math.ceil(canvas.width * canvas.height * 4);
	const NumPagesForBuffer = Math.ceil(BytesRequiredForBuffer / 64000); 
	// 100 page is 6.4MB which is the space allocated for the rest of the program
	const memory = new WebAssembly.Memory({ initial: NumPagesForBuffer + 100 });
	const res = await fetch("./recursive.wasm");	
	const bytes = await res.arrayBuffer();
	const { instance } = await WebAssembly.instantiate(bytes, {
		env: {
			memory
		}
	});

	const view = new Uint8Array(memory.buffer);

	const BufferStart = instance.exports.__heap_base;
	// Reserve memory for imagedata
	let DataStart = BufferStart + BytesRequiredForBuffer;
	// Set text texture
	DataStart = putFontTextureInBuffer(view, DataStart);
	
	
	controlPanel.stringInput.value = "abbcd";
	controlPanel.patternInput.value = ".*.d";

	wasmInterface = {
		view,
		instance,
		dataStart: DataStart
	};

	evaluateInputs();
}

function evaluateInputs() {
	const StringInput = controlPanel.stringInput.value;
	const PatternInput = controlPanel.patternInput.value;

	let Base = wasmInterface.dataStart;
	Base = putString(wasmInterface.view, Base, StringInput);
	Base = putString(wasmInterface.view, Base, PatternInput);

	const BufferStart = wasmInterface.instance.exports.__heap_base;
	const result = wasmInterface.instance.exports.runMatch(
		BufferStart,
		canvas.width,
		canvas.height,
		wasmInterface.dataStart
	);

	const buffer = new Uint8ClampedArray(wasmInterface.view.buffer, BufferStart, canvas.width * canvas.height * 4); 
	const imageData = new ImageData(buffer, canvas.width, canvas.height);
	ctx.putImageData(imageData, 0, 0);
}
