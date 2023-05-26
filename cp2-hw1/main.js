window.state = 
{
  lastComputation: {
    instance: null,
    pairs: null,
    numpairs: null,
    wasmMemory: null
  },
  vis: {
    globe: null,
    points: null
  }
};

function createGlobe()
{
  const globe = Globe()
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
    .width(800)
    .height(800)
  (document.getElementById('globeViz'));
  
  window.state.vis.globe = globe;
}

createGlobe();

function plotData(Data)
{
  const globe = window.state.vis.globe;

  if (false)
  {
    const Points = (Data.pairs.slice(0, 1 << 13)).map(pair => ({ 
      coords: [[pair.x0, pair.y0], [pair.x1, pair.y1]] 
    }));

    globe
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
        lat: pair.y0,
        lng: pair.x0,
        size: 0.01,
        color: "#ff0000"
      },
      {
        lat: pair.y1,
        lng: pair.x1,
        size: 0.01,
        color: "#00ff00"
      }
    ]);
    
      globe
        .width(800)
        .height(800)
        .pointsData(Points)
        .pointAltitude('size')
        .pointColor('color')
        .pointsMerge(true);
  }
}

function plotFromArray(Data)
{
  const globe = window.state.vis.globe;

  const Points = new Array(Data.length / 2);
  let PointIndex = 0;
  for (let CoordIndex = 0; CoordIndex < Data.length; CoordIndex += 4)
  {
    Points[PointIndex++] = {
      lng: Data[CoordIndex],
      lat: Data[CoordIndex + 1],
      size: 0.01,
      color: "#ff0000"
    };

    Points[PointIndex++] = {
      lng: Data[CoordIndex + 2],
      lat: Data[CoordIndex + 3],
      size: 0.01,
      color: "#00ff00"
    };
  }

  globe
    .pointsData(Points)
    .pointAltitude('size')
    .pointColor('color')
    .pointsMerge(true);
}

function resetPoints()
{
  window.state.vis.globe
    .pointsData([]);
}

function setAndCreate()
{
  const DatapointsInput = document.querySelector("#generation input");
  NumPoints = DatapointsInput.value;
  createAFile();
}

function PagesForBytes(NumBytes)
{
  const BytesPerPage = 65536;
  return Math.ceil(NumBytes / BytesPerPage);
}

async function GeneratePairsInBinaryWasm(NumPairs, spread, lat1, lon1, lat2, lon2)
{
  let instance, WasmMemory;
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

  if (NumPairs !== window.state.lastComputation.numPairs)
  {
    WasmMemory = new WebAssembly.Memory({ 
      initial: PagesForBytes(TotalBytesForJSON + TotalBytesForRandoms) + 5 // 5pages for the program 
    });

    const importObject = {
      env: {
        memory: WasmMemory,
        random: Math.random,
        sin: Math.sin,
        cos: Math.cos,
        sqrt: Math.sqrt,
        asin: Math.asin
      }
    };

    try {
      const module = await WebAssembly.instantiateStreaming(
        fetch("./generate.wasm"), importObject
      );
      instance = module.instance;
    } catch (err) {
      console.error("Error in instantiating: ", err);
    }
    window.state.lastComputation.instance = instance;
    window.state.lastComputation.numPairs = NumPairs;
    window.state.lastComputation.wasmMemory = WasmMemory;
  }
  else
  {
    instance = window.state.lastComputation.instance;
    WasmMemory = window.state.lastComputation.wasmMemory;
  }

  const BaseOffset = instance.exports.__heap_base;

  lat1 = lat1 || 0;
  lon1 = lon1 || 0;

  lat2 = lat2 || 0;
  lon2 = lon2 || 30;

  const Cluster1 = { lat: lat1, lon: lon1 };
  const Cluster2 = { lat: lat2, lon: lon2 };

  const Coords = new Float32Array(WasmMemory.buffer, BaseOffset, NumPairs * 4);
  for (let CoordIndex = 0; CoordIndex < Coords.length; CoordIndex += 4)
  {
    // lon,lat,lon,lat
    Coords[CoordIndex] = Cluster1.lon + (Math.random()*2*spread - spread); // Math.random()*80 - 40;
    Coords[CoordIndex + 1] = Cluster1.lat + (Math.random()*2*spread - spread); // Math.random()*40;
    Coords[CoordIndex + 2] = Cluster2.lon + (Math.random()*2*spread - spread); // Math.random()*80 - 40;
    Coords[CoordIndex + 3] = Cluster2.lat + (Math.random()*2*spread - spread); // Math.random()*40;
  }
  window.state.lastComputation.pairs = Coords;
  
  const MaxMemory = WasmMemory.buffer.byteLength - BaseOffset;
  const JsonStringLength = instance.exports.Generate(BaseOffset, NumPairs, MaxMemory);
  const Result = new Uint8Array(WasmMemory.buffer, 
    BaseOffset + TotalBytesForRandoms, JsonStringLength);
  return Result;
}

