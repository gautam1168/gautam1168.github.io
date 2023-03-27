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
  renderAsm(outputLog);
  renderRegisters();
}

function renderRegisters() {
  const display = document.querySelector("#display #registers");

  const MakeBits = (register) => {
    const bitString = register.toString(2).padStart(16, '0');
    return bitString.split("").map(it => {
      return `<div class="bit ${(it == 1) ? 'set':'notset'}">${it}</div>`;
    }).join("");
  };

  display.innerHTML = `
    <div id="datagroup">
      <div class="reglabelcontainer">
        A
        <div>
          <span class="humanreadable">AX=${registers.A},AH=${registers.AH},AL=${registers.AL}</span>
          <div id="A" class="reg">
            ${MakeBits(registers.A)}
          </div>
        </div>
      </div>
      <div class="reglabelcontainer">
        B
        <div>
          <span class="humanreadable">BX=${registers.B},BH=${registers.BH},BL=${registers.BL}</span>
          <div id="B" class="reg">
            ${MakeBits(registers.B)}
          </div>
        </div>
      </div>
      <div class="reglabelcontainer">
        C
        <div>
          <span class="humanreadable">CX=${registers.C},CH=${registers.CH},CL=${registers.CL}</span>
          <div id="C" class="reg">
            ${MakeBits(registers.C)}
          </div>
        </div>
      </div>
      <div class="reglabelcontainer">
        D
        <div>
          <span class="humanreadable">DX=${registers.D},DH=${registers.DH},DL=${registers.DL}</span>
          <div id="D" class="reg">
            ${MakeBits(registers.D)}
          </div>
        </div>
      </div>
    </div>
    <div id="pointergroup">
      <div class="reglabelcontainer">
        SP
        <div>
          <span class="humanreadable">SP=${registers.SP}</span>
          <div id="SP" class="reg">
            ${MakeBits(registers.SP)}
          </div>
        </div>
      </div>
      <div class="reglabelcontainer">
        BP
        <div>
          <span class="humanreadable">BP=${registers.BP}</span>
          <div id="BP" class="reg">
            ${MakeBits(registers.BP)}
          </div>
        </div>
      </div>
      <div class="reglabelcontainer">
        SI
        <div>
          <span class="humanreadable">SI=${registers.SI}</span>
          <div id="SI" class="reg">
            ${MakeBits(registers.SI)}
          </div>
        </div>
      </div>
      <div class="reglabelcontainer">
        DI
        <div>
          <span class="humanreadable">DI=${registers.DI}</span>
          <div id="DI" class="reg">
            ${MakeBits(registers.DI)}
          </div>
        </div>
      </div>
    </div>
    <div id="specialgroup">
      <div class="reglabelcontainer">
        SS
        <div>
          <span class="humanreadable">SS=${registers.SS}</span>
          <div id="SS" class="reg">
            ${MakeBits(registers.SS)}
          </div>
        </div>
      </div>
      <div class="reglabelcontainer">
        DS
        <div>
          <span class="humanreadable">DS=${registers.DS}</span>
          <div id="DS" class="reg">
            ${MakeBits(registers.DS)}
          </div>
        </div>
      </div>
      <div class="reglabelcontainer">
        ES
        <div>
          <span class="humanreadable">ES=${registers.ES}</span>
          <div id="ES" class="reg">
            ${MakeBits(registers.ES)}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRawBytes() {
  const input = document.querySelector("#binary");
  let outputString = "";
  for (let i = 0; i < filebytes.length; ++i) {
    outputString += filebytes[i].toString(16).padStart(2, '0') + " ";
  }
  input.innerText = outputString;
}

function renderAsm(outputLog) {
  const output = document.querySelector("#asm");
  const lines = outputLog.split("\n");
  output.innerHTML = lines.map((it, i) => {
    return `<div id="instruction" class="${i == 0 ? 'selected':''}">${it}</div>`;
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
}

function stepProgram() {
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
    if (i == currentInstruction) {
      inst.classList.add("selected");
    } else {
      inst.classList.remove("selected");
    }
  });
}
