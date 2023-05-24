function CreateGlobe(Data)
{
  const globe = Globe()
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
  (document.getElementById('globeViz'));
  
  

  if (false)
  {
    const Points = (Data.pairs.slice(0, 1 << 13)).map(pair => ({ 
      coords: [[pair.x0, pair.y0], [pair.x1, pair.y1]] 
    }));

    globe
      .width(800)
      .height(800)
      .pathsData(Points)
      .pathPoints('coords')
      .pathPointLat(p => p[1])
      .pathPointLng(p => p[0])
      .pathColor(() => "#ff0000");
  } 
  else if (true)
  {
    const Points = (Data.pairs.slice(0, 1 << 12)).flatMap(pair => [
      {
        lat: pair.x0,
        lng: pair.y0,
        size: 0.01,
        color: "#ff0000"
      },
      {
        lat: pair.x1,
        lng: pair.y1,
        size: 0.01,
        color: "#00ff00"
      }
    ]);
    
      globe
        .width(500)
        .height(500)
        .pointsData(Points)
        .pointAltitude('size')
        .pointColor('color');
  }
  else
  {
    fetch('./cables.json')
      .then(r => r.json())
      .then(cablesGeo => {
        let cablePaths = [];
        cablesGeo.features.forEach(({ geometry, properties }) => {
          geometry.coordinates.forEach(coords => cablePaths.push({ coords, properties }));
        });

        globe
          .pathsData(cablePaths)
          .pathPoints('coords')
          .pathPointLat(p => p[1])
          .pathPointLng(p => p[0])
          .pathColor(path => path.properties.color)
          .pathLabel(path => path.properties.name)
          // .pathDashLength(0.1)
          // .pathDashGap(0.008)
          // .pathDashAnimateTime(12000);
      });
  }
}

// CreateGlobe();

function generateCoordinatePairs(NumPairs)
{
  // lat: -90,90
  // lon: -180,180
  const Cluster1 = { lat: 20, lon: 70};
  const Cluster2 = { lat: -30, lon: -130};

  const Coords = new Float32Array(NumPairs * 4);
  for (let CoordIndex = 0; CoordIndex < Coords.length; CoordIndex += 4)
  {
    // lon,lat,lon,lat
    Coords[CoordIndex] = Cluster1.lon + (Math.random()*20 - 10); // Math.random()*80 - 40;
    Coords[CoordIndex + 1] = Cluster1.lat + (Math.random()*20 - 10); // Math.random()*40;
    Coords[CoordIndex + 2] = Cluster2.lon + (Math.random()*20 - 10); // Math.random()*80 - 40;
    Coords[CoordIndex + 3] = Cluster2.lat + (Math.random()*20 - 10); // Math.random()*40;
  }

  let JsonFrag = new Array(NumPairs);
  let CoordIndex = 0;
  for (let PairIndex = 0; PairIndex < NumPairs; ++PairIndex)
  {
    JsonFrag[PairIndex] = `{"x0": ${Coords[CoordIndex++]}, "y0": ${Coords[CoordIndex++]}, "x1": ${Coords[CoordIndex++]}, "y1": ${Coords[CoordIndex++]} }
  `;
  }
  return JsonFrag.join(',');
}

function setAndCreate(NumPoints)
{
  const DatapointsInput = document.querySelector("#generation input");
  DatapointsInput.value = NumPoints;
  createAFile();
}

function AddStringToBuffer(Dictionary, Buffer, Cursor, Value)
{
  for (let Index = 0; Index < Value.length; ++Index)
  {
    const SingleCharacterString = Value[Index];
    const Character = Dictionary[SingleCharacterString];
    Buffer[Cursor++] = Character;
  }
  return Cursor;
}

function AddNumberToBuffer(Dictionary, Buffer, Cursor, Value)
{
  Value = Value.toString();
  for (let Index = 0; Index < Value.length; ++Index)
  {
    const SingleCharacterString = Value[Index];
    const Character = Dictionary[SingleCharacterString];
    Buffer[Cursor++] = Character;
  }

  return Cursor;
}

function GeneratePairsInBinary(NumPairs)
{
  const BytesPerBrace = 1;
  const BytesPerQuote = 1;
  const BytesPerColon = 1;
  const BytesPerComma = 1;
  const BytesPerCharacter = 1;
  const BytesPerMantissa = 14;
  const BytesPerSign = 1;
  const BytesPerDecimal = 1;
  const BytesPerNumber = BytesPerSign + 3 * BytesPerCharacter + BytesPerDecimal + BytesPerMantissa;
  const BytesPerLabel = 2 * BytesPerQuote + 2 * BytesPerCharacter + BytesPerColon;
  const BytesPerPair = 2 * BytesPerBrace + 4 * BytesPerLabel + 4 * BytesPerNumber + 3 * BytesPerComma;
  const BytesForAllPairs = 2 * BytesPerBrace + NumPairs * BytesPerPair + (NumPairs - 1) * BytesPerComma;

  const BytesForWordPairs = 5 * BytesPerCharacter + 2 * BytesPerQuote + BytesPerColon + 2 * BytesPerBrace;

  const TotalBytes = BytesForWordPairs + BytesForAllPairs;

  const Result = new Uint8Array(TotalBytes);
  let ByteCursor = 0;

  const Dictionary = {
    "-": "-".charCodeAt(0),
    "{": "{".charCodeAt(0),
    "}": "}".charCodeAt(0),
    '"': '"'.charCodeAt(0),
    ".": ".".charCodeAt(0),
    ",": ",".charCodeAt(0),
    "[": "[".charCodeAt(0),
    "]": "]".charCodeAt(0),
    "x": "x".charCodeAt(0),
    "y": "y".charCodeAt(0),
    "0": "0".charCodeAt(0),
    "1": "1".charCodeAt(0),
    "2": "2".charCodeAt(0),
    "3": "3".charCodeAt(0),
    "4": "4".charCodeAt(0),
    "5": "5".charCodeAt(0),
    "6": "6".charCodeAt(0),
    "7": "7".charCodeAt(0),
    "8": "8".charCodeAt(0),
    "9": "9".charCodeAt(0),
    "p": "p".charCodeAt(0),
    "a": "a".charCodeAt(0),
    "i": "i".charCodeAt(0),
    "r": "r".charCodeAt(0),
    "s": "s".charCodeAt(0),
    ":": ":".charCodeAt(0),
    " ": " ".charCodeAt(0)
  };

  ByteCursor = AddStringToBuffer(Dictionary, Result, ByteCursor, '{"pairs":[');

  const Cluster1 = { lat: 20, lon: 70};
  const Cluster2 = { lat: -30, lon: -130};

  const Coords = new Float32Array(NumPairs * 4);
  for (let CoordIndex = 0; CoordIndex < Coords.length; CoordIndex += 4)
  {
    // lon,lat,lon,lat
    Coords[CoordIndex] = Cluster1.lon + (Math.random()*20 - 10); // Math.random()*80 - 40;
    Coords[CoordIndex + 1] = Cluster1.lat + (Math.random()*20 - 10); // Math.random()*40;
    Coords[CoordIndex + 2] = Cluster2.lon + (Math.random()*20 - 10); // Math.random()*80 - 40;
    Coords[CoordIndex + 3] = Cluster2.lat + (Math.random()*20 - 10); // Math.random()*40;
  }

  let CoordIndex = 0;
  for (let PairIndex = 0; PairIndex < NumPairs; ++PairIndex)
  {
    ByteCursor = AddStringToBuffer(Dictionary, Result, ByteCursor, '{"x0":');
    ByteCursor = AddNumberToBuffer(Dictionary, Result, ByteCursor, Coords[CoordIndex++]);

    ByteCursor = AddStringToBuffer(Dictionary, Result, ByteCursor, ',"y0":');
    ByteCursor = AddNumberToBuffer(Dictionary, Result, ByteCursor, Coords[CoordIndex++]);
    
    ByteCursor = AddStringToBuffer(Dictionary, Result, ByteCursor, ',"x1":');
    ByteCursor = AddNumberToBuffer(Dictionary, Result, ByteCursor, Coords[CoordIndex++]);

    ByteCursor = AddStringToBuffer(Dictionary, Result, ByteCursor, ',"y1":');
    ByteCursor = AddNumberToBuffer(Dictionary, Result, ByteCursor, Coords[CoordIndex++]);
    ByteCursor = AddStringToBuffer(Dictionary, Result, ByteCursor, '},');
  }

  ByteCursor = AddStringToBuffer(Dictionary, Result, ByteCursor - 1, ']}');
  while (ByteCursor < TotalBytes)
  {
    Result[ByteCursor++] = Dictionary[' '];
  }
  
  return Result;
}

function PagesForBytes(NumBytes)
{
  const BytesPerPage = 65536;
  return Math.ceil(NumBytes / BytesPerPage);
}

