/*
 * Заглушка SGDK 2.11 для проверки main.c обычным компилятором (sega/tools/host-test.cmd).
 * Сигнатуры и макросы скопированы из inc/*.h SGDK v2.11; кода здесь нет — только объявления.
 */
#ifndef WW_SGDK_STUB_H
#define WW_SGDK_STUB_H

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

#define PAL0 0
#define PAL1 1
#define PAL2 2
#define PAL3 3

#define TILE_USER_INDEX 16
#define TILE_ATTR_PRIORITY_SFT 15
#define TILE_ATTR_PALETTE_SFT 13
#define TILE_ATTR_VFLIP_SFT 12
#define TILE_ATTR_HFLIP_SFT 11
#define TILE_ATTR_FULL(pal, prio, flipV, flipH, index)                                                              \
    (((flipH) << TILE_ATTR_HFLIP_SFT) + ((flipV) << TILE_ATTR_VFLIP_SFT) + ((pal) << TILE_ATTR_PALETTE_SFT) + \
     ((prio) << TILE_ATTR_PRIORITY_SFT) + (index))

#define VDPPALETTE_REDMASK 0x000E
#define VDPPALETTE_GREENMASK 0x00E0
#define VDPPALETTE_BLUEMASK 0x0E00
#define RGB24_TO_VDPCOLOR(color)                                                                                     \
    ((((((color) + 0x100000) < 0xFF0000 ? (color) + 0x100000 : 0xFF0000) >> (20)) & VDPPALETTE_REDMASK) |           \
     ((((((color) & 0xff00) + 0x1000) < 0xFF00 ? ((color) & 0xff00) + 0x1000 : 0xFF00) >> ((1 * 4) + 4)) &        \
      VDPPALETTE_GREENMASK) |                                                                                        \
     ((((((color) & 0xff) + 0x10) < 0xFF ? ((color) & 0xff) + 0x10 : 0xFF) << 4) & VDPPALETTE_BLUEMASK))

typedef enum
{
    BG_A = 0,
    BG_B = 1,
    WINDOW = 2
} VDPPlane;

typedef enum
{
    CPU = 0,
    DMA = 1,
    DMA_QUEUE = 2,
    DMA_QUEUE_COPY = 3
} TransferMethod;

#define JOY_1 0x0000
#define BUTTON_UP 0x0001
#define BUTTON_DOWN 0x0002
#define BUTTON_LEFT 0x0004
#define BUTTON_RIGHT 0x0008
#define BUTTON_A 0x0040
#define BUTTON_B 0x0010
#define BUTTON_C 0x0020
#define BUTTON_START 0x0080

typedef void JoyEventCallback(u16 joy, u16 changed, u16 state);

void VDP_setScreenWidth320(void);
void VDP_setBackgroundColor(u8 value);
void VDP_clearPlane(VDPPlane plane, bool wait);
void VDP_loadTileData(const u32* data, u16 index, u16 num, TransferMethod tm);
void VDP_setTileMapXY(VDPPlane plane, u16 tile, u16 x, u16 y);
void PAL_setColor(u16 index, u16 value);
void JOY_setEventHandler(JoyEventCallback* CB);
bool SYS_doVBlankProcess(void);
void SRAM_enable(void);
void SRAM_enableRO(void);
void SRAM_disable(void);
u8 SRAM_readByte(u32 offset);
void SRAM_writeByte(u32 offset, u8 val);

#endif
