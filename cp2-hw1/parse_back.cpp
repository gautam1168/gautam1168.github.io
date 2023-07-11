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
  char *Key;
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

struct json_value_stack
{
  json_value Memory[16];
  int NextFreeIndex;
};

struct property_stack_node
{
  char *Property;
  json_value *Value;
};

struct property_stack
{
  property_stack_node Memory[16];
  int NextFreeIndex;
};

enum continuation_type
{
  cont_return,
  cont_object,
  cont_array
};

struct continuation_node
{
  continuation_type Type;
  int Index;
};

struct continuation_stack
{
  
  continuation_node *Memory[16];
  int NextFreeIndex;
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

#define PushStruct(Arena, type) (type *)PushSize(Arena, sizeof(type))

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

  continuation_stack ContStack = {};
  json_value_stack ElementStack = {};
  property_stack PropertyStack = {};

  continuation_node *Cont = PushStruct(Arena, continuation_node);
  Cont->Index = 0;
  Cont->Type = cont_return;

  char *Cursor = Input;

  SkipWhitespace(&Cursor);
  while (true)
  {
    // Producer loop
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
          ContStack.Memory[ContStack.NextFreeIndex++] = Cont;
          Cont = PushStruct(Arena, continuation_node);
          Cont->Index = 0;
          Cont->Type = cont_object;

          Advance(&Cursor);
          Result.Type = val_object;
          SkipWhitespace(&Cursor);
          if (*Cursor == '}')
          {
            // ConsumeRbrace
            Result.Size = 0;
            break;
          }
          else
          {
            // ScanJsonProperty
            // Add to property stack
            // ConsumeColon
            // SkipWhiteSpace
            continue;
          }
        } 
        case (isDigit()):
        {
          // ScanNumber
          break;
        }
      }
      break;
    }

    // Consumer loop
    while (true)
    {
      switch (cont.Type)
      {
        case (cont_return):
        {
          break;
        }
        case (cont_object):
        {
          // Add value to property stack
          // if comma follows produce next property and then break
          // else build jsonobject
          // Remove properties from stack
          // pop continuation
          // continue
        }
        case (cont_array):
        {
          // Add value to element stack
          // if comma follows then break
          // else build jsonarray
          // remove elements from elements stack
          // pop continuation
          // continue
        }
      }
      break;
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
