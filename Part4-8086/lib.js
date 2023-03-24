async function loadLibrary() {
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

  const MaxMemory = BigInt(view.length - instance.exports.__heap_base);

  function Sim86_GetVersion() {
    return instance.exports.Sim86_GetVersion();
  }

  function Sim86_Decode8086Instruction(sourceBytes) {
    // encode
    if (!(sourceBytes instanceof Uint8Array)) {
      throw new Error("sourceBytes must be provided as a Uint8Array");
    }

    for (let i = 0; i < sourceBytes.length; ++i) {
      view[instance.exports.__heap_base + i] = sourceBytes[i];
    }

    const offset = instance.exports.__heap_base;
    const resultOffset = offset + (1 << 20);

    // call
    instance.exports.Sim86_Decode8086Instruction(sourceBytes.length, offset, resultOffset);

    // decode
    const wordExtractor = new Uint32Array(view.buffer, resultOffset);

    const result = {
      Address: wordExtractor[0], // u32
      Size: wordExtractor[1], //u32
      Op: wordExtractor[2],
      Flags: wordExtractor[3], //u32
      Operands: [
        {
          Type: 0, // 0: None, 1: Register, 2: Memory, 3: Immediate
          Immediate: null,
          Register: null,
          Address: null
        }, 
        {
          Type: 0,
          Immediate: null,
          Register: null,
          Address: null
        }
      ],
      SegmentOverride: null
    };

    let nextWordIndex = 4;
    for (let i = 0; i < 2; ++i) {
      const Operand = result.Operands[i];
      const OperandType = wordExtractor[nextWordIndex++];
      Operand.Type = OperandType;
      if (OperandType == 1) {
        Operand.Register = {
          Index: wordExtractor[nextWordIndex++],
          Offset: wordExtractor[nextWordIndex++],
          Count: wordExtractor[nextWordIndex++],
        };
        nextWordIndex += 8;
      } else if (OperandType == 2) {
        Operand.Address = {
          ExplicitSegment: wordExtractor[nextWordIndex++],
          Displacement: wordExtractor[nextWordIndex++],
          Flags: wordExtractor[nextWordIndex++],
          Terms: [
            {
              Scale: wordExtractor[nextWordIndex++],
              Register: {
                Index: wordExtractor[nextWordIndex++],
                Offset: wordExtractor[nextWordIndex++],
                Count: wordExtractor[nextWordIndex++],
              }
            },
            {
              Scale: wordExtractor[nextWordIndex++],
              Register: {
                Index: wordExtractor[nextWordIndex++],
                Offset: wordExtractor[nextWordIndex++],
                Count: wordExtractor[nextWordIndex++],
              }
            }
          ]
        };
      } else if (OperandType == 3) {
        Operand.Immediate = {
          Value: wordExtractor[nextWordIndex++],
          Flags: wordExtractor[nextWordIndex++],
        };
        nextWordIndex += 9;
      }
    }

    result.SegmentOverride = wordExtractor[nextWordIndex];
    return result;
  }

  function readStringFromOffset(view, offset) {
    const wordExtractor = new Uint32Array(view.buffer, offset);
    const Length = wordExtractor[0];
    const resultBytes = new Uint8Array(view.buffer, offset + 4);
    const result = String.fromCharCode.apply(null, resultBytes.slice(0, Length));	
    return result;
  }

  function Sim86_RegisterNameFromOperand({ Index, Offset, Count }) {
    const wordView = new Uint32Array(view.buffer, instance.exports.__heap_base);
    wordView[0] = Index;
    wordView[1] = Offset;
    wordView[2] = Count;
    const resultOffset = instance.exports.Sim86_RegisterNameFromOperandWasm(
      instance.exports.__heap_base
    );

    return readStringFromOffset(view, resultOffset);
  }

  function Sim86_MnemonicFromOperationType(Type) {
    const resultOffset = instance.exports.Sim86_MnemonicFromOperationTypeWasm(
      Type, instance.exports.__heap_base
    )   

    return readStringFromOffset(view, resultOffset);
  }

  function Sim86_Get8086InstructionTable() {
    instance.exports.Sim86_Get8086InstructionTableWasm(instance.exports.__heap_base, MaxMemory);		

    const outputView = view.slice(instance.exports.__heap_base + (1 << 20));
    const wordView = new Uint32Array(outputView.buffer);

    const getEncoding = function (index) {
      const EncodingIndex = 2 * index;
      const Bits = new Uint8Array(this.Encodings.buffer, EncodingIndex + 1);
      return {
        Op: this.Encodings[EncodingIndex],
        Bits: {
          Usage: Bits[0],
          BitCount: Bits[1],
          Shift: Bits[2],
          Value: Bits[3]
        }
      };
    }

    return {
      Encodings: new Uint32Array(wordView.buffer, 2 * 4),
      EncodingCount: wordView[0],
      MaxInstructionByteCount: wordView[1],
      getEncoding
    };
  }

  function TriggerTrap() {
    instance.exports.TriggerTrap();
  }

  return {
    Sim86_GetVersion,
    Sim86_Decode8086Instruction,
    Sim86_RegisterNameFromOperand,
    Sim86_MnemonicFromOperationType,
    Sim86_Get8086InstructionTable,
    TriggerTrap
  };
}

