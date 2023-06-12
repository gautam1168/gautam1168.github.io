#include <stdlib.h>
#include "types.h"
#include "parse.cpp"

s32
main(s32 NumArgs, char **Args)
{
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

  memory_arena Arena_ = {};
  memory_arena *Arena = &Arena_;
  Arena->Max = Megabyte(100);
  Arena->Used = 0;
  Arena->Base = (u8 *)calloc(2 * Arena->Max, sizeof(u8));
  
  memory_arena Scratch_ = {};
  memory_arena *Scratch = &Scratch_;
  Scratch->Max = Megabyte(100);
  Scratch->Used = 0;
  Scratch->Base = Arena->Base + Megabyte(100);

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
  return 0;
}