async function GeneratePairsGPU(NumLines, spread, lat1, lon1, lat2, lon2)
{
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device)
  {
    alert("This browser does not support webgpu");
    return;
  }

  const doublingShader = await fetch("./generate.wgsl").then(res => res.text());

  const module = device.createShaderModule({
    label: 'doubling shader',
    code: doublingShader 
  });

  const pipeline = device.createComputePipeline({
    label: 'doubling pipeline',
    layout: 'auto',
    compute: {
      module,
      entryPoint: 'computeSomething'
    }
  });

  const LineLength = 25; // words, where each word is 4 characters

  const input = new Uint32Array(LineLength * NumLines);
  const workBuffer = device.createBuffer({
    label: 'work buffer',
    size: input.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(workBuffer, 0, input);

  const randomNums = new Float32Array(4 * NumLines);
  for (let Index = 0; Index < 4 * NumLines; ++Index)
  {
    randomNums[Index] = Math.random();
  }
  const randBuffer = device.createBuffer({
    label: 'random number buffer',
    size: randomNums.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(randBuffer, 0, randomNums);

  const clusterConfig = new Float32Array([lon1, lat1, spread, lon2, lat2, spread]);
  const clusterBuffer = device.createBuffer({
    label: 'cluster buffer',
    size: clusterConfig.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(clusterBuffer, 0, clusterConfig);

  const resultBuffer = device.createBuffer({
    label: 'result buffer',
    size: input.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  });

  const bindGroup = device.createBindGroup({
    label: 'bindGroup for work buffer',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { 
        binding: 0, 
        resource: { 
          buffer: workBuffer 
        }
      },
      {
        binding: 1,
        resource: {
          buffer: randBuffer
        }
      },
      {
        binding: 2,
        resource: {
          buffer: clusterBuffer
        }
      }
    ]
  });

  const encoder = device.createCommandEncoder({
    label: 'doubling encoder'
  });

  const pass = encoder.beginComputePass({
    label: 'doubling compute pass'
  });

  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(NumLines);
  pass.end();

  encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, resultBuffer.size);

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);

  await resultBuffer.mapAsync(GPUMapMode.READ);
  let result = new Uint32Array(resultBuffer.getMappedRange().slice());
  result = new Uint8Array(result.buffer); 
  resultBuffer.unmap();

  console.log("input: ", input);
  const characters = []; 
  for (let i = 0; i < result.length; ++i)
  {
    characters.push(result[i]);
  }
  console.log("result: ", result, String.fromCharCode.apply(null, characters));
}

async function createAFile()
{
  const DataPoints = document.querySelector("#generation input");
  const cluster1Lon = document.querySelector("#visualization #cluster1 div#longitude input");
  const cluster1Lat = document.querySelector("#visualization #cluster1 div#latitude input");

  const cluster2Lon = document.querySelector("#visualization #cluster2 div#longitude input");
  const cluster2Lat = document.querySelector("#visualization #cluster2 div#latitude input");
  const spread = parseFloat(document.querySelector("input#spread").value);

  const NumPairs = parseInt(DataPoints.value);
  const lat1 = parseFloat(cluster1Lat.value);
  const lon1 = parseFloat(cluster1Lon.value);
  const lat2 = parseFloat(cluster2Lat.value);
  const lon2 = parseFloat(cluster2Lon.value);

  const FileHandle =  await window.showSaveFilePicker();
  const WritableStream = await FileHandle.createWritable();
  const DefaultWriter = WritableStream.getWriter();
  await DefaultWriter.ready;
  const DataBuffer = await GeneratePairsInBinaryWasm(NumPairs, spread, lat1, lon1, lat2, lon2);
  DefaultWriter.write(DataBuffer);
  await DefaultWriter.ready;
  DefaultWriter.close();
  alert("Finished!");
}

async function showFileContents()
{
  const [FileHandle] = await window.showOpenFilePicker();
  const FileObj = await FileHandle.getFile();
  const FileText = await FileObj.text();
  const PointsData = JSON.parse(FileText);
  plotData(PointsData);
}

async function makeBinary()
{
  if (window.state.lastComputation.numPairs)
  {
    const { instance, wasmMemory, numPairs } = window.state.lastComputation;
    const Mean = instance.exports.ComputeHaversines(
      instance.exports.__heap_base, 
      numPairs,
      6378.1);

    console.log("Mean haversine distance is: ", Mean);
    const FileHandle =  await window.showSaveFilePicker();
    const WritableStream = await FileHandle.createWritable();
    const DefaultWriter = WritableStream.getWriter();
    await DefaultWriter.ready;
    const DataBuffer = new Uint8Array(
      wasmMemory.buffer, 
      instance.exports.__heap_base, 
      numPairs * 4 + 1);
    DefaultWriter.write(DataBuffer);
    await DefaultWriter.ready;
    DefaultWriter.close();
    window.state.lastComputation.numPairs = 0;
    alert("Finished! Mean haversine is:" + Mean);
  }
  else
  {
    alert("No data is available! First generate some data then click this button.");
  }
}

function clusterHaversine(lat1, lon1, lat2, lon2)
{
  if (window.state.lastComputation.numPairs)
  {
    const instance = window.state.lastComputation.instance;
    const floatView = new Float32Array(
      window.state.lastComputation.wasmMemory.buffer,
      instance.exports.__heap_base, 
      4
    );

    floatView[0] = lon1;
    floatView[1] = lat1;
    floatView[2] = lon2;
    floatView[3] = lat2;

    const Mean = instance.exports.ComputeHaversines(
        instance.exports.__heap_base, 
        1,
        6378.1);
    return Mean;
  }
  else
  {
    return 0;
  }
}

window.onload = function ()
{
  let button = document.querySelector("#generation button#write-10k");
  button.addEventListener("click", () => setAndCreate()); //1 << 10)); //24));

  button = document.querySelector("#generation button#write-binary");
  button.addEventListener("click", () => makeBinary());
  
  button = document.querySelector("#visualization button#picker");
  button.addEventListener("click", showFileContents);

  button = document.querySelector("#visualization button#reset");
  button.addEventListener("click", resetPoints);
  const PairsInput = document.querySelector("#generation input");

  const cluster1Lat = document.querySelector("#visualization #cluster1 div#latitude input");
  const cluster1LatLabel = document.querySelector("#visualization #cluster1 div#latitude span");

  const cluster1Lon = document.querySelector("#visualization #cluster1 div#longitude input");
  const cluster1LonLabel = document.querySelector("#visualization #cluster1 div#longitude span");

  const cluster2Lat = document.querySelector("#visualization #cluster2 div#latitude input");
  const cluster2LatLabel = document.querySelector("#visualization #cluster2 div#latitude span");

  const cluster2Lon = document.querySelector("#visualization #cluster2 div#longitude input");
  const cluster2LonLabel = document.querySelector("#visualization #cluster2 div#longitude span");

  const spreadSlider = document.querySelector("input#spread");

  cluster1Lon.addEventListener("input", onSlide);

  cluster1Lat.addEventListener("input", onSlide);

  cluster2Lon.addEventListener("input", onSlide);

  cluster2Lat.addEventListener("input", onSlide);

  spreadSlider.addEventListener("input", onSlide);

  async function onSlide(ev) {
    const lat1 = parseFloat(cluster1Lat.value);
    cluster1LatLabel.innerText = lat1;

    const lon1 = parseFloat(cluster1Lon.value);
    cluster1LonLabel.innerText = lon1;

    const lat2 = parseFloat(cluster2Lat.value);
    cluster2LatLabel.innerText = lat2;

    const lon2 = parseFloat(cluster2Lon.value);
    cluster2LonLabel.innerText = lon2;

    const NumPairs = parseInt(PairsInput.value);
    const spread = parseFloat(spreadSlider.value);

    await GeneratePairsInBinaryWasm(NumPairs, spread, lat1, lon1, lat2, lon2);
    GeneratePairsGPU(NumPairs, spread, lat1, lon1, lat2, lon2);
    plotFromArray(window.state.lastComputation.pairs);
    const MeanHaversine = clusterHaversine(lat1, lon1, lat2, lon2);
    console.log(`lat1: ${lat1}, lon1: ${lon1}, lat2: ${lat2}, lon2: ${lon2}, HaverSine between cluster centers: ${MeanHaversine}`);
  }
}

