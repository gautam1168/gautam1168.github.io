let simLib;
let registers = {
  A: 0x0,
  get AX() {
    return this.A;
  },
  set AX(val) {
    this.A = val;
  },
  get AL() {
    return this.A & 0xff;
  },
  set AL(val) {
    const currentAH = this.A >> 8; 
    const newAX = (currentAH << 8) | val;
    this.A = newAX;
  },
  get AH() {
    return this.A >> 8;
  },
  set AH(val) {
    const currentAL = this.A & 0xff; 
    const newAX = (val << 8) | currentAL;
    this.A = newAX;
  },

  B: 0x0,
  get BX() {
    return this.B;
  },
  set BX(val) {
    this.B = val;
  },
  get BL() {
    return this.B & 0xff;
  },
  set BL(val) {
    const currentBH = this.B >> 8; 
    const newBX = (currentBH << 8) | val;
    this.B = newBX;
  },
  get BH() {
    return this.B >> 8;
  },
  set BH(val) {
    const currentBL = this.B & 0xff; 
    const newBX = (val << 8) | currentBL;
    this.B = newBX;
  },

  C: 0x0,
  get CX() {
    return this.C;
  },
  set CX(val) {
    this.C = val;
  },
  get CL() {
    return this.C & 0xff;
  },
  set CL(val) {
    const currentCH = this.C >> 8; 
    const newCX = (currentCH << 8) | val;
    this.C = newCX;
  },
  get CH() {
    return this.C >> 8;
  },
  set CH(val) {
    const currentCL = this.C & 0xff; 
    const newCX = (val << 8) | currentCL;
    this.C = newCX;
  },

  D: 0x0,
  get DX() {
    return this.D;
  },
  set DX(val) {
    this.D = val;
  },
  get DL() {
    return this.D & 0xff;
  },
  set DL(val) {
    const currentDH = this.D >> 8; 
    const newDX = (currentDH << 8) | val;
    this.D = newDX;
  },
  get DH() {
    return this.D >> 8;
  },
  set DH(val) {
    const currentDL = this.D & 0xff; 
    const newDX = (val << 8) | currentDL;
    this.D = newDX;
  },

  SP: 0x0,
  BP: 0x0,
  SI: 0x0,
  DI: 0x0,
  DS: 0x0,
  SS: 0x0,
  ES: 0x0
};

let program = {
  asm: [],
  current: 0
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

  renderRawBytes(fileBytes);
  const asm = generateAsm(fileBytes);

  renderAsm(asm);
  prepareForExecute(asm);
  renderRegisters();
}

function prepareForExecute(asm) {
  program.asm = asm;
  program.current = 0;
}

function renderAsm(asm) {
  const display = document.querySelector("#display #asm");

  display.innerHTML = asm.map((it, i) => {
    return `<div id="instruction" class="${i == 0 ? 'selected':''}">${it.serialized}</div>`;
  }).join("")
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
        <div id="A" class="reg">
          ${MakeBits(registers.A)}
        </div>
      </div>
      <div class="reglabelcontainer">
        B
        <div id="B" class="reg">
          ${MakeBits(registers.B)}
        </div>
      </div>
      <div class="reglabelcontainer">
        C
        <div id="C" class="reg">
          ${MakeBits(registers.C)}
        </div>
      </div>
      <div class="reglabelcontainer">
        D
        <div id="D" class="reg">
          ${MakeBits(registers.D)}
        </div>
      </div>
    </div>
    <div id="pointergroup">
      <div class="reglabelcontainer">
        SP
        <div id="SP" class="reg">
          ${MakeBits(registers.SP)}
        </div>
      </div>
      <div class="reglabelcontainer">
        BP
        <div id="BP" class="reg">
          ${MakeBits(registers.BP)}
        </div>
      </div>
      <div class="reglabelcontainer">
        SI
        <div id="SI" class="reg">
          ${MakeBits(registers.SI)}
        </div>
      </div>
      <div class="reglabelcontainer">
        DI
        <div id="DI" class="reg">
          ${MakeBits(registers.DI)}
        </div>
      </div>
    </div>
    <div id="specialgroup">
      <div class="reglabelcontainer">
        SS
        <div id="SS" class="reg">
          ${MakeBits(registers.SS)}
        </div>
      </div>
      <div class="reglabelcontainer">
        DS
        <div id="DS" class="reg">
          ${MakeBits(registers.DS)}
        </div>
      </div>
      <div class="reglabelcontainer">
        ES
        <div id="ES" class="reg">
          ${MakeBits(registers.ES)}
        </div>
      </div>
    </div>
  `;
}
