#include <stdlib.h>

#define ArraySize(Arr) sizeof(Arr)/sizeof(Arr[0])
#define Kilobyte(N) 1024
#define Megabyte(N) Kilobyte(N)*1024
#define Assert(expr) if (!(expr)) { __builtin_trap(); }

enum type
{
  val_number,
  val_string,
  val_object,
  val_array,
  val_null,
  val_bool
};

struct memory_arena
{
  unsigned char *Base;
  int Used;
  int Max;
};

struct json_value;

struct hash_node
{
  json_value *Value;
  hash_node *Next;
};

struct json_value
{
  type Type; 
  union
  {
    struct hash_map
    {
      int Size;
      hash_node **Memory;
    };

    struct array
    {
      int Size;
      json_value *Items;
    };

    struct 
    {
      int Size;
      char *String;
    };

    float Number;
  };
};

struct keys
{
  char **Items;
  int Size;
};

void *
PushSize(memory_arena *Arena, int Size)
{
  Assert(Arena->Used + Size <= Arena->Max);
  void *Result = Arena->Base + Arena->Used;
  Arena->Used += Size;
  return Result;
}

type
Type(json_value *Object)
{
  return val_null;
}

keys *
Keys(json_value *Object)
{
  return 0;
}

json_value *
Get(json_value *Object, const char *Key)
{
  return 0;
}

void
SkipWhitespace(char **Cursor)
{
  char *C = *Cursor;
  while ((*C == ' ') ||
      (*C == '\t') ||
      (*C == '\n'))
  {
    C++;
  }
  *Cursor = C;
}

void 
Advance(char **Cursor)
{
  char *C = *Cursor;
  *Cursor = C + 1;
}

json_value
MakeString(memory_arena *Arena, char **Cursor)
{
  json_value Result = {};
  Result.Type = val_string;

  char *C = *Cursor;
  int Length = 0;
  while (*C++ != '"')
  {
    Length++;
  }
  
  Result.String = (char *)PushSize(Arena, Length);
  C = *Cursor;
  Result.Size = Length;
  for (int Index = 0; Index < Length; ++Index)
  {
    Result.String[Index] = *C++;
  }

  return Result;
}

json_value 
Parse(memory_arena *Arena, char *Input)
{
  json_value Result = {};

  char *Cursor = Input;
  SkipWhitespace(&Cursor);
  while (true)
  {
    switch(*Cursor)
    {
      case ('"'):
      {
        Advance(&Cursor);
        Result = MakeString(Arena, &Cursor);
        break;
      }
      case ('{'):
      {
        Advance(&Cursor);
        Result.Type = val_object;
        SkipWhitespace(&Cursor);
        break;
      } 
    }
    break;
  }

  return Result;
}

int
main(int NumArgs, char **Argv)
{
  char Case1[] = "\"some text\"";
  char Case2[] = "{}";
  char Case3[] = "   { \n  \"x0\": 1, \"x1\": 2 }";
  char *TestCases[] = {
    Case1,
    Case2,
    Case3
  };

  memory_arena Arena_ = {};
  memory_arena *Arena = &Arena_;
  Arena->Max = Megabyte(10);
  Arena->Used = 0;
  Arena->Base = (unsigned char *)calloc(Arena->Max, sizeof(unsigned char));

  for (int Index = 0; Index < ArraySize(TestCases); ++Index)
  {
    char *JSON = TestCases[Index];
    json_value Answer = Parse(Arena, JSON);
    // Answer.type() -> "object"/"array"/"boolean"/"number"/"null"
    // Answer.keys() -> ["x0", "x1"]
    // Answer.get("x0")
    // Answer.get("x1")
  }
  return 0;
}
