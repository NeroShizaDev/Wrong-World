/* Заголовок ROM: как стандартный rom_head.c из SGDK 2.11, но с названием игры. SRAM объявлена для сохранений. */
#include "genesis.h"

__attribute__((externally_visible))
const ROMHeader rom_header = {
#if (ENABLE_BANK_SWITCH != 0)
    "SEGA SSF        ",
#elif (MODULE_MEGAWIFI != 0)
    "SEGA MEGAWIFI   ",
#else
    "SEGA MEGA DRIVE ",
#endif
    "(C)NSDV 2026.OCT",
    "WRONG WORLD                                     ",
    "WRONG WORLD                                     ",
    "GM 00000000-00",
    0x000,
    "JD              ",
    0x00000000,
#if (ENABLE_BANK_SWITCH != 0)
    0x003FFFFF,
#else
    0x000FFFFF,
#endif
    0xE0FF0000,
    0xE0FFFFFF,
    "RA",
    0xF820,
    0x00200000,
    0x0020FFFF,
    "            ",
    "TECHNO-MAGIC TEXT ADVENTURE             ",
    "JUE             "
};
