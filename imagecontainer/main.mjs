const deviceResolutions = [
	{
		name: "iphone12",
		label: "Iphone 12 (390 x 844)",
		width: 390,
		height: 844,
		color: "red"
	},
	{
		name: "macbook13",
		label: "Macbook 13 (2560 x 1600)",
		width: 2560,
		height: 1600,
		color: "green"
	}
];

export async function mount(rootEl, previewsEl, imagelink) {
	const image = await new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = imagelink;
	});

	previewsEl.innerHTML = "";
	for (let deviceIndex = 0; 
		deviceIndex < deviceResolutions.length;
		++deviceIndex) {
		const resolution = deviceResolutions[deviceIndex];
		addControl(previewsEl, resolution, image);
	}
}

async function addControl(rootEl, resolution, image) {
	const componentRoot = document.createElement("div");
	componentRoot.innerHTML = `
		<div>${resolution.label}</div>
		<canvas 
			id="${resolution.name}"
			width=${resolution.width * 0.5} 
			height=${resolution.height * 0.5}
			style="border: solid 1px black;"
		>
		</canvas>
		<div class="controlbar">
			<input id="${resolution.name}xoffset" type="number" value=0>
			<input id="${resolution.name}yoffset" type="number" value=0>
			<input id="${resolution.name}zoom" type="range" value="1" min="0.7" max="2" step="0.05">
		</div>
	`;
	rootEl.appendChild(componentRoot);
	
	await new Promise(resolve => setTimeout(resolve));
	const canvas = componentRoot.querySelector(`canvas#${resolution.name}`)
	const ctx = canvas.getContext("2d");
	ctx.drawImage(image,
		0, 0, resolution.width, resolution.height,
		0, 0, resolution.width * 0.5, resolution.height * 0.5
	);

	const xOffsetInput = rootEl.querySelector(`input#${resolution.name}xoffset`);
	const yOffsetInput = rootEl.querySelector(`input#${resolution.name}yoffset`);
	const zoomLevel = rootEl.querySelector(`input#${resolution.name}zoom`);

	const update = ev => {
		const scale = zoomLevel.value; 
		const sourceX = xOffsetInput.value * scale;
		const sourceY = yOffsetInput.value * scale;
		const sourceWidth = resolution.width * scale;
		const sourceHeight = resolution.height * scale;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(image,
			sourceX, sourceY, sourceWidth, sourceHeight,
			0, 0, resolution.width * 0.5, resolution.height * 0.5
		);
	};

	xOffsetInput.addEventListener("input", update);
	yOffsetInput.addEventListener("input", update);
	zoomLevel.addEventListener("change", update);
}
