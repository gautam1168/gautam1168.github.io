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

async function createAFile() {
	const newFileHandle = await window.showSaveFilePicker();
	const writableStream = await newFileHandle.createWritable();
	await writableStream.write('{ "a": 1 }');
	await writableStream.close();
}

async function readAFile() {
	const [newFileHandle] = await window.showOpenFilePicker();
	const file = await newFileHandle.getFile();
	const buffer = await file.arrayBuffer();
	const characterView = new Uint8Array(buffer);
	let contents = '';
	for (let i = 0; i < characterView.length; i++) {
		contents += String.fromCharCode(characterView[i]);
	}
	const domnode = document.querySelector("#javascript-out");
	domnode.innerText = contents;
}

window.onload = function() {
	let button = document.querySelector("button#write");
	button.addEventListener("click", createAFile);

	button = document.querySelector("button#read");
	button.addEventListener("click", readAFile);
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
