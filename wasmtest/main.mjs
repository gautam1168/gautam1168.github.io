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

	updateAndRender();
}

function updateAndRender() {
	ctx.clearRect(0, 0, windowWidth, windowHeight);
	ctx.fillRect(0, 0, 100, 100);

	/*
	requestAnimationFrame(() => {
		updateAndRender();
	});
	*/
}

function putString(memory, base, text) {
	for (let i = 0; i < text.length; ++i) {
		memory[base + i] = text.charCodeAt(i);
	}
	memory[base + text.length] = 0;
	return base + text.length + 1;
}

async function loadRecursiveSolution() {
	const memory = new WebAssembly.Memory({ initial: 2 });
	const res = await fetch("./recursive.wasm");	
	const bytes = await res.arrayBuffer();
	const { instance } = await WebAssembly.instantiate(bytes, {
		env: {
			memory
		}
	});

	const view = new Uint8Array(memory.buffer);
	const newbase = putString(view, instance.exports.__heap_base, "abcd");
	putString(view, newbase, ".*");
	const result = instance.exports.runMatch(instance.exports.__heap_base);
	console.log(result);
}
