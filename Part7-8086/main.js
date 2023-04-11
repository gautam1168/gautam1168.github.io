let filebytes;
let instance;
let view;
const _registers = new Uint16Array(14);
const regNameMap = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  SP: 4,
  BP: 5,
  SI: 6,
  DI: 7,
  ES: 8,
  CS: 9,
  SS: 10,
  DS: 11,
  IP: 12,
  FLAGS: 13
};

const registers = new Proxy(_registers, {
  get(target, prop) {
    if (prop.endsWith("X")) {
      const regName = prop[0];
      const regIndex = regNameMap[regName];
      return target[regIndex];
    } else if (prop.endsWith("L")) {
      const regName = prop[0];
      const regIndex = regNameMap[regName];
      return (target[regIndex] & 0xff);
    } else if (prop.endsWith("H")) {
      const regName = prop[0];
      const regIndex = regNameMap[regName];
      return target[regIndex] >> 8;
    } else {
      const regIndex = regNameMap[prop];
      return target[regIndex];
    }
  },
});

async function onFile(ev, view, instance) {
  const offset = instance.exports.__heap_base;
  const file = ev.target.files[0];
  const buffer = await file.arrayBuffer();
  filebytes = new Uint8Array(buffer);
  view.set(filebytes, offset);

  const MaxMemory = BigInt(view.length - offset);
  const resultOffset = instance.exports.Entry(offset, filebytes.length, MaxMemory);

  const wordExtractorView = new Uint32Array(view.buffer, resultOffset, 1);
  const numBytesInResult = wordExtractorView[0];

  const outputView = new Uint8Array(view.buffer, resultOffset + 4, numBytesInResult - 4);
  const outputLog = String.fromCharCode.apply(null, outputView);

  renderRawBytes();
  renderMemory();
  renderAsm(outputLog);
  renderRegisters();
}

function renderRegisters() {
  const display = document.querySelector("#display #registers");

  const humanReadableLowHigh = (regName) => {
    return ` 
      <span class="humanreadable">
          ${regName}X=0x${registers[regName].toString(16)},${regName}H=0x${registers[regName + 'H'].toString(16)},${regName}L=0x${registers[regName + 'L'].toString(16)}
      </span>
    `;
  }

  const humanReadableFull = (regName) => {
    return ` 
      <span class="humanreadable">
          ${regName}=0x${registers[regName].toString(16)}
      </span>
    `;
  }

  const MakeBits = (regName, humanReadableRenderer) => {
    const bitString = registers[regName].toString(2).padStart(16, '0');

    const humanReadable = humanReadableRenderer(regName);
    const bits = bitString.split("").map(it => {
      return `<div class="bit ${(it == 1) ? 'set':'notset'}">${it}</div>`;
    })
    .join('');

      return `
        <div class="reglabelcontainer">
          ${regName}
          <div>
            ${humanReadable}
            <div id="${regName}" class="reg">
              ${bits}
            </div>
          </div>
        </div>
      `;
  };

  const MakeFlags = () => {
    const bitString = registers.FLAGS.toString(2).padStart(16, '0');

    const FlagName = ['-', '-', '-', '-', 'O', 'D', 'I', 'T', 'S', 'Z', '-', 'A', '-', 'P', '-', 'C'];
    const bits = bitString.split("").map((it, i) => {
      return `
        <div class="flagbitcontainer">
          <span>${FlagName[i]}</span>
          <span class="flagbit ${(it == 1) ? 'set':'notset'}">${it}</span>
        </div>
      `;
    })
    .join('');

      return `
        <div class="reglabelcontainer">
          FL
          <div>
            <div id="FLAGS" class="reg">
              ${bits}
            </div>
          </div>
        </div>
      `;
  };

  display.innerHTML = `
    <div id="datagroup">
      ${MakeBits('A', humanReadableLowHigh)}
      ${MakeBits('B', humanReadableLowHigh)}
      ${MakeBits('C', humanReadableLowHigh)}
      ${MakeBits('D', humanReadableLowHigh)}
    </div>
    <div id="pointergroup">
      ${MakeBits('SP', humanReadableFull)}
      ${MakeBits('BP', humanReadableFull)}
      ${MakeBits('SI', humanReadableFull)}
      ${MakeBits('DI', humanReadableFull)}
      ${MakeBits('IP', humanReadableFull)}
    </div>
    <div id="specialgroup">
      ${MakeBits('SS', humanReadableFull)}
      ${MakeBits('DS', humanReadableFull)}
      ${MakeBits('ES', humanReadableFull)}
    </div>
    <div id="specialgroup">
      ${MakeFlags()} 
    </div>
  `;
}

