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
