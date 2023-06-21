#if !defined(TYPES_H)
#define TYPES_H

#define ArraySize(Arr) sizeof(Arr)/sizeof(Arr[0])
#define Kilobyte(N) N * 1024LL
#define Megabyte(N) Kilobyte(N)*1024LL
#define Assert(expr) if (!(expr)) { __builtin_trap(); }typedef unsigned char u8;

typedef unsigned char u8;
typedef unsigned short u16;
typedef unsigned int u32;
typedef unsigned long long u64;

typedef char s8;
typedef short s16;
typedef int s32;
typedef long long s64;

typedef float f32;
typedef double f64;

#endif
