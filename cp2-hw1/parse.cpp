#include <stdlib.h>

#define ArraySize(Arr) sizeof(Arr)/sizeof(Arr[0])
#define Kilobyte(N) 1024
#define Megabyte(N) Kilobyte(N)*1024
#define Assert(expr) if (!(expr)) { __builtin_trap(); }

typedef char s8;
typedef short s16;
typedef int s32;
typedef long s64;

typedef unsigned char u8;
typedef unsigned short u16;
typedef unsigned int u32;
typedef unsigned long u64;

struct memory_arena
{
  u8 *Base;
  u32 Used;
  u32 Max;
};

enum json_token
{
  tok_string,
  tok_number,
  tok_lbrace,
  tok_rbrace,
  tok_lbrack,
  tok_rbrack,
  tok_true,
  tok_false,
  tok_whitespace,
  tok_colon,
  tok_comma,
  tok_illegal,
  tok_null
};

enum type
{
  val_number,
  val_string,
  val_object,
  val_array,
  val_null,
  val_bool
};

struct json_value;

struct hash_node
{
  u8 *Key;
  json_value *Value;
  hash_node *Next;
};

struct json_value
{
  type Type; 
  s32 Size;
  union
  {
    hash_node **Memory;
    json_value *Items;
    u8 *String;
    float Number;
  };
};

struct json_value_stack
{
  json_value Memory[16];
  s32 NextFreeIndex;
};

struct property_stack_node
{
  u8 *Property;
  json_value *Value;
};

