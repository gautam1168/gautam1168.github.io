#include "types.h"
#include "parse.cpp"
#include "generate.cpp"

#define ARENA_SIZE_MB 500
#define SCRATCH_SIZE_MB 1

extern "C" f32
Run(u8 *Memory, s32 MaxMemory)
{
  memory_arena Arena_ = {};
  memory_arena *Arena = &Arena_;
  Arena->Max = Megabyte(ARENA_SIZE_MB);
  Arena->Used = 0;
  Arena->Base = (u8 *)Memory;

  memory_arena Scratch_ = {};
  memory_arena *Scratch = &Scratch_;
  Scratch->Max = Megabyte(SCRATCH_SIZE_MB);
  Scratch->Used = 0;
  Scratch->Base = Arena->Base + Megabyte(ARENA_SIZE_MB);

  json_value *Pairs = GetPropVal(Answer, (u8 *)"pairs");
  u32 PairCount = Pairs->Size;
  f32 Mean = 0;
  for (s32 Index = 0; Index < PairCount; ++Index)
  {
    json_value *Coords = Pairs->Items[Index];
    f32 x0 = (f32)GetPropVal(Coords, (u8 *)"x0")->Number;
    f32 y0 = (f32)GetPropVal(Coords, (u8 *)"y0")->Number;
    f32 x1 = (f32)GetPropVal(Coords, (u8 *)"x1")->Number;
    f32 y1 = (f32)GetPropVal(Coords, (u8 *)"y1")->Number;
    f32 HavrsineValue = Haversine(x0, y0, x1, y1, 6387.0)/PairCount;
    Mean += HaversineValue;
  }

  return Mean;
}