/*
function renderMemory() {
  const container = document.querySelector("#display #memory");
  const rect = container.getBoundingClientRect();
  container.innerHTML = '';
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  canvas.width = 1024; // rect.width - 1;
  canvas.height = 1024; //rect.height - 1;

  const cellWidth = 1;
  const cellHeight = 1;
  
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const memory = new Uint32Array(view, instance.exports.__heap_base, instance.exports.__heap_base + (1 << 20));
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 1024 * 1024; ++i)
  {
    const byteValue = memory[i];
    imageData.data[4 * i] = byteValue;     // red
    imageData.data[4 * i + 1] = 0x00; // green
    imageData.data[4 * i + 2] = 0x00; // blue
    imageData.data[4 * i + 3] = 0xff; // alpha
  }
  ctx.putImageData(imageData, 0, 0);
}
*/

function renderMemory() {
  const container = document.querySelector("#display #memory");
  container.innerHTML = "";

  const codeSegmentMemory = new Uint8Array(view.buffer, instance.exports.__heap_base, 50);

  let bytesDisplay = '<div>Code Segment</div>';
  for (let i = 0; i < codeSegmentMemory.length; ++i)
  {
    const serializedByte = codeSegmentMemory[i].toString(16).padStart(2, '0') + ' ';
    bytesDisplay += `<span class='byte'>  
        ${serializedByte} 
      </span>`;
  }

  bytesDisplay += '<div>Data Segment</div>';
  const dataSegmentMemory = new Uint8Array(view.buffer, instance.exports.__heap_base + (1 << 16) + 1000, 50);
  for (let i = 0; i < dataSegmentMemory.length; ++i)
  {
    const serializedByte = dataSegmentMemory[i].toString(16).padStart(2, '0') + ' ';
    bytesDisplay += `<span class='byte'>  
        ${serializedByte} 
      </span>`;
  }
  container.innerHTML = bytesDisplay;
}

function renderRawBytes() {
  const input = document.querySelector("#binary");
  const currentByte = registers.IP;
  let outputString = "<div>File bytes</div>";
  for (let i = 0; i < filebytes.length; ++i) {
    outputString += `<span class='byte ${i == currentByte ? "active": ""}'>  
      ${filebytes[i].toString(16).padStart(2, '0')} 
    </span>`;
  }
  input.innerHTML = outputString;
}

function renderAsm(outputLog) {
  const output = document.querySelector("#asm");
  const lines = outputLog.split("\n").filter(line => !!line);

  let byteOffset = 0;
  output.innerHTML = lines.map((it, i) => {
    const [bytes, asm] = it.split(";").map(it => it.trim());
    const result =  `
    <div id="instruction" data-byteoffset=${byteOffset} class="${i == 0 ? 'selected':''}">
      ${asm}
    </div>`;
    byteOffset += parseInt(bytes);

    return result;
  }).join("");
}



export async function main() {
  const filePicker = document.querySelector("input#chooser");

  const wasmMemory = new WebAssembly.Memory({ initial: 160 });
  view = new Uint8Array(wasmMemory.buffer);
  const importObject = {
    env: {
      memory: wasmMemory
    }
  };

  const wasmModule = await WebAssembly.instantiateStreaming(
    fetch("./sim8086-test.wasm"), importObject
  );

  instance = wasmModule.instance;

  filePicker.addEventListener("change", 
    (ev) => onFile(ev, view, instance)
  );

  document.addEventListener("keydown", (ev) => {
    if (ev.ctrlKey && ev.keyCode == 121) {
      stepProgram()
    }
  });

  const stepper = document.querySelector("button#stepper");
  stepper.addEventListener("click", stepProgram);

  renderRegisters();
  renderMemory();
}

function stepProgram() {
  if (filebytes == undefined) {
    alert("First use the choose file button to load a binary!");
  } else if (registers.IP == filebytes.length) {
    alert("Program has finished execution! Reload the page to start over.");
  } else {
    const offset = instance.exports.__heap_base;
    const MaxMemory = BigInt(view.length - offset);
    const registerOffset = instance.exports.Step(offset, filebytes.length, MaxMemory);
    const wordView = new Uint32Array(view.buffer, registerOffset);
    const currentOffset = wordView[0];
    const currentInstruction = wordView[1];

    // 4 bytes for currentOffset, 4 bytes for currentInstruction and 2 bytes for blank register
    const regView = new Uint16Array(view.buffer, registerOffset + 10, 14);
    _registers.set(regView);
    renderRegisters();

    const instructions = document.querySelectorAll("#instruction");
    instructions.forEach((inst, i) => {
      const byteOffset = inst.getAttribute("data-byteoffset");
      if (byteOffset == registers.IP) {
        inst.classList.add("selected");
      } else {
        inst.classList.remove("selected");
      }
    });

    renderRawBytes();
    renderMemory();
  }
}
