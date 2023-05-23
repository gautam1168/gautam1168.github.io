function CreateGlobe(Data)
{
  const globe = Globe()
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
  (document.getElementById('globeViz'));
  
  const Points = Data.pairs.map(pair => ({ 
    coords: [[pair.x0, pair.y0], [pair.x1, pair.y1]] 
  }));

  if (true)
  {
    globe
      .pathsData(Points)
      .pathPoints('coords')
      .pathPointLat(p => p[1])
      .pathPointLng(p => p[0])
      .pathColor(() => "#ff0000");
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

        debugger
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
  const Cluster2 = { lat: -40, lon: -130};

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

async function createAFile()
{
  const DataPoints = document.querySelector("#generation input");

  const FileHandle =  await window.showSaveFilePicker();
  const WritableStream = await FileHandle.createWritable();
  await WritableStream.write('{"pairs": [');
  const Points = generateCoordinatePairs(DataPoints.value);
  await WritableStream.write(Points);
  await WritableStream.write(']}');
  await WritableStream.close();
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
  button.addEventListener("click", () => setAndCreate(64));
  
  button = document.querySelector("#visualization button");
  button.addEventListener("click", showFileContents);
}
