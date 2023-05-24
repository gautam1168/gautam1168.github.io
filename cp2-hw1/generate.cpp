typedef unsigned char u8;
typedef unsigned short u16;
typedef unsigned int u32;
typedef unsigned long u64;

typedef char s8;
typedef short s16;
typedef int s32;
typedef long s64;

typedef float f32;
typedef double f64;

#define assert(expression) if (!(expression)) { __builtin_trap(); }

typedef struct output_buffer
{
  u8 *Memory;
  s32 Cursor;
} output_buffer;

typedef struct point
{
  f32 Lat;
  f32 Lon;
} point;

// Imported random function from js
extern "C" f32 random();

void
AddString(output_buffer *Buffer, const u8 *String)
{
  while (*String != '\0')
  {
    Buffer->Memory[Buffer->Cursor++] = *String++;
  }
}

void
AddNumber(output_buffer *Buffer, f32 Number)
{
  if (Number < 0)
  {
    Buffer->Memory[Buffer->Cursor++] = '-';
    Number = -Number;
  }
  
  char TempBuffer[50] = {};
  int Length = 0;

  s32 Whole = (s32)Number;
  while (Whole > 0)
  {
    u8 Digit = Whole % 10;
    TempBuffer[Length++] = '0' + Digit;
    Whole = Whole / 10;
  }

  int NumDigsBeforeDecimal = Length;
  TempBuffer[Length++] = '.';

  Number = (Number - s32(Number)) * 1e12;
  unsigned long long DecimalDigs = (unsigned long long)Number;

  
  while (DecimalDigs > 0)
  {
    u8 Digit = DecimalDigs % 10;
    TempBuffer[Length++] = '0' + Digit;
    DecimalDigs = DecimalDigs / 10;
  }

  for (int Index = NumDigsBeforeDecimal - 1; Index >= 0; --Index)
  {
    Buffer->Memory[Buffer->Cursor++] = TempBuffer[Index];
  }

  Buffer->Memory[Buffer->Cursor++] = '.';

  for (int Index = Length - 1; Index > NumDigsBeforeDecimal; --Index)
  {
    Buffer->Memory[Buffer->Cursor++] = TempBuffer[Index];
  }
}

extern "C" s32
Generate(u8 *Memory, u32 NumPairs, u32 MaxMemory)
{
  s32 BytesPerBrace = 1;
  s32 BytesPerQuote = 1;
  s32 BytesPerColon = 1;
  s32 BytesPerComma = 1;
  s32 BytesPerCharacter = 1;
  s32 BytesPerMantissa = 14;
  s32 BytesPerSign = 1;
  s32 BytesPerDecimal = 1;
  s32 BytesPerNumber = BytesPerSign + 3 * BytesPerCharacter + BytesPerDecimal + BytesPerMantissa;
  s32 BytesPerLabel = 2 * BytesPerQuote + 2 * BytesPerCharacter + BytesPerColon;
  s32 BytesPerPair = 2 * BytesPerBrace + 4 * BytesPerLabel + 4 * BytesPerNumber + 3 * BytesPerComma;
  s32 BytesForAllPairs = 2 * BytesPerBrace + NumPairs * BytesPerPair + (NumPairs - 1) * BytesPerComma;

  s32 BytesForWordPairs = 5 * BytesPerCharacter + 2 * BytesPerQuote + BytesPerColon + 2 * BytesPerBrace;

  s32 TotalBytes = BytesForWordPairs + BytesForAllPairs;

  s32 BytesPerFloat = 4;
  assert(TotalBytes + 4 * NumPairs * BytesPerFloat <= MaxMemory);

  f32 *Coords = (f32 *)Memory;

  output_buffer Buffer_ = {};
  output_buffer *Buffer = &Buffer_;
  Buffer->Memory = Memory + 4 * NumPairs * BytesPerFloat;
  Buffer->Cursor = 0;
  
  /*
  point Cluster1 = {20, 70};
  point Cluster2 = {-30, -130};

  for (int CoordIndex = 0;
    CoordIndex < NumPairs * 4;
    CoordIndex += 4)
  {
    Coords[CoordIndex] = Cluster1.Lon + (random()*20 - 10);
    Coords[CoordIndex + 1] = Cluster1.Lat + (random()*20 - 10);
    Coords[CoordIndex + 2] = Cluster2.Lon + (random()*20 - 10);
    Coords[CoordIndex + 3] = Cluster2.Lat + (random()*20 - 10);
  }
  */

  AddString(Buffer, (const u8 *)"{\"pairs\":[");

  s32 CoordIndex = 0;
  for (int PairIndex = 0;
      PairIndex < NumPairs; 
      ++PairIndex)
  {
    AddString(Buffer, (const u8 *)"{\"x0\":");
    AddNumber(Buffer, Coords[CoordIndex++]);

    AddString(Buffer, (const u8 *)",\"y0\":");
    AddNumber(Buffer, Coords[CoordIndex++]);

    AddString(Buffer, (const u8 *)",\"x1\":");
    AddNumber(Buffer, Coords[CoordIndex++]);

    AddString(Buffer, (const u8 *)",\"y1\":");
    AddNumber(Buffer, Coords[CoordIndex++]);

    AddString(Buffer, (const u8 *)"},");
  }

  Buffer->Cursor--;
  AddString(Buffer, (const u8 *)"]}"); 

  return Buffer->Cursor;
}
