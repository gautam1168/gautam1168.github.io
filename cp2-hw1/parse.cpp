static s32 Primes[] = {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 39, 41};

struct memory_arena
{
  u8 *Base;
  u64 Used;
  u64 Max;
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
    json_value **Items;
    u8 *String;
    f64 Number;
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

struct element_stack
{
  property_stack_node **Memory;
  s32 NextFreeIndex;
  s32 MaxCount;
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
  s32 NextFreeIndex;
};

struct keys
{
  u8 **Items;
  s32 Size;
};

struct scan_property_result
{
  u8 *Cursor;
  u8 *String;
};

struct scan_number_result
{
  u8 *Cursor;
  f64 Number;
};

void *
PushSize(memory_arena *Arena, s32 Size)
{
  Assert(Arena->Used + Size <= Arena->Max);
  void *Result = Arena->Base + Arena->Used;
  Arena->Used += Size;
  return Result;
}

#define PushStruct(Arena, Type) (Type *)PushSize(Arena, sizeof(Type));

json_token
ToToken(char Character)
{
  json_token Result = tok_null;
  switch (Character)
  {
    case ('"'):
      Result = tok_string;
      break;
    case('.'):
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
  s32 Length = 0;

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

f64
ParseNumber(u8 *Input)
{
  bool IsNegative = false;
  if (*Input == '-')
  {
    IsNegative = true;
    Input += 1;
  }

  u8 *Whole = Input;
  s32 WholeLength = 0;

  u8 *Fraction = Input;
  s32 FractionLength = 0;

  while (*Fraction != '.')
  {
    WholeLength++;
    Fraction++;
    if (*Fraction == '\0')
    {
      break;
    }
  }

  bool HasFractional = *Fraction != '\0';
  if (HasFractional)
  {
    Fraction++;
    u8 *Cursor = Fraction;
    while (*Cursor != '\0')
    {
      FractionLength++;
      Cursor++;
    }
  }

  s32 WholePart = 0;
  for (s32 Index = 0; Index < WholeLength; ++Index)
  {
    u8 Digit = Whole[Index] - '0';
    WholePart = (WholePart * 10) + Digit;
  }
  
  s32 FractionalDigits[16] = {};
  for (s32 Index = 0; Index < FractionLength; ++Index)
  {
    FractionalDigits[Index] = Fraction[Index] - '0';
  }

  s32 NumSignificantBits = 0;
  s32 Num = WholePart; 
  while (Num > 0)
  {
    Num = Num >> 1;
    NumSignificantBits++;
  }

  s32 FractionalBits[52] = {};
  if (NumSignificantBits > 1)
  {
    for (s32 Index = 1; Index < NumSignificantBits; ++Index)
    {
      s32 ShiftedNumber = WholePart >> (NumSignificantBits - Index - 1);
      s32 Bit = ShiftedNumber & 0b1;
      FractionalBits[Index - 1] = Bit;
    }
  }

  for (s32 Index = NumSignificantBits - 1; Index < 52; ++Index)
  {
    s32 Carry = 0;
    for (s32 DigIndex = 15; DigIndex >= 0; --DigIndex)
    {
      s32 Intermediate = 2 * FractionalDigits[DigIndex] + Carry;
      if (Intermediate >= 10)
      {
        Carry = 1;
        FractionalDigits[DigIndex] = Intermediate % 10;
      }
      else
      {
        Carry = 0;
        FractionalDigits[DigIndex] = Intermediate;
      }
    }
    FractionalBits[Index] = Carry;
  }

  u64 Exponent = 0;
  if (NumSignificantBits > 1)
  {
    Exponent = NumSignificantBits - 1;
  }

  Exponent = Exponent + 0x3ff;
  
  u64 BitField = 0;
  u64 One = 1L;
  if (IsNegative)
  {
    BitField = BitField | (One << 63);
  }

  BitField = BitField | (Exponent << 52);
  for (s32 Index = 0; Index < 52; ++Index)
  {
    BitField = BitField | ((u64)FractionalBits[Index] << (51 - Index));
  }

  u64 Mem = 0;
  void *Caster = (void *)(&Mem);
  *((u64 *)Caster) = BitField;

  f64 Result = *((f64 *)Caster);
  return Result;
}

scan_number_result
ScanJsonNumber(memory_arena *Scratch, u8 *Cursor)
{
  u8 *NumberWorkMem = (u8 *)PushSize(Scratch, 100 * sizeof(u8));
  u8 *C = Cursor;
  scan_number_result Result = {};
  for (s32 Index = 0; Index < 100; ++Index)
  {
    json_token Token = ToToken(*C);
    if (Token == tok_number)
    {
      NumberWorkMem[Index] = *C++;
    }
    else
    {
      NumberWorkMem[Index] = '\0';
      break;
    }
  }

  Result.Number = ParseNumber(NumberWorkMem);
  Result.Cursor = C; 
  Scratch->Used = 0;
  return Result;
}

void
InitHashmap(memory_arena *Arena, json_value *Value, s32 Size)
{
  Value->Size = Size;
  Value->Memory = (hash_node **)PushSize(Arena, Size * sizeof(hash_node *));
  for (s32 Index = 0; Index < Size; ++Index)
  {
    Value->Memory[Index]  = 0;
  }
}

s32
Hash(s32 HashmapSize, u8 *String)
{
  s32 Key = 0;
  while (*String != '\0')
  {
    s32 HighOrder = Key & 0xf8000000;
    Key = Key << 5;
    Key = Key ^ (HighOrder >> 27);
    Key = Key ^ *String++;
  }
  Key = Key % HashmapSize;
  return Key;
}

void
AddToHashmap(memory_arena *Arena, json_value *Target, u8 *Property, json_value *Value)
{
  s32 Key = Hash(Target->Size, Property);
  hash_node *Node = PushStruct(Arena, hash_node);
  Node->Key = Property;
  Node->Value = Value;
  Node->Next = 0;

  if (Target->Memory[Key] == 0)
  {
    Target->Memory[Key] = Node;
  }
  else
  {
    hash_node *Curr = Target->Memory[Key];
    while (Curr->Next != 0)
    {
      Curr = Curr->Next;
    }
    Curr->Next = Node;
  }
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
BuildJsonArray(memory_arena *Arena, 
    continuation_node *JsonContinuation, 
    element_stack *ElementStack)
{
  json_value *Value = PushStruct(Arena, json_value);
  Value->Type = val_array;

  s32 NumElements = ElementStack->NextFreeIndex - JsonContinuation->Index;

  Value->Size = NumElements;
  Value->Items = (json_value **)PushSize(Arena, NumElements * sizeof(json_value *));
  s32 ValueIndex = 0;
  for (s32 Index = JsonContinuation->Index; Index < ElementStack->NextFreeIndex; ++Index)
  {
    property_stack_node *Node = ElementStack->Memory[Index];
    Value->Items[ValueIndex++] = Node->Value;
  }
  ElementStack->NextFreeIndex = JsonContinuation->Index; 
  return Value;
}

json_value *
BuildJsonObject(memory_arena *Arena, 
    continuation_node *JsonContinuation, 
    property_stack *PropertyStack)
{
  json_value *Value = PushStruct(Arena, json_value);
  Value->Type = val_object;

  s32 NumProperties = PropertyStack->NextFreeIndex - JsonContinuation->Index;
  s32 PrimeSize = 0;
  for (s32 Index = 0; Index < ArraySize(Primes); ++Index)
  {
    if (Primes[Index] >= NumProperties)
    {
      PrimeSize = Primes[Index];
      break;
    }
  }
  Assert(PrimeSize > 0);

  InitHashmap(Arena, Value, PrimeSize);

  for (s32 Index = JsonContinuation->Index; Index < PropertyStack->NextFreeIndex; ++Index)
  {
    property_stack_node *Node = PropertyStack->Memory[Index];
    u8 *Property = Node->Property;
    AddToHashmap(Arena, Value, Property, Node->Value);
  }
  PropertyStack->NextFreeIndex = JsonContinuation->Index; 
  return Value;
}

json_value *
Parse(memory_arena *Scratch, memory_arena *Arena, u8 *JSON)
{
  json_value *Value;

  u8 *Cursor = JSON;


  Cursor = SkipWhitespace(Cursor);

  continuation_node *Cont = PushStruct(Arena, continuation_node);
  Cont->Type = cont_return;
  Cont->Index = 0;

  continuation_stack JsonContinuation_ = {};
  continuation_stack *JsonContinuation = &JsonContinuation_;

  property_stack PropertyStack_ = {};
  property_stack *PropertyStack = &PropertyStack_;
  
  element_stack ElementStack_ = {};
  element_stack *ElementStack = &ElementStack_;
  ElementStack->MaxCount = 10000000;
  ElementStack->Memory = (property_stack_node **)PushSize(Arena, 10000000 * sizeof(property_stack_node *));

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
          Value = PushStruct(Arena, json_value);
          Value->Type = val_string;
          Value->String = Res.String; 
          break;
        }
        case (tok_number):
        {
          Value = PushStruct(Arena, json_value);
          Value->Type = val_number;
          scan_number_result Res = ScanJsonNumber(Scratch, Cursor);
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
            Value = PushStruct(Arena, json_value);
            Value->Type = val_object;
            Value->Size = 0;
            break;
          }
          else
          {
            JsonContinuation->Memory[JsonContinuation->NextFreeIndex++] = Cont;
            Cont = PushStruct(Arena, continuation_node);
            Cont->Type = cont_object;
            Cont->Index = PropertyStack->NextFreeIndex;
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
        case (tok_lbrack):
        {
          Cursor = Consume(Cursor, '[');
          Cursor = SkipWhitespace(Cursor);
          if (*Cursor == ']')
          {
            Value = PushStruct(Arena, json_value);
            Value->Type = val_array;
            Value->Size = 0;
          }
          else
          {
            JsonContinuation->Memory[JsonContinuation->NextFreeIndex++] = Cont;
            Cont = PushStruct(Arena, continuation_node);
            Cont->Type = cont_array;
            Cont->Index = ElementStack->NextFreeIndex;
          }
          continue;
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
          Cursor = SkipWhitespace(Cursor);
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
            Expect(Cursor, tok_rbrace);
            Cursor = Consume(Cursor, '}');
            Value = BuildJsonObject(Arena, Cont, PropertyStack);
            Cont = JsonContinuation->Memory[--JsonContinuation->NextFreeIndex];
            continue;
          }
        }
        case (cont_array):
        {
          property_stack_node *Node = PushStruct(Arena, property_stack_node);
          Assert(ElementStack->NextFreeIndex + 1 < 10000000);
          ElementStack->Memory[ElementStack->NextFreeIndex++] = Node;
          ElementStack->Memory[ElementStack->NextFreeIndex - 1]->Value = Value;
          if (*Cursor == ',')
          {
            Cursor += 1;
            Cursor = SkipWhitespace(Cursor);
            break;
          }
          else
          {
            Cursor = SkipWhitespace(Cursor);
            Expect(Cursor, tok_rbrack);
            Cursor = Consume(Cursor, ']');
            Value = BuildJsonArray(Arena, Cont, ElementStack);
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

keys
ObjectKeys(memory_arena *Arena, json_value *Object)
{
  keys Result = {}; 
  Result.Items = (u8 **)PushSize(Arena, 16 * sizeof(u8 *));
  Result.Size = 0;

  s32 NumKeys = 0;
  if (Object->Type == val_object)
  {
    for (s32 Index = 0; Index < Object->Size; ++Index)
    {
      hash_node *Curr;
      Curr = Object->Memory[Index];
      if (Curr != 0)
      {
        while (Curr)
        {
          Result.Items[Result.Size++] = Curr->Key;
          Curr = Curr->Next;
        }
      }
    }
  }

  return Result;
}

bool
AreEqual(u8 *String1, u8 *String2)
{
  bool Result = true;
  while (*String1 != '\0' && *String2 != '\0')
  {
    Result = (*String1++ == *String2++);
  }

  if (Result)
  {
    Result = (*String1 == *String2);
  }

  return Result;
}

json_value *
GetPropVal(json_value *Object, u8 *Key)
{
  s32 Index = Hash(Object->Size, Key);
  hash_node *Curr = Object->Memory[Index];
  while (Curr)
  {
    if (AreEqual(Key, Curr->Key))
    {
      break;
    }
    else
    {
      Curr = Curr->Next;
    }
  }

  json_value *Result = 0;
  if (Curr != 0)
  {
    Result = Curr->Value;
  }

  return Result;
}

