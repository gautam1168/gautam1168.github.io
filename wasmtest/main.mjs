let canvas;
let ctx;
let windowWidth;
let windowHeight;

export async function mount(rootEl) {
	canvas = document.createElement("canvas");		
	windowWidth = window.innerWidth;
	windowHeight = window.innerHeight;
	canvas.setAttribute("width", windowWidth);
	canvas.setAttribute("height", windowHeight);
	rootEl.appendChild(canvas);

	ctx = canvas.getContext("2d");

	await loadRecursiveSolution();

	// updateAndRender();
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
	let Base = BufferStart + BytesRequiredForBuffer;
	let DataStart = Base;
	Base = putString(view, Base, "abcd");
	Base = putString(view, Base, ".*");
	const result = instance.exports.runMatch(
		BufferStart, canvas.width, canvas.height, DataStart
	);

	const buffer = new Uint8ClampedArray(view.buffer, BufferStart, canvas.width * canvas.height * 4); 
	const imageData = new ImageData(buffer, canvas.width, canvas.height);
	ctx.putImageData(imageData, 0, 0);
}

async function loadRecursiveSolutionWithCanvasBuffer() {
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

	const BufferStart = instance.exports.__heap_base;
	const view = new Uint8Array(memory.buffer);
	// Reserve memory for imagedata
	const Base = BufferStart + BytesRequiredForBuffer;
	const Newbase = putString(view, Base, "abcd");
	putString(view, Newbase, ".*");
	const result = instance.exports.runMatch(
		BufferStart, canvas.width, canvas.height, Base
	);


	const buffer = new Uint8ClampedArray(view.buffer, BufferStart, canvas.width * canvas.height * 4); 
	const imageData = new ImageData(buffer, canvas.width, canvas.height);
	ctx.putImageData(imageData, 0, 0);
}
