async function onFile(ev, view, instance) {
  const offset = instance.exports.__heap_base;
  const file = ev.target.files[0];
  const buffer = await file.arrayBuffer();
  const filebytes = new Uint8Array(buffer);
  for (let i = 0; i < filebytes.length; ++i) {
    view[offset + i] = filebytes[i];
  }

  const MaxMemory = BigInt(view.length - offset);
  const result = instance.exports.Entry(offset, filebytes.length, MaxMemory);

  const outputView = view.slice(offset + (1 << 20), offset + (1 << 20) + result + 1);
  const outputLog = String.fromCharCode.apply(null, outputView);

  const input = document.querySelector("#input");
  let outputString = "";
  for (let i = 0; i < filebytes.length; ++i) {
    outputString += filebytes[i].toString(2).padStart(8, '0') + " ";
  }
  input.innerText = outputString;
  const output = document.querySelector("#output");
  output.innerText = outputLog;
}

export async function main() {
  const filePicker = document.querySelector("input#choose");

  const wasmMemory = new WebAssembly.Memory({ initial: 160 });
  const view = new Uint8Array(wasmMemory.buffer);
  const importObject = {
    env: {
      memory: wasmMemory
    }
  };

  const { instance } = await WebAssembly.instantiateStreaming(
    fetch("./sim8086.wasm"), importObject
  );

  const version = instance.exports.Sim86_GetVersion();
  const versionContainer = document.querySelector("h2#version");
  versionContainer.innerText = "Sim8086: " + version;

  filePicker.addEventListener("change", 
    (ev) => onFile(ev, view, instance)
  );
}

