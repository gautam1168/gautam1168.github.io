// #include <stdio.h>

typedef unsigned int bool;
#define false 0
#define true 1

typedef struct call_stack_entry 
{
	int InputIndex;
	int PatternIndex;
	int CallerIndex;
	int NumChildren;
	struct call_stack_entry *Children[3];
} call_stack_entry;

typedef struct font_pixels 
{
	int Width;
	int Height;
	unsigned int *Pixels;
} font_pixels;

unsigned int
Len(char *String) 
{
	int Result = 0;
	while (*String++) 
	{
		Result++;
	}
	return Result;
}

char *
Slice(char *Input, unsigned int Offset) 
{
	int Length = Len(Input);
	if (Offset < Length) 
	{
		return Input + Offset;
	}
	else 
	{
		return Input + Length;
	}
}

bool 
isMatch(char *Input, char *Pattern)
{
	// printf("isMatch: %s, %s\n", Input, Pattern);
	if (*Pattern == '\0' && *Input == '\0')
	{
		return true;
	}
	else if (Len(Pattern) >= 2 && *(Pattern + 1) == '*') 
	{
		bool StarMatchIsSkipped = isMatch(Input, Slice(Pattern, 2));
		if (StarMatchIsSkipped) 
		{
			return true;
		}

		bool FirstMatch = (*Input != '\0') && ((*Pattern == *Input) || (*Pattern == '.'));
		bool StarMatchIsUsed = (FirstMatch && isMatch(Slice(Input, 1), Pattern));
			
		return StarMatchIsUsed;
	}
	else if ((*Input != '\0') && ((*Pattern == *Input) || (*Pattern == '.')))
	{
		return isMatch(Slice(Input, 1), Slice(Pattern, 1));
	}
	else
	{
		return false;
	}
}

bool
isMatchIndexBased(char *Input, int InputStart, char *Pattern, int PatternStart, int CallerIndex, int *UsedEntries, call_stack_entry *Mem)
{
	call_stack_entry *Entry = Mem + (*UsedEntries);
	// Entry->Caller = Caller;
	Entry->CallerIndex = CallerIndex;
	Entry->InputIndex = InputStart;
	Entry->PatternIndex = PatternStart;
	Entry->NumChildren = 0;
	int SelfIndex = *UsedEntries;

	if (InputStart > Len(Input)) 
	{
		InputStart = Len(Input);
	}

	if (PatternStart > Len(Pattern)) 
	{
		PatternStart = Len(Pattern);
	}

	if (InputStart == Len(Input) && PatternStart == Len(Pattern))
	{
		return true;
	}
	else if ((Len(Pattern) - PatternStart) >= 2 && *(Pattern + PatternStart + 1) == '*') 
	{
		*UsedEntries = (*UsedEntries) + 1;
		bool StarMatchIsSkipped = isMatchIndexBased(Input, InputStart, Pattern, 
				PatternStart + 2, SelfIndex, UsedEntries, Mem);
		if (StarMatchIsSkipped) 
		{
			return true;
		}

		bool FirstMatch = (*(Input + InputStart) != '\0') && (
				(*(Pattern + PatternStart)  == *(Input + InputStart)) || (*(Pattern + PatternStart) == '.')
			);

		*UsedEntries = (*UsedEntries) + 1;
		bool StarMatchIsUsed = (FirstMatch && 
				isMatchIndexBased(Input, InputStart + 1, Pattern, PatternStart, SelfIndex, UsedEntries, Mem)
			);
			
		return StarMatchIsUsed;
	}
	else if ((*(Input + InputStart) != '\0') && (
				(*(Pattern + PatternStart) == *(Input + InputStart)) || (*(Pattern + PatternStart) == '.')
			)
		)
	{
		*UsedEntries = (*UsedEntries) + 1;
		return isMatchIndexBased(Input, InputStart + 1, Pattern, PatternStart + 1, SelfIndex, UsedEntries, Mem);
	}
	else
	{
		return false;
	}
}

typedef struct box_config
{
	int X;
	int Y;
	int Width;
	int Height;
	int LineWidth;
} box_config;

void
RenderBox(unsigned int *Pixel, int Width, int Height, box_config *BoxConfig, unsigned int Color)
{
	for (int RowIndex = BoxConfig->Y; 
			RowIndex < BoxConfig->Y + BoxConfig->Height; 
			++RowIndex)
	{
		unsigned int *Row = Pixel + (Width * RowIndex);
		for (int ColIndex = BoxConfig->X; 
				ColIndex < BoxConfig->X + BoxConfig->Width; 
				++ColIndex)
		{
			unsigned int *Pixel = Row + ColIndex;
			*Pixel = Color;
		}
	}
}