async function GeneratePairsInBinaryWasm(NumPairs)
{
  const BytesPerBrace = 1;
  const BytesPerQuote = 1;
  const BytesPerColon = 1;
  const BytesPerComma = 1;
  const BytesPerCharacter = 1;
  const BytesPerMantissa = 14;
  const BytesPerSign = 1;
  const BytesPerDecimal = 1;
  const BytesPerNumber = BytesPerSign + 3 * BytesPerCharacter + BytesPerDecimal + BytesPerMantissa;
  const BytesPerLabel = 2 * BytesPerQuote + 2 * BytesPerCharacter + BytesPerColon;
  const BytesPerPair = 2 * BytesPerBrace + 4 * BytesPerLabel + 4 * BytesPerNumber + 3 * BytesPerComma;
  const BytesForAllPairs = 2 * BytesPerBrace + NumPairs * BytesPerPair + (NumPairs - 1) * BytesPerComma;

  const BytesForWordPairs = 5 * BytesPerCharacter + 2 * BytesPerQuote + BytesPerColon + 2 * BytesPerBrace;

  const TotalBytesForJSON = BytesForWordPairs + BytesForAllPairs;
  const SizeOfFloat = 4;
  const TotalBytesForRandoms = 4 * NumPairs * SizeOfFloat;

  const WasmMemory = new WebAssembly.Memory({ 
    initial: PagesForBytes(TotalBytesForJSON + TotalBytesForRandoms) + 5 // 5pages for the program 
  });

  const importObject = {
    env: {
      memory: WasmMemory,
      random: Math.random 
    }
  };

  let instance;
  try {
    const module = await WebAssembly.instantiateStreaming(
      fetch("./generate.wasm"), importObject
    );
    instance = module.instance;
  } catch (err) {
    console.error("Error in instantiating: ", err);
  }
  const BaseOffset = instance.exports.__heap_base;

  const Cluster1 = { lat: 20, lon: 70};
  const Cluster2 = { lat: -30, lon: -130};

  const Coords = new Float32Array(WasmMemory.buffer, BaseOffset);
  for (let CoordIndex = 0; CoordIndex < Coords.length; CoordIndex += 4)
  {
    // lon,lat,lon,lat
    Coords[CoordIndex] = Cluster1.lon + (Math.random()*20 - 10); // Math.random()*80 - 40;
    Coords[CoordIndex + 1] = Cluster1.lat + (Math.random()*20 - 10); // Math.random()*40;
    Coords[CoordIndex + 2] = Cluster2.lon + (Math.random()*20 - 10); // Math.random()*80 - 40;
    Coords[CoordIndex + 3] = Cluster2.lat + (Math.random()*20 - 10); // Math.random()*40;
  }

  
  const MaxMemory = WasmMemory.buffer.byteLength - BaseOffset;
  const JsonStringLength = instance.exports.Generate(BaseOffset, NumPairs, MaxMemory);
  debugger
  const Result = new Uint8Array(WasmMemory.buffer, BaseOffset + TotalBytesForRandoms, JsonStringLength);
  return Result;
}

async function createAFile()
{
  const DataPoints = document.querySelector("#generation input");
  const NumPairs = parseInt(DataPoints.value);

  const FileHandle =  await window.showSaveFilePicker();
  const WritableStream = await FileHandle.createWritable();
  if (true)
  {
    const DefaultWriter = WritableStream.getWriter();
    await DefaultWriter.ready;
    const DataBuffer = await GeneratePairsInBinaryWasm(NumPairs);
    DefaultWriter.write(DataBuffer);
    await DefaultWriter.ready;
    DefaultWriter.close();
    alert("Finished!");
  }
  else
  {
    await WritableStream.write('{"pairs": [');
    const Points = generateCoordinatePairs(NumPairs);
    await WritableStream.write(Points);
    await WritableStream.write(']}');
    await WritableStream.close();
  }
}

async function showFileContents()
{
  const [FileHandle] = await window.showOpenFilePicker();
  const FileObj = await FileHandle.getFile();
  const FileText = await FileObj.text();
  const PointsData = JSON.parse(FileText);
  CreateGlobe(PointsData);
  /*
  const Points = new Promise((resolve, reject) => {
    const Reader = new FileReader();
    Reader.addEventListener(
      "load", 
      () => {
        resolve(JSON.parse(Reader.result));
      }, 
      false
    );

    Reader.readAsText(FileObj);
  })
  */
}

window.onload = function ()
{
  let button = document.querySelector("#generation button#write-10k");
  button.addEventListener("click", () => setAndCreate(1 << 24));
  
  button = document.querySelector("#visualization button");
  button.addEventListener("click", showFileContents);
}

