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
  const dataSegmentMemory = new Uint8ClampedArray(view.buffer, instance.exports.__heap_base + 256, 64 * 64 * 4);
  const imageData = new ImageData(dataSegmentMemory, 64, 64);

  container.innerHTML = bytesDisplay;

  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  canvas.width = 64;
  canvas.height = 64;
  canvas.style.width = "128px";
  canvas.style.height = "128px";

  const ctx = canvas.getContext("2d");
  ctx.putImageData(imageData, 0, 0);
  /*
  for (let i = 0; i < dataSegmentMemory.length; ++i)
  {
    const serializedByte = dataSegmentMemory[i].toString(16).padStart(2, '0') + ' ';
    bytesDisplay += `<span class='byte'>  
        ${serializedByte} 
      </span>`;
  }
  */
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

  const plusPrefixedString = (arg, suffix) => arg ? ('+ ' + arg + suffix) : '';
  let byteOffset = 0;
  output.innerHTML = lines.map((it, i) => {
    const [bytes, cycles, eacycles, pcycles, asm] = it.split(";").map(it => it.trim());
    let cycleCount = `${cycles}`;
    if (eacycles) 
    {
      cycleCount += ` + ${eacycles}ea`;
    }

    if (pcycles)
    {
      cycleCount += ` + ${pcycles}p`;
    }
    
    if ((cycles < 0) || (eacycles < 0) || (pcycles < 0))
    {
      cycleCount = 'not implemented';
    }
    else
    {
      cycleCount += ' cycles';
    }

    const result =  `
    <div id="instruction" data-byteoffset=${byteOffset} class="${i == 0 ? 'selected':''}">
       <span>${asm}</span><span class="cycles">${cycleCount} </span>
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
    else if (ev.key == "Enter" && window.dialogIsOpen) {
      selectHomework()
    }
  });

  const stepper = document.querySelector("button#stepper");
  stepper.addEventListener("click", stepProgram);

  const runner = document.querySelector("button#runner");
  runner.addEventListener("click", runProgramToCompletion);

  renderRegisters();
  renderMemory();

  /*
  fetch("./listing_0056_estimating_cycles")
    .then(res => res.blob())
    .then(res => {
      return onFile({ target: { files: [res] }}, view, instance);
    })
    .then(() => {
      // return runProgramToCompletion();
    })
    */

  setupHomeworkDialog();
}

function setupHomeworkDialog() {
  const HomeworkDialog = document.querySelector("dialog")
  const HomeworkDialogOpener = document.querySelector("#dialog-opener");
  const HomeworkDialogCloser = document.querySelector("#dialog-closer");
  HomeworkDialogOpener.addEventListener("click", () => {
    window.dialogIsOpen = true;
    HomeworkDialog.showModal();
  });
  HomeworkDialogCloser.addEventListener("click", () => {
    selectHomework();
  });
}

function selectHomework() {
  const HomeworkDialog = document.querySelector("dialog")
  const Inputs = document.querySelectorAll("#listing-container input");
  let SelectedInputValue = null;
  Inputs.forEach(inputEl => {
    if (inputEl.checked)
    {
      SelectedInputValue = inputEl.value;
    }
  });
  if (SelectedInputValue) {
    console.log("Selected Value: ", SelectedInputValue);
    fetch("./" + SelectedInputValue)
      .then(res => res.blob())
      .then(res => {
        return onFile({ target: { files: [res] }}, view, instance);
      })
      .then(() => {
        // return runProgramToCompletion();
      })
  }
  HomeworkDialog.close();
  window.dialogIsOpen = false;
}

function stepProgram() {
  if (filebytes == undefined) {
    alert("First use the choose file button to load a binary!");
  } else if (registers.IP == filebytes.length) {
    alert("Program has finished execution! Reload the page to start over.");
  } else {
    const offset = instance.exports.__heap_base;
    const MaxMemory = BigInt(view.length - offset);
    debugger
    const registerOffset = instance.exports.Step2(offset, filebytes.length, MaxMemory);
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

function runProgramToCompletion() {
  if (filebytes == undefined) {
    alert("First use the choose file button to load a binary!");
  } else {
    const offset = instance.exports.__heap_base;
    const MaxMemory = BigInt(view.length - offset);
    let registerOffset = 0;
    while (registers.IP < filebytes.length) {
      registerOffset = instance.exports.Step2(offset, filebytes.length, MaxMemory);
      const wordView = new Uint32Array(view.buffer, registerOffset);
      const currentOffset = wordView[0];
      const currentInstruction = wordView[1];

      // 4 bytes for currentOffset, 4 bytes for currentInstruction and 2 bytes for blank register
      const regView = new Uint16Array(view.buffer, registerOffset + 10, 14);
      _registers.set(regView);
    }
    
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