call_stack_entry *
MakeCallTree(call_stack_entry *Entries, int NumEntries)
{
	call_stack_entry *Root = 0;
	for (int EntryIndex = 0;
			EntryIndex < NumEntries;
			++EntryIndex)
	{
		call_stack_entry *Curr = Entries + EntryIndex;
		if (Curr->CallerIndex >= 0) 
		{
			call_stack_entry *Parent = Entries + Curr->CallerIndex;
			Parent->Children[Parent->NumChildren++] = Curr;
		}
		else 
		{
			Root = Curr;
		}
	}
	return Root;
}

void 
RecursiveNodeRender(unsigned int *Pixel, int Width, int Height, call_stack_entry *Node, int LocX, int LocY, unsigned int Color)
{
	box_config BoxConfig = {};

	BoxConfig.Width = 100;
	BoxConfig.Height = 100;
	BoxConfig.X = LocX;
	BoxConfig.Y = LocY;

	RenderBox(Pixel, Width, Height, &BoxConfig, Color);
	if (Node->NumChildren) 
	{
		for (int ChildIndex = 0;
				ChildIndex < Node->NumChildren;
				++ChildIndex)
		{
			RecursiveNodeRender(Pixel, Width, Height, Node->Children[ChildIndex], LocX + (ChildIndex * 120), LocY + 120, Color);
		}
	}
}

void 
RenderWord(unsigned int *Pixel, font_pixels *Font, int Width, int Height, char *Word)
{
	int WordLength = Len(Word);
	unsigned int *BufferPixelIndex;
	int XOffset = 20;
	int YOffset = 20;

	for (int i = 0; i < WordLength; ++i) 
	{
		char Character = *(Word + i);
		unsigned int *CharacterPixels = Font->Pixels;

		for (int RowIndex = 0; 
				RowIndex < Font->Height;
				++RowIndex)
		{
			BufferPixelIndex = Pixel + (RowIndex * Width) + XOffset + (Width * YOffset);
			for (int ColIndex = 0;
					ColIndex < Font->Width;
					++ColIndex)
			{
				*BufferPixelIndex++ = *CharacterPixels++;	
			}
		}

		XOffset += Font->Width;
	}
}

void 
RenderCallTree(unsigned int *Pixel, font_pixels *Font, int Width, int Height, call_stack_entry *CallStack, int NumNodes, bool Result)
{
	// AABBGGRR
	unsigned int Color = Result ?  0xff000000: 0xff0f26fa;
	call_stack_entry *Root = MakeCallTree(CallStack, NumNodes);

	unsigned int *PixelCursor = Pixel;
	long NumPixels = Width * Height;
	while (NumPixels--) 
	{
		*PixelCursor++ = 0xffaad000;
	}

	int LocX = Width/2;
	int LocY = 0;
	RecursiveNodeRender(Pixel, Width, Height, Root, LocX, LocY, Color);
	
	char Word[] = "some text\0";
	RenderWord(Pixel, Font, Width, Height, Word);
}

bool
runMatch(unsigned int *Pixels, int Width, int Height, char *Input)
{
	int UsedEntries = 0;
	call_stack_entry CallStack[128];

	unsigned char *DataStart  = ((unsigned char *)Pixels) + (Width * Height * 4);
	font_pixels Characters[39];
	for (int CharacterIndex = 0;
			CharacterIndex < 39;
			++CharacterIndex)
	{
		font_pixels *Character = Characters + CharacterIndex;
		Character->Width = (int)(*DataStart++);
		Character->Height = (int)(*DataStart++);
		Character->Pixels = (unsigned int *)DataStart;
		DataStart += Character->Width * Character->Height * 4;
	}

	char *Pattern = Input;
	while (*(++Pattern) != '\0') {}
	Pattern += 1;	
	bool Result = isMatchIndexBased(Input, 0, Pattern, 0, -1, &UsedEntries, CallStack);
	RenderCallTree(Pixels, Characters, Width, Height, CallStack, UsedEntries + 1, Result);

	return Result;
}

/*
int
main(int NumArgs, char **Args) 
{
	char Input[] = "a\0";
	char Pattern[] = ".*..a*\0";
	bool Result = isMatch(Input, Pattern);
	printf("Answer: %d\n", Result);
	return 0;
}

void
Print(unsigned char *Buffer, int Width, int Height)
{
	unsigned int *Pixel = (unsigned int *)Buffer;
	for (int Index = 0; Index < Width * Height; ++Index) 
	{
		// AABBGGRR
		*Pixel++ = 0xffaad000;
	}
}
*/
