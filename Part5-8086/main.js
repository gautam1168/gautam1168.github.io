let simLib;
let registers = {
  A: 0x0,
  B: 0x0,
  C: 0x0,
  D: 0x0,
  SP: 0x0,
  BP: 0x0,
  SI: 0x0,
  DI: 0x0,
  get AX() {
    return this.A;
  },
  set AX(val) {
    this.A = val;
  },
  get AL() {
    return this.A & 0xff;
  },
  get AH() {
    return this.A >> 8;
  }
};

export async function main() {
  renderRegisters();
  simLib = await loadLibrary();
  connectInput();
}

function connectInput() {
  const chooser = document.querySelector("input#chooser");
  chooser.addEventListener("change", loadBinary);
}

async function loadBinary(ev) {
  const file = ev.target.files[0];
  const buffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(buffer);

  renderRawBytes(fileBytes);
  const asm = generateAsm(fileBytes);

  renderAsm(asm);
  prepareForExecute(asm);
  renderRegisters();
}

function prepareForExecute(asm) {
  const stepper = document.querySelector("#stepper");  
  stepper.addEventListener("click", () => {
    executeInstruction(asm.instruction);
    renderRegisters();
  });
}

function renderAsm(asm) {
  const display = document.querySelector("#display #asm");

  display.innerText = asm.serialized;
}

function renderRawBytes(fileBytes) {
  const display = document.querySelector("#display #binary");

  let serialized = '';
  for (let i = 0; i < fileBytes.length; ++i) {
    serialized += fileBytes[i].toString(16).padStart(2, '0') + ' ';
  }

  display.innerText = serialized;
}

function generateAsm(fileBytes) {
  const instruction = simLib.Sim86_Decode8086Instruction(fileBytes);
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

  return {
    serialized: `${OpName} ${DestOperandAsString}, ${SourceOperandAsString}`,
    instruction
  };
}

function executeInstruction(Instruction) {
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

function renderRegisters() {
  const display = document.querySelector("#display #registers");

  const MakeBits = (register) => {
    const bitString = register.toString(2).padStart(16, '0');
    return bitString.split("").map(it => `<div class="bit">${it}</div>`).join("");
  };

  display.innerHTML = `
    <div id="datagroup">
      <div id="A" class="reg">
        ${MakeBits(registers.A)}
      </div>
      <div id="B" class="reg">
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
      </div>
      <div id="C" class="reg">
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
      </div>
      <div id="D" class="reg">
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
      </div>
    </div>
    <div id="pointergroup">
      <div id="SP" class="reg">
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
      </div>
      <div id="BP" class="reg">
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
      </div>
      <div id="SI" class="reg">
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
      </div>
      <div id="DI" class="reg">
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
        <div class="bit"></div>
      </div>
    </div>
  `;
}
