/*
 * Снимки экрана Mega Drive без эмулятора: настоящий sega/src/main.c собирается с рабочими заглушками VDP,
 * получает нажатия кнопок по сценарию и сохраняет кадры 320×224 в out/host/screens/*.ppm.
 * Запуск на Windows: sega\tools\screen-preview.cmd
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "genesis.h"

int ww_sega_main(bool hardReset);

static u32 vram[2048][8];
static u16 tilemap[28][64];
static u16 cram[64];
static u8 backgroundIndex;
static u8 sram[64];
static JoyEventCallback* joyHandler;

void VDP_setScreenWidth320(void) {}
void VDP_setBackgroundColor(u8 value) { backgroundIndex = value; }
void VDP_clearPlane(VDPPlane plane, bool wait)
{
    (void) plane;
    (void) wait;
    memset(tilemap, 0, sizeof tilemap);
}
void VDP_loadTileData(const u32* data, u16 index, u16 num, TransferMethod tm)
{
    (void) tm;
    memcpy(vram[index], data, (size_t) num * 8 * sizeof(u32));
}
void VDP_setTileMapXY(VDPPlane plane, u16 tile, u16 x, u16 y)
{
    (void) plane;
    if (x < 64 && y < 28) tilemap[y][x] = tile;
}
void PAL_setColor(u16 index, u16 value) { cram[index & 63] = value; }
void JOY_setEventHandler(JoyEventCallback* CB) { joyHandler = CB; }
void SRAM_enable(void) {}
void SRAM_enableRO(void) {}
void SRAM_disable(void) {}
u8 SRAM_readByte(u32 offset) { return sram[offset & 63]; }
void SRAM_writeByte(u32 offset, u8 val) { sram[offset & 63] = val; }

static void vdp_rgb(u16 color, u8* rgb)
{
    rgb[0] = (u8) (((color >> 1) & 7) * 36);
    rgb[1] = (u8) (((color >> 5) & 7) * 36);
    rgb[2] = (u8) (((color >> 9) & 7) * 36);
}

static void snapshot(const char* name)
{
    static u8 pixels[224][320][3];
    char path[256];
    FILE* file;
    int x, y;

    for (y = 0; y < 224; y++)
    {
        for (x = 0; x < 320; x++)
        {
            const u16 tile = tilemap[y / 8][x / 8];
            const u16 index = tile & 0x7FF;
            const u16 pal = (tile >> 13) & 3;
            const u32 row = vram[index][y % 8];
            const u8 color = (u8) ((row >> ((7 - x % 8) * 4)) & 0xF);
            vdp_rgb(color ? cram[pal * 16 + color] : cram[backgroundIndex], pixels[y][x]);
        }
    }

    snprintf(path, sizeof path, "out/host/screens/%s.ppm", name);
    file = fopen(path, "wb");
    if (!file)
    {
        printf("Не удалось записать %s\n", path);
        exit(1);
    }
    fprintf(file, "P6 320 224 255\n");
    fwrite(pixels, sizeof pixels, 1, file);
    fclose(file);
    printf("Снимок: %s\n", path);
}

/* Сценарий: кнопки по одной за кадр; строка с '!' — снимок экрана. Курсор на каждом экране начинается сверху. */
static const char* const script[] = {
    "!01-title",
    "A", "!02-intro",
    "D", "D", "A", "!03-room",
    "A", "!04-sticker",
    "A", "!05-computer",
    "A", "!06-mimic-death",
    "A", "D", "D", "A", "D", "A", "A", "!07-pc",
    "A", "!08-layer-1",
    "A", "!09-layer-2",
    "A", "!10-layer-3",
    "A", "!11-nested-death",
    "S", "!12-collection", "B",
    /* Кактус не виноват: испуг, курьер, извинение, полив, зелёный коридор. */
    "A", "D", "D", "A", "D", "D", "D", "D", "A", "A",
    "A", "D", "D", "A", "D", "D", "D", "D", "D", "D", "A", "A",
    "A", "D", "D", "A", "D", "D", "D", "D", "A", "!13-cactus-insight",
    "D", "A", "D", "D", "D", "D", "A", "D", "A", "!14-watered",
    "D", "D", "D", "D", "D", "A", "D", "A", "A", "!15-green-corridor",
    "A", "!16-ending",
    NULL,
};

static int step = 0;

bool SYS_doVBlankProcess(void)
{
    const char* action = script[step];
    u16 button = 0;

    if (!action)
    {
        printf("Сценарий снимков закончен.\n");
        exit(0);
    }
    step++;

    if (action[0] == '!')
    {
        snapshot(action + 1);
        return TRUE;
    }

    switch (action[0])
    {
        case 'A': button = BUTTON_A; break;
        case 'B': button = BUTTON_B; break;
        case 'C': button = BUTTON_C; break;
        case 'S': button = BUTTON_START; break;
        case 'U': button = BUTTON_UP; break;
        case 'D': button = BUTTON_DOWN; break;
        default: break;
    }
    if (joyHandler && button) joyHandler(JOY_1, button, button);
    return TRUE;
}

int main(void)
{
    return ww_sega_main(TRUE);
}
