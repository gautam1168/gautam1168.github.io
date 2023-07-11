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

struct profile_anchor
{
  u64 TSCElapsedExclusive;
  u64 TSCElapsedInclusive;
  u64 HitCount;
  char const *Label;
};

struct profiler
{
  profile_anchor Anchors[4096];
  u64 StartTSC;
  u64 EndTSC;
};
static profiler GlobalProfiler;
static u32 GlobalProfilerParent;

struct profile_block
{
  profile_block(char const *Label_, u32 AnchorIndex_)
  {
    ParentIndex = GlobalProfilerParent;

    AnchorIndex = AnchorIndex_;
    Label = Label_;

    profile_anchor *Anchor = GlobalProfiler.Anchors + AnchorIndex;
    OldTSCElapsedInclusive = Anchor->TSCElapsedInclusive;
    GlobalProfilerParent  = AnchorIndex;
    StartTSC = ReadCPUTimer();
  }

  ~profile_block(void)
  {
    u64 Elapsed = ReadCPUTimer() - StartTSC;
    GlobalProfilerParent = ParentIndex;

    profile_anchor *Parent = GlobalProfiler.Anchors + ParentIndex;
    profile_anchor *Anchor = GlobalProfiler.Anchors + AnchorIndex;

    Parent->TSCElapsedExclusive -= Elapsed;
    Anchor->TSCElapsedExclusive += Elapsed;
    Anchor->TSCElapsedInclusive = OldTSCElapsedInclusive + Elapsed;
    ++Anchor->HitCount;

    Anchor->Label = Label;
  }

  char const *Label;
  u64 OldTSCElapsedInclusive;
  u64 StartTSC;
  u32 ParentIndex;
  u32 AnchorIndex;
};

#define NameConcat(A, B) A##B
#define TimeBlock(Name) profile_block NameConcat(Block, __LINE__)(Name, __COUNTER__ + 1);
#define TimeFunction TimeBlock(__func__)

void 
PrintTimeElapsed(u64 TotalTSCElapsed, profile_anchor *Anchor)
{
  f64 Percent = 100.0 * ((f64)Anchor->TSCElapsedExclusive / (f64)TotalTSCElapsed);
  printf("%s[%llu]: %llu (%.2f%%", Anchor->Label, Anchor->HitCount, Anchor->TSCElapsedExclusive, Percent);
  if (Anchor->TSCElapsedInclusive != Anchor->TSCElapsedExclusive)
  {
    f64 PercentWithChildren = 100.0 * ((f64)Anchor->TSCElapsedInclusive / (f64)TotalTSCElapsed);
    printf(", %.2f%% w/children", PercentWithChildren);
  }
  printf(")\n");
}

void 
BeginProfile(void)
{
  GlobalProfiler.StartTSC = ReadCPUTimer();
}

void
EndAndPrintProfile()
{
  GlobalProfiler.EndTSC = ReadCPUTimer();
  u64 CPUFreq = EstimateCPUTimerFrequency();

  u64 TotalCPUElapsed = GlobalProfiler.EndTSC - GlobalProfiler.StartTSC;

  if (CPUFreq)
  {
    printf("\nTotal time: %0.4fms (CPU freq %llu)\n", 1000.0 * (f64)TotalCPUElapsed / (f64)CPUFreq, 
        CPUFreq);
  }

  for (u32 AnchorIndex = 0; AnchorIndex < ArraySize(GlobalProfiler.Anchors); ++AnchorIndex)
  {
    profile_anchor *Anchor = GlobalProfiler.Anchors + AnchorIndex;
    if (Anchor->TSCElapsedInclusive)
    {
      PrintTimeElapsed(TotalCPUElapsed, Anchor);
    }
  }
}

