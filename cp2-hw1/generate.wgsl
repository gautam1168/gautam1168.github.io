struct cluster
{
  Lat: f32,
  Lon: f32,
  Spread: f32
}

@group(0) @binding(0) var<storage, read_write> characters: array<u32>;
@group(0) @binding(1) var<storage, read> random: array<f32>;
@group(0) @binding(2) var<storage, read> Cluster: array<cluster>;

const LineLength: u32 = 25;

const char_x: u32 = 120;
const char_y: u32 = 121;
const char_dot: u32 = 46;
const char_comma: u32 = 44;
const char_colon: u32 = 58;
const char_openbrace: u32 = 123;
const char_closebrace: u32 = 125;
const char_quot: u32 = 34;
const char_space: u32 = 32;
const char_minus: u32 = 45;
const dig_0: u32 = 48;

fn GetDigits(Number: f32) -> array<u32, 16>
{
  var TempBuffer = array<u32, 16>();
  var Cursor: u32 = 0;

  var FractAndWhole = modf(Number);
  if (Number < 0)
  {
    FractAndWhole = modf(-Number);
  }

  var Whole: u32 = u32(FractAndWhole.whole);
  if (Whole == 0)
  {
    TempBuffer[Cursor] = dig_0;
    Cursor += 1;
  }
  else
  {
    for (;(Whole > 0 && Cursor < 16);)
    {
      var Digit: u32 = Whole % 10;
      TempBuffer[Cursor] = dig_0 + Digit;
      Cursor += 1;
      Whole = Whole / 10;
    }
  }

  if (Number < 0)
  {
    TempBuffer[Cursor] = char_minus; 
    Cursor += 1;
  }

  var NumDigsBeforeDecimal: u32 = Cursor;
  TempBuffer[Cursor] = char_dot;
  Cursor += 1;

  var DecimalDigs:u32 = u32(FractAndWhole.fract * 100000000);
  for (;(DecimalDigs > 0 && Cursor < 16);)
  {
    var Digit: u32 = DecimalDigs % 10;
    TempBuffer[Cursor] = dig_0 + Digit;
    Cursor += 1;
    DecimalDigs = DecimalDigs / 10;
  }

  var Result = array<u32, 16>();

  var ResultCursor: u32 = 0;
  for (var Index = NumDigsBeforeDecimal - 1; 
    Index > 0; 
    Index = Index - 1)
  {
    Result[ResultCursor] = TempBuffer[Index]; 
    ResultCursor += 1;
  }

  Result[ResultCursor] = TempBuffer[0]; 
  ResultCursor += 1;

  Result[ResultCursor] = char_dot; 
  ResultCursor += 1;
  
  for (var Index = Cursor - 1; 
    Index > NumDigsBeforeDecimal; 
    Index = Index - 1)
  {
    Result[ResultCursor] = TempBuffer[Index];
    ResultCursor += 1;
  }

  return Result;
}

fn writeToData(offset: u32, word1: u32, word2: u32, word3: u32, word4: u32)
{
  characters[offset] = (word4 << 24) | (word3 << 16) | (word2 << 8) | word1;
}

@compute @workgroup_size(1) fn computeSomething(
  @builtin(global_invocation_id) id: vec3<u32>
)
{
  var randomOffset = id.x * 4;
  var offset = id.x * LineLength;

  writeToData(offset, char_openbrace, char_quot, char_x, dig_0);
  offset += 1;
  var Digits = GetDigits(Cluster[0].Lon + (random[randomOffset]*2*Cluster[0].Spread - Cluster[0].Spread));
  randomOffset += 1;
  writeToData(offset, char_quot, char_colon, Digits[0], Digits[1]);
  offset += 1;
  writeToData(offset, Digits[2], Digits[3], Digits[4], Digits[5]);
  offset += 1;
  writeToData(offset, Digits[6], Digits[7], Digits[8], Digits[9]);
  offset += 1;
  writeToData(offset, Digits[10], Digits[11], Digits[12], Digits[13]);
  offset += 1;
  writeToData(offset, Digits[14], Digits[15], char_comma, char_quot);
  offset += 1;
  writeToData(offset, char_y, dig_0, char_quot, char_colon);
  offset += 1;

  Digits = GetDigits(Cluster[0].Lat + (random[randomOffset]*2*Cluster[0].Spread - Cluster[0].Spread));
  randomOffset += 1;
  writeToData(offset, Digits[0], Digits[1], Digits[2], Digits[3]);
  offset += 1;
  writeToData(offset, Digits[4], Digits[5], Digits[6], Digits[7]);
  offset += 1;
  writeToData(offset, Digits[8], Digits[9], Digits[10], Digits[11]);
  offset += 1;
  writeToData(offset, Digits[12], Digits[13], Digits[14], Digits[15]);
  offset += 1;
  writeToData(offset, char_comma, char_quot, char_x, dig_0 + 1);
  offset += 1;

  Digits = GetDigits(Cluster[1].Lon + (random[randomOffset]*2*Cluster[1].Spread - Cluster[1].Spread));
  randomOffset += 1;
  writeToData(offset, char_quot, char_colon, Digits[0], Digits[1]);
  offset += 1;
  writeToData(offset, Digits[2], Digits[3], Digits[4], Digits[5]); 
  offset += 1;
  writeToData(offset, Digits[6], Digits[7], Digits[8], Digits[9]);
  offset += 1;
  writeToData(offset, Digits[10], Digits[11], Digits[12], Digits[13]);
  offset += 1;
  writeToData(offset, Digits[14], Digits[15], char_comma, char_quot);
  offset += 1;
  writeToData(offset, char_y, dig_0 + 1, char_quot, char_colon);
  offset += 1;

  Digits = GetDigits(Cluster[1].Lat + (random[randomOffset]*2*Cluster[1].Spread - Cluster[1].Spread));
  randomOffset += 1;
  writeToData(offset, Digits[0], Digits[1], Digits[2], Digits[3]);
  offset += 1;
  writeToData(offset, Digits[4], Digits[5], Digits[6], Digits[7]);
  offset += 1;
  writeToData(offset, Digits[8], Digits[9], Digits[10], Digits[11]);
  offset += 1;
  writeToData(offset, Digits[12], Digits[13], Digits[14], Digits[15]);
  offset += 1;
  writeToData(offset, char_closebrace, char_comma, char_space, char_space);
  offset += 1;

  for (var index: u32 = offset; index < (id.x + 1) * LineLength; index = index + 1)
  {
    writeToData(offset, char_space, char_space, char_space, char_space);
    offset += 1;
  }
}
