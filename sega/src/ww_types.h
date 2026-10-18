/* Базовые типы: на Mega Drive берутся из SGDK, в нативном тесте (WW_HOST) — из stdint. */
#ifndef WW_TYPES_H
#define WW_TYPES_H

#ifdef WW_HOST
#include <stdint.h>

typedef uint8_t u8;
typedef int8_t s8;
typedef uint16_t u16;
typedef int16_t s16;
typedef uint32_t u32;
typedef int32_t s32;
typedef u8 bool;

#define TRUE 1
#define FALSE 0
#else
#include <genesis.h>
#endif

#endif
