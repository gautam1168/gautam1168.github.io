#include <intrin.h>
#include <windows.h>
#include <stdlib.h>
#include <stdio.h>
#include "types.h"
#include "parse.cpp"
#include "generate.cpp"

static u64 
GetOSTimerFreq()
{
  LARGE_INTEGER Freq;
  QueryPerformanceFrequency(&Freq);
  return Freq.QuadPart;
}

static u64
ReadOSTimer()
{
  LARGE_INTEGER Value;
  QueryPerformanceCounter(&Value);
  return Value.QuadPart;
}

inline u64
ReadCPUTimer()
{
  return __rdtsc();
}

void
PrintCPUEstimates()
{
  u64 Frequency = GetOSTimerFreq();
  printf("OS Frequency: %llu\n", Frequency);
  
  u64 CPUStart = ReadCPUTimer();
  u64 OSStart = ReadOSTimer();
  u64 OSEnd = 0;
  u64 OSElapsed = 0;
  while (OSElapsed < Frequency)
  {
    OSEnd = ReadOSTimer();
    OSElapsed = OSEnd - OSStart;
  }

  u64 CPUEnd = ReadCPUTimer();
  u64 CPUElapsed = CPUEnd - CPUStart;
  u64 CPUFreq = 0;
  if (OSElapsed > 0)
  {
    CPUFreq = Frequency * CPUElapsed / OSElapsed;
  }

  printf("OS Timer: %llu -> %llu = %llu elapsed \n", OSStart, OSEnd, OSElapsed);
  printf("OS Seconds: %.4f\n", (f64)OSElapsed/(f64)Frequency);

  printf("CPU Timer: %llu -> %llu = %llu elapsed\n", CPUStart, CPUEnd, CPUElapsed);
  printf("CPU Frequency: %llu (guessed)\n", CPUFreq);
}

u64 
EstimateCPUTimerFrequency()
{
  u64 Frequency = GetOSTimerFreq();
  
  u64 CPUStart = ReadCPUTimer();
  u64 OSStart = ReadOSTimer();
  u64 OSEnd = 0;
  u64 OSElapsed = 0;
  while (OSElapsed < Frequency)
  {
    OSEnd = ReadOSTimer();
    OSElapsed = OSEnd - OSStart;
  }

  u64 CPUEnd = ReadCPUTimer();
  u64 CPUElapsed = CPUEnd - CPUStart;
  u64 CPUFreq = 0;
  if (OSElapsed > 0)
  {
    CPUFreq = Frequency * CPUElapsed / OSElapsed;
  }

  return CPUFreq;
}

void
PrintTimeElapsed(const char *Label, u64 TotalTSCElapsed, u64 Begin, u64 End)
{
  u64 Elapsed = End - Begin;
  f64 Percent = 100.0 * ((f64)Elapsed/(f64)TotalTSCElapsed);
  printf("%s: %llu (%.2f%%)\n", Label, Elapsed, Percent);
}

s32
main(s32 NumArgs, char **Args)
{
  // PrintCPUEstimates();
  
  u64 Prof_Begin = 0;
  u64 Prof_Read = 0;
  u64 Prof_MiscSetup = 0;
  u64 Prof_Parse = 0;
  u64 Prof_Sum = 0;
  u64 Prof_MiscOutput = 0;
  u64 Prof_End = 0;

  Prof_Begin = ReadCPUTimer();

#if 0
  char Case1[] = "\"some text\"";
  char Case2[] = "{}";
  char Case3[] = "   { \n  \"x0\": 1.3247, \"x1\": 2.89732, \"x3\": { \"sub\": 3.8936 } }";
  char Case4[] = "   { \"pairs\": [{ \"x0\": 1.98523, \"x1\": 2.17352 }, { \"x0\": 3.89539, \"x1\": 4.89782 }] }";
  char *TestCases[] = {
    Case1,
    Case2,
    Case3,
    Case4,
  };

  for (s32 Index = 0; Index < ArraySize(TestCases); ++Index)
  {
    Arena->Used = 0;
    json_value *Answer = Parse(Scratch, Arena, (u8 *)TestCases[Index]);
    keys Keys = ObjectKeys(Scratch, Answer);
    for (s32 KeyIndex = 0; KeyIndex < Keys.Size; ++KeyIndex)
    {
      json_value *Val = GetPropVal(Answer, Keys.Items[KeyIndex]);
      s32 a = 1;
    }
  }
  /*
  u8 TestCase[] = "-28.5175025263690110";
  f64 Answer = ParseNumber(TestCase);
  */
#endif
  Prof_Read = ReadCPUTimer();
  FILE *File = fopen("./test.json", "r");
  if (File == 0)
  {
    printf("Failed to open file\n");
  }

  if (fseek(File, 0, SEEK_END) == -1)
  {
    printf("Failed to seek to end of file\n");
  }

  s64 Offset = ftell(File);
  if (Offset == -1)
  {
    printf("Failed to tell\n");
  }

  printf("Filesize: %lld\n", Offset);
  char *FileContents = (char *)malloc(Offset * sizeof(char));
  fseek(File, 0, 0);
  fread(FileContents, Offset, sizeof(char), File);
  fclose(File);

  Prof_MiscSetup = ReadCPUTimer();
  
#define ARENA_SIZE_MB 500
#define SCRATCH_SIZE_MB 1
  memory_arena Arena_ = {};
  memory_arena *Arena = &Arena_;
  Arena->Max = Megabyte(ARENA_SIZE_MB);
  Arena->Used = 0;
  Arena->Base = (u8 *)calloc(Arena->Max + Megabyte(SCRATCH_SIZE_MB), sizeof(u8));
  
  memory_arena Scratch_ = {};
  memory_arena *Scratch = &Scratch_;
  Scratch->Max = Megabyte(SCRATCH_SIZE_MB);
  Scratch->Used = 0;
  Scratch->Base = Arena->Base + Megabyte(ARENA_SIZE_MB);

  Prof_Parse = ReadCPUTimer();
  json_value *Answer = Parse(Scratch, Arena, (u8 *)FileContents);
  Prof_Sum = ReadCPUTimer();
  
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
    f32 HaversineValue = Haversine(x0, y0, x1, y1, 6378.0)/PairCount;
    Mean += HaversineValue;
  }

  Prof_MiscOutput = ReadCPUTimer();
  printf("Input size %llu\n", 0LL);
  printf("Pair count %d\n", PairCount);

  Prof_End = ReadCPUTimer();
  
  printf("Haversine sum %.16f\n", Mean);

  u64 TotalCPUElapsed = Prof_End - Prof_Begin;

  PrintTimeElapsed("Startup", TotalCPUElapsed, Prof_Begin, Prof_Read);
  PrintTimeElapsed("Read", TotalCPUElapsed, Prof_Read, Prof_MiscSetup);
  PrintTimeElapsed("MiscSetup", TotalCPUElapsed, Prof_MiscSetup, Prof_Parse);
  PrintTimeElapsed("Parse", TotalCPUElapsed, Prof_Parse, Prof_Sum);
  PrintTimeElapsed("Sum", TotalCPUElapsed, Prof_Sum, Prof_MiscOutput);
  PrintTimeElapsed("MiscOutput", TotalCPUElapsed, Prof_MiscOutput, Prof_End);

  return 0;
}