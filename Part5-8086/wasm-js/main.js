let simLib;
const _registers = {
  A: 0x0,
  B: 0x0,
  C: 0x0,
  D: 0x0,
  SP: 0x0,
  BP: 0x0,
  SI: 0x0,
  DI: 0x0,
  DS: 0x0,
  SS: 0x0,
  ES: 0x0
};

const registers = new Proxy(_registers, {
  get(target, prop) {
    if (prop.endsWith("X")) {
      return target[prop[0]];
    } else if (prop.endsWith("L")) {
      return (target[prop[0]] & 0xff);
    } else if (prop.endsWith("H")) {
      return target[prop[0]] >> 8;
    } else {
      return target[prop];
    }
  },

  set(target, prop, value) {
    if (prop.endsWith("X")) {
      target[prop[0]] = value;
    } else if (prop.endsWith("L")) {
      const currentHigh = target[prop[0]] >> 8; 
      const newvalue = (currentHigh << 8) | value;
      target[prop[0]] = newvalue;
    } else if (prop.endsWith("H")) {
      const currentLow = target[prop[0]] & 0xff; 
      const newvalue = (value << 8) | currentLow;
      target[prop[0]] = newvalue;
    } else {
      target[prop] = value;
    }
    return true;
  }
});

let program = {
  asm: [],
  current: 0,
  fileBytes: []
};

export async function main() {
  renderRegisters();
  simLib = await loadLibrary();
  connectInput();
}

function connectInput() {
  const chooser = document.querySelector("input#chooser");
  chooser.addEventListener("change", loadBinary);

  document.addEventListener("keydown", (ev) => {
    if (ev.ctrlKey && ev.keyCode == 121) {
      stepProgram()
    }
  });

  const stepper = document.querySelector("#stepper");  
  stepper.addEventListener("click", stepProgram);
}

function stepProgram() {
  executeInstruction();
  renderRegisters();
  renderRawBytes();

  const instructions = document.querySelectorAll("#instruction");
  instructions.forEach((inst, i) => {
    if (i == program.current) {
      inst.classList.add("selected");
    } else {
      inst.classList.remove("selected");
    }
  });
}

async function loadBinary(ev) {
  const file = ev.target.files[0];
  const buffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(buffer);

  const asm = generateAsm(fileBytes);

  renderAsm(asm);
  prepareForExecute(asm, fileBytes);
  renderRawBytes();
  renderRegisters();
}

function prepareForExecute(asm, fileBytes) {
  program.asm = asm;
  program.current = 0;
  program.fileBytes = fileBytes;
}

function renderAsm(asm) {
  const display = document.querySelector("#display #asm");

  display.innerHTML = asm.map((it, i) => {
    return `<div id="instruction" class="${i == 0 ? 'selected':''}">${it.serialized}</div>`;
  }).join("")
}

function renderRawBytes() {
  const fileBytes = program.fileBytes;
  const display = document.querySelector("#display #binary");

  const isCurrentInstruction = index => {
    const instruction = program.asm[program.current].instruction;
    if ((index >= instruction.Address) && (index < instruction.Address + instruction.Size)) {
      return true;
    }
    return false;
  };

  let serialized = '';
  for (let i = 0; i < fileBytes.length; ++i) {
    const hexValue = fileBytes[i].toString(16).padStart(2, '0');
    serialized += `
      <span class="byte ${isCurrentInstruction(i) ? 'active' : '' }">
        ${hexValue}
      </span>`;
  }

  display.innerHTML = serialized;
}

function generateAsm(fileBytes) {
  const result = [];
  
  let bytesLeft = fileBytes.length;
  let startOffset = 0;

  while (bytesLeft) {
    const instruction = simLib.Sim86_Decode8086Instruction(new Uint8Array(fileBytes.buffer, startOffset));
    const OpName = simLib.Sim86_MnemonicFromOperationType(instruction.Op);
    const SourceOperand = instruction.Operands[1];
    const DestOperand = instruction.Operands[0];
    let SourceOperandAsString, DestOperandAsString;

    if (SourceOperand.Immediate) {
      SourceOperandAsString = SourceOperand.Immediate.Value;
    } else if (SourceOperand.Register) {
      SourceOperandAsString = simLib.Sim86_RegisterNameFromOperand(SourceOperand.Register);
    }

    if (DestOperand.Immediate) {
      DestOperandAsString = DestOperand.Immediate.Value;
    } else if (DestOperand.Register) {
      DestOperandAsString = simLib.Sim86_RegisterNameFromOperand(DestOperand.Register);
    }

    if (result.length > 0) {
      instruction.Address = result[result.length - 1].instruction.Size + result[result.length - 1].instruction.Address;
    }

    result.push({
      serialized: `${OpName} ${DestOperandAsString}, ${SourceOperandAsString}`,
      instruction
    });

    bytesLeft -= instruction.Size;
    startOffset += instruction.Size;
  }
  return result;
}

function executeInstruction() {
  if (program.asm.length > 0) {
    const Instruction = program.asm[program.current++].instruction;

    if (program.current == program.asm.length) {
      program.current = 0;
    }

    const OpName = simLib.Sim86_MnemonicFromOperationType(Instruction.Op);
    if (OpName == "mov") {
      const DestRegName = simLib.Sim86_RegisterNameFromOperand(Instruction.Operands[0].Register).toUpperCase();

      if (Instruction.Operands[1].Immediate) {
        registers[DestRegName] = Instruction.Operands[1].Immediate.Value;
      } else if (Instruction.Operands[1].Register) {
        const SourceRegName = simLib.Sim86_RegisterNameFromOperand(Instruction.Operands[1].Register).toUpperCase();
        const value = registers[SourceRegName];
        registers[DestRegName] = value;
      } else {
        throw new Error("Not implemented");
      }
    } else {
      throw new Error("Not implemented");
    }
  }
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
