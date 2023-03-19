// #include <stdio.h>

typedef unsigned int bool;
#define false 0
#define true 1



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
isMatchIndexBased(char *Input, int InputStart, char *Pattern, int PatternStart)
{
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
		bool StarMatchIsSkipped = isMatchIndexBased(Input, InputStart, Pattern, PatternStart + 2);
		if (StarMatchIsSkipped) 
		{
			return true;
		}

		bool FirstMatch = (*(Input + InputStart) != '\0') && (
				(*(Pattern + PatternStart)  == *(Input + InputStart)) || (*(Pattern + PatternStart) == '.')
			);
		bool StarMatchIsUsed = (FirstMatch && 
				isMatchIndexBased(Input, InputStart + 1, Pattern, PatternStart)
			);
			
		return StarMatchIsUsed;
	}
	else if ((*(Input + InputStart) != '\0') && (
				(*(Pattern + PatternStart) == *(Input + InputStart)) || (*(Pattern + PatternStart) == '.')
			)
		)
	{
		return isMatchIndexBased(Input, InputStart + 1, Pattern, PatternStart + 1);
	}
	else
	{
		return false;
	}
}

bool
runMatch(char *Input)
{
	char *Pattern = Input;
	while (*(++Pattern) != '\0') {}
	Pattern += 1;	
	bool Result = isMatchIndexBased(Input, 0, Pattern, 0);

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