struct property_stack
{
  property_stack_node *Memory[16];
  s32 NextFreeIndex;
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
  s32 Index;
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

struct scan_property_result
{
  u8 *Cursor;
  u8 *String;
};

struct scan_number_result
{
  u8 *Cursor;
  float Number;
};

void *
PushSize(memory_arena *Arena, int Size)
{
  Assert(Arena->Used + Size <= Arena->Max);
  void *Result = Arena->Base + Arena->Used;
  Arena->Used += Size;
  return Result;
}

#define PushStruct(Arena, type) (type *)PushSize(Arena, sizeof(type));

json_token
ToToken(char Character)
{
  json_token Result = tok_null;
  switch (Character)
  {
    case ('"'):
      Result = tok_string;
      break;
    case ('-'):
    case ('0'):
    case ('1'):
    case ('2'):
    case ('3'):
    case ('4'):
    case ('5'):
    case ('6'):
    case ('7'):
    case ('8'):
    case ('9'):
      Result = tok_number;
      break;
    case('['):
      Result = tok_lbrack;
      break;
    case(']'):
      Result = tok_rbrack;
      break;
    case('{'):
      Result = tok_lbrace;
      break;
    case('}'):
      Result = tok_rbrace;
      break;
    case(':'):
      Result = tok_colon;
      break;
    case(','):
      Result = tok_comma;
      break;
    case('t'):
      Result = tok_true;
      break;
    case('f'):
      Result = tok_false;
      break;
    case('n'):
      Result = tok_null;
      break;
    case(' '):
    case('\n'):
    case('\t'):
    case('\r'):
      Result = tok_whitespace;
      break;
  }

  return Result;
}

u8 *
SkipWhitespace(u8 *Cursor)
{
  u8 *C = Cursor;
  while (*C != '\0')
  {
    json_token Token = ToToken(*C);
    if (Token == tok_whitespace)
    {
      C++;
    }
    else
    {
      break;
    }
  }
  return C;
}

u8 *
Consume(u8 *Cursor, char Character)
{
  u8 *Result = Cursor;
  if (*Cursor == Character)
  {
    Result = Cursor + 1;
  }

  return Result;
}

scan_property_result
ScanJsonString(memory_arena *Arena, u8 *Cursor)
{
  scan_property_result Result = {};
  u8 *CopyTarget = (u8 *)Arena->Base + Arena->Used;
  u8 *C = CopyTarget;
  int Length = 0;

  Cursor += 1; // Skip opening "
  while (*Cursor != '"')
  {
    Length++;
    *C++ = *Cursor++;
  }
  Cursor += 1; // Skip closing "
  Length++;
  *C++ = '\0';

  Arena->Used += Length;
  Result.String = CopyTarget;
  Result.Cursor = Cursor;
  return Result;
}

scan_number_result
ScanJsonNumber(u8 *Cursor)
{
  u8 *C = Cursor;
  scan_number_result Result = {};
  json_token Token = ToToken(*C);
  while (Token == tok_number)
  {
    Result.Number *= 10;
    Result.Number += (*C++) - '0';
    Token = ToToken(*C);
  }
  Result.Cursor = C; 
  return Result;
}

void
InitHashmap(memory_arena *Arena, json_value *Value, int Size)
{
  Value->Size = Size;
  Value->Memory = (hash_node **)PushSize(Arena, Size * sizeof(hash_node *));
}

void
AddToHashmap(json_value *Target, json_value *Value)
{
}

u8 *
Expect(u8 *Cursor, json_token ExpectedToken)
{
  Cursor = SkipWhitespace(Cursor);
  json_token Token = ToToken(*Cursor);
  Assert(Token == ExpectedToken);
  return Cursor;
}

json_value *
BuildJsonObject(memory_arena *Arena, 
    continuation_node *JsonContinuation, 
    property_stack *PropertyStack)
{
  json_value *Value = PushStruct(Arena, json_value);
  Value->Type = val_object;

  int NumProperties = PropertyStack->NextFreeIndex - JsonContinuation->Index;
  InitHashmap(Arena, Value, NumProperties);

  for (int Index = JsonContinuation->Index; Index < PropertyStack->NextFreeIndex; ++Index)
  {
    property_stack_node *Node = PropertyStack->Memory[Index];
    u8 *Property = Node->Property;
    AddToHashmap(Value, Node->Value);
  }

  return Value;
}

json_value *
Parse(memory_arena *Arena, u8 *JSON)
{
  json_value *Value = PushStruct(Arena, json_value);

  u8 *Cursor = JSON;

  Cursor = SkipWhitespace(Cursor);

  continuation_node *Cont = PushStruct(Arena, continuation_node);
  Cont->Type = cont_return;
  Cont->Index = 0;

  continuation_stack JsonContinuation_ = {};
  continuation_stack *JsonContinuation = &JsonContinuation_;

  property_stack PropertyStack_ = {};
  property_stack *PropertyStack = &PropertyStack_;

  while (true)
  {
    // Produce json value
    while (true)
    {
      Cursor = SkipWhitespace(Cursor);

      json_token JsonToken = ToToken(*Cursor);
      switch (JsonToken)
      {
        case (tok_string):
        {
          scan_property_result Res = ScanJsonString(Arena, Cursor);
          Cursor = Res.Cursor;
          Value->Type = val_string;
          Value->String = Res.String; 
          break;
        }
        case (tok_number):
        {
          Value->Type = val_number;
          scan_number_result Res = ScanJsonNumber(Cursor);
          Value->Number = Res.Number;
          Cursor = Res.Cursor;
          break;
        }
        case (tok_lbrace):
        {
          Cursor = Consume(Cursor, '{');
          Cursor = SkipWhitespace(Cursor);
          if (*Cursor == '}')
          {
            Value->Type = val_object;
            Value->Size = 0;
            break;
          }
          else
          {
            JsonContinuation->Memory[JsonContinuation->NextFreeIndex++] = Cont;
            Cont = PushStruct(Arena, continuation_node);
            Cont->Type = cont_object;
            Cont->Index = 0;
            scan_property_result Res = ScanJsonString(Arena, Cursor);
            Cursor = Res.Cursor;
            property_stack_node *PropertyNode = PushStruct(Arena, property_stack_node);
            PropertyNode->Property = Res.String;
            PropertyNode->Value = 0;
            PropertyStack->Memory[PropertyStack->NextFreeIndex++] = PropertyNode;
            Cursor = Expect(Cursor, tok_colon);
            Cursor = Consume(Cursor, ':');
            continue;
          }
        }
        default:
          Assert(!"Not implemented!");
      }
      break;
    }

    // Consume json value
    while (true)
    {
      switch (Cont->Type)
      {
        case (cont_return):
          return Value;
        case (cont_object):
        {
          PropertyStack->Memory[PropertyStack->NextFreeIndex - 1]->Value = Value;
          if (*Cursor == ',')
          {
            Cursor += 1; // Skip ,
            Cursor = SkipWhitespace(Cursor);
            // if comma then produce next property and break
            scan_property_result Res = ScanJsonString(Arena, Cursor);
            Cursor = Res.Cursor;
            property_stack_node *PropertyNode = PushStruct(Arena, property_stack_node);
            PropertyNode->Property = Res.String;
            PropertyNode->Value = 0;
            PropertyStack->Memory[PropertyStack->NextFreeIndex++] = PropertyNode;
            Cursor = Expect(Cursor, tok_colon);
            Cursor = Consume(Cursor, ':');
            break;
          }
          else
          {
            Cursor = SkipWhitespace(Cursor);
            Expect(Cursor, tok_rbrace);
            Cursor = Consume(Cursor, '}');
            Value = BuildJsonObject(Arena, Cont, PropertyStack);
            Cont = JsonContinuation->Memory[--JsonContinuation->NextFreeIndex];
            continue;
          }
        }
        default:
          Assert(!"Not Implemented!");
      }
      break;
    }
  }
  return Value;
}

int
main(int NumArgs, char **Args)
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
  Arena->Max = Megabyte(100);
  Arena->Used = 0;
  Arena->Base = (u8 *)calloc(Arena->Max, sizeof(u8));

  for (int Index = 0; Index < ArraySize(TestCases); ++Index)
  {
    Arena->Used = 0;
    json_value *Answer = Parse(Arena, (u8 *)TestCases[Index]);
    int a = 1;
  }

  return 0;
}
