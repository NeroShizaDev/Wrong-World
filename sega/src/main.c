/*
 * Wrong World для Sega Mega Drive / Genesis (SGDK 2.11).
 * Экран 40×28 клеток, свой шрифт 8×8 с кириллицей, сюжет из src/story.ts (см. sega/tools/export-story.mjs).
 * Управление: крестовина — выбор, A или C — подтвердить / листать дальше, B — назад, START — коллекция.
 */
#include <genesis.h>

#include "ww_engine.h"

#define SCREEN_COLS 40
#define LEFT 1
#define STATUS_ROW 1
#define TEXT_TOP 3
#define BOTTOM_ROW 26
#define AREA_ROWS (BOTTOM_ROW - TEXT_TOP + 1)
#define PAGE_LINES (AREA_ROWS - 1)
#define MAX_TEXT_LINES 64
#define CHOICE_TEXT_X (LEFT + 2)
#define CHOICE_INSIGHT_TEXT_X (LEFT + 4)
#define CHOICE_WIDTH (WW_TEXT_WIDTH - 4)

#define PAL_TEXT PAL0
#define PAL_INSIGHT PAL1
#define PAL_ACCENT PAL2
#define PAL_DANGER PAL3

#define FONT_BASE TILE_USER_INDEX

#define LIST_TOP 3
#define LIST_ROWS 17
#define DESC_DIVIDER_ROW 21
#define DESC_TOP 22
#define DESC_ROWS 5

#define BUTTON_OK (BUTTON_A | BUTTON_C)

enum
{
    STATE_TITLE,
    STATE_GAME,
    STATE_COLLECTION,
    STATE_ENDING
};

static WWGame game;
static u8 state;
static u8 collectionReturn;
static volatile u16 pressed;

static u8 titleCursor;

static WWLine textLines[MAX_TEXT_LINES];
static u8 textLineCount;
static WWLine choiceLines[WW_MAX_CHOICES][2];
static u8 choiceLineCount[WW_MAX_CHOICES];
static u16 choiceRow[WW_MAX_CHOICES];
static u8 choiceRowsTotal;
static u8 page;
static u8 pageCount;
static u8 cursor;

static u8 collectionCursor;
static u8 collectionScroll;

/* Цвета слоёв игры в игре повторяют GRAPHICS_LEVELS из веб-версии: фон и текст. */
static const u16 layerColors[4][2] = {
    {RGB24_TO_VDPCOLOR(0x0a0a12), RGB24_TO_VDPCOLOR(0xe8e0d4)},
    {RGB24_TO_VDPCOLOR(0x101018), RGB24_TO_VDPCOLOR(0xb0b0b0)},
    {RGB24_TO_VDPCOLOR(0x000000), RGB24_TO_VDPCOLOR(0x33ff33)},
    {RGB24_TO_VDPCOLOR(0x0a0000), RGB24_TO_VDPCOLOR(0xff6633)},
};

static void on_joy(u16 joy, u16 changed, u16 joyState)
{
    if (joy == JOY_1) pressed |= changed & joyState;
}

/* ── Рисование ───────────────────────────────────────────────────────────── */

static u16 glyph_tile(u8 code, u16 pal)
{
    return TILE_ATTR_FULL(pal, FALSE, FALSE, FALSE, FONT_BASE + code - WW_CODE_FIRST_GLYPH);
}

static void draw_codes(const u8* codes, u16 length, u16 x, u16 y, u16 pal)
{
    u16 i;

    for (i = 0; i < length && x + i < SCREEN_COLS; i++)
    {
        if (codes[i] >= WW_CODE_FIRST_GLYPH) VDP_setTileMapXY(BG_A, glyph_tile(codes[i], pal), x + i, y);
    }
}

static void draw_string(u16 index, u16 x, u16 y, u16 pal)
{
    draw_codes(ww_string(index), ww_string_length(index), x, y, pal);
}

static void draw_string_right(u16 index, u16 y, u16 pal)
{
    draw_string(index, SCREEN_COLS - LEFT - ww_string_length(index), y, pal);
}

static void draw_string_center(u16 index, u16 y, u16 pal)
{
    draw_string(index, (SCREEN_COLS - ww_string_length(index)) / 2, y, pal);
}

static void draw_icon(u16 uiString, u16 x, u16 y, u16 pal)
{
    VDP_setTileMapXY(BG_A, glyph_tile(ww_string(uiString)[0], pal), x, y);
}

static u8 put_number(u8* codes, u8 value)
{
    if (value < 10)
    {
        codes[0] = WW_CODE_DIGIT_0 + value;
        return 1;
    }
    codes[0] = WW_CODE_DIGIT_0 + value / 10;
    codes[1] = WW_CODE_DIGIT_0 + value % 10;
    return 2;
}

static u16 draw_count(u8 value, u8 total, u16 x, u16 y, u16 pal)
{
    u8 codes[5];
    u8 length = put_number(codes, value);

    codes[length++] = WW_CODE_SLASH;
    length += put_number(codes + length, total);
    draw_codes(codes, length, x, y, pal);
    return x + length;
}

static void draw_status(void)
{
    u16 x = LEFT;

    draw_icon(WW_UI_ICON_DEATH, x, STATUS_ROW, PAL_ACCENT);
    x = draw_count(ww_death_count(&game), WW_DEATH_COUNT, x + 2, STATUS_ROW, PAL_ACCENT);
    draw_icon(WW_UI_ICON_ENDING, x + 2, STATUS_ROW, PAL_ACCENT);
    draw_count(ww_ending_count(&game), WW_ENDING_COUNT, x + 4, STATUS_ROW, PAL_ACCENT);
}

static void set_layer_colors(u8 depth)
{
    const u8 level = depth > 3 ? 3 : depth;

    PAL_setColor(0, layerColors[level][0]);
    PAL_setColor(1, layerColors[level][1]);
}

static void clear_screen(u8 depth)
{
    VDP_clearPlane(BG_A, TRUE);
    set_layer_colors(depth);
}

/* ── Сохранение в SRAM картриджа ─────────────────────────────────────────── */

static const u8 saveMagic[4] = {'W', 'W', '0', '1'};

static void save_progress(void)
{
    u8 i;

    SRAM_enable();
    for (i = 0; i < 4; i++) SRAM_writeByte(i, saveMagic[i]);
    for (i = 0; i < 4; i++) SRAM_writeByte(4 + i, (u8) (game.memory >> (24 - i * 8)));
    SRAM_writeByte(8, game.endings);
    SRAM_writeByte(9, (u8) game.lastDeath);
    SRAM_disable();
    game.saveDirty = FALSE;
}

static void load_progress(void)
{
    u32 memory = 0;
    u8 endings = 0;
    s8 lastDeath = WW_NO_DEATH;
    bool valid = TRUE;
    u8 i;

    SRAM_enableRO();
    for (i = 0; i < 4; i++)
        if (SRAM_readByte(i) != saveMagic[i]) valid = FALSE;
    if (valid)
    {
        for (i = 0; i < 4; i++) memory = (memory << 8) | SRAM_readByte(4 + i);
        endings = SRAM_readByte(8);
        lastDeath = (s8) SRAM_readByte(9);
    }
    SRAM_disable();

    ww_load_progress(&game, memory, endings, lastDeath);
}

/* ── Титульный экран ─────────────────────────────────────────────────────── */

static void draw_title_cursor(void)
{
    VDP_setTileMapXY(BG_A, titleCursor == 0 ? glyph_tile(ww_string(WW_UI_CURSOR)[0], PAL_ACCENT) : 0, 14, 19);
    VDP_setTileMapXY(BG_A, titleCursor == 1 ? glyph_tile(ww_string(WW_UI_CURSOR)[0], PAL_ACCENT) : 0, 14, 21);
}

static void show_title(void)
{
    state = STATE_TITLE;
    titleCursor = 0;
    clear_screen(0);
    draw_string_center(WW_UI_EYEBROW, 6, PAL_ACCENT);
    draw_string_center(WW_UI_TITLE, 8, PAL_INSIGHT);
    draw_string_center(WW_UI_SUBTITLE_1, 12, PAL_TEXT);
    draw_string_center(WW_UI_SUBTITLE_2, 13, PAL_TEXT);
    draw_string_center(WW_UI_SUBTITLE_3, 14, PAL_TEXT);
    draw_string(WW_UI_MENU_WAKE, 16, 19, PAL_TEXT);
    draw_string(WW_UI_MENU_COLLECTION, 16, 21, PAL_TEXT);
    draw_status();
    draw_title_cursor();
}

/* ── Игра ────────────────────────────────────────────────────────────────── */

static void layout_game(void)
{
    const u8 indent = game.depth >= 2 ? 2 : 0;
    u8 room;
    u8 i;

    textLineCount = ww_wrap(game.text, game.textLength, WW_TEXT_WIDTH - indent, textLines, MAX_TEXT_LINES);

    choiceRowsTotal = 0;
    for (i = 0; i < game.choiceCount; i++)
    {
        const u16 text = game.choices[i].text;
        choiceLineCount[i] = ww_wrap(ww_string(text), ww_string_length(text), CHOICE_WIDTH, choiceLines[i], 2);
        choiceRowsTotal += choiceLineCount[i];
    }

    /* Последняя страница: остаток текста, пустая строка и выборы. Остальные — по PAGE_LINES строк. */
    room = AREA_ROWS - 1 - choiceRowsTotal;
    pageCount = 1;
    if (textLineCount > room) pageCount += (textLineCount - room + PAGE_LINES - 1) / PAGE_LINES;
    page = 0;
    cursor = 0;
}

static void draw_choice_cursor(void)
{
    u8 i;

    if (page != pageCount - 1) return;
    for (i = 0; i < game.choiceCount; i++)
    {
        const u16 tile = i == cursor ? glyph_tile(ww_string(WW_UI_CURSOR)[0], PAL_ACCENT) : 0;
        VDP_setTileMapXY(BG_A, tile, LEFT, choiceRow[i]);
    }
}

static void draw_game(void)
{
    const u8 indent = game.depth >= 2 ? 2 : 0;
    const u8 first = page * PAGE_LINES;
    const u8 last = page == pageCount - 1 ? textLineCount : first + PAGE_LINES;
    const u8 skull = ww_string(WW_UI_ICON_DEATH)[0];
    u16 y = TEXT_TOP;
    u8 i;

    clear_screen(game.depth);
    draw_status();
    draw_string_right(WW_UI_STATUS_HINT, STATUS_ROW, PAL_ACCENT);

    for (i = first; i < last && i < textLineCount; i++, y++)
    {
        const u8* line = game.text + textLines[i].start;
        const u16 pal = textLines[i].length > 0 && line[0] == skull ? PAL_DANGER : PAL_TEXT;
        if (indent) VDP_setTileMapXY(BG_A, glyph_tile(ww_string(WW_UI_PROMPT)[0], PAL_TEXT), LEFT, y);
        draw_codes(line, textLines[i].length, LEFT + indent, y, pal);
    }

    if (page < pageCount - 1)
    {
        draw_string(WW_UI_MORE, LEFT, BOTTOM_ROW, PAL_ACCENT);
        return;
    }

    y++;
    for (i = 0; i < game.choiceCount; i++)
    {
        const WWChoice* choice = &game.choices[i];
        const u8* text = ww_string(choice->text);
        const u16 pal = choice->insight ? PAL_INSIGHT : PAL_TEXT;
        const u16 x = choice->insight ? CHOICE_INSIGHT_TEXT_X : CHOICE_TEXT_X;
        u8 line;

        choiceRow[i] = y;
        if (choice->insight) draw_icon(WW_UI_ICON_INSIGHT, CHOICE_TEXT_X, y, PAL_INSIGHT);
        for (line = 0; line < choiceLineCount[i]; line++, y++)
        {
            draw_codes(text + choiceLines[i][line].start, choiceLines[i][line].length, x, y, pal);
        }
    }
    draw_choice_cursor();
}

static void show_ending(void);
static void draw_collection(void);

static void refresh_game(void)
{
    if (game.saveDirty) save_progress();
    if (game.wonEnding != WW_NO_ENDING)
    {
        show_ending();
        return;
    }
    layout_game();
    draw_game();
}

static void start_game(void)
{
    state = STATE_GAME;
    ww_start(&game);
    refresh_game();
}

static void handle_game(u16 keys)
{
    if (keys & BUTTON_START)
    {
        collectionReturn = STATE_GAME;
        state = STATE_COLLECTION;
        collectionCursor = 0;
        collectionScroll = 0;
        draw_collection();
        return;
    }

    if (page < pageCount - 1)
    {
        if (keys & BUTTON_OK)
        {
            page++;
            draw_game();
        }
        else if ((keys & BUTTON_B) && page > 0)
        {
            page--;
            draw_game();
        }
        return;
    }

    if ((keys & BUTTON_B) && page > 0)
    {
        page--;
        draw_game();
    }
    else if (keys & BUTTON_UP)
    {
        cursor = cursor == 0 ? game.choiceCount - 1 : cursor - 1;
        draw_choice_cursor();
    }
    else if (keys & BUTTON_DOWN)
    {
        cursor = cursor + 1 >= game.choiceCount ? 0 : cursor + 1;
        draw_choice_cursor();
    }
    else if (keys & BUTTON_OK)
    {
        ww_choose(&game, cursor);
        refresh_game();
    }
}

/* ── Коллекция смертей и концовок ────────────────────────────────────────── */

#define COLLECTION_ITEMS (WW_ENDING_COUNT + WW_DEATH_COUNT)

static void draw_collection(void)
{
    static WWLine lines[DESC_ROWS];
    const u8 skull = ww_string(WW_UI_ICON_DEATH)[0];
    u16 descIndex = WW_UI_LOCKED;
    u8 row;
    u8 count;

    clear_screen(0);
    draw_status();
    draw_string_right(WW_UI_BACK, STATUS_ROW, PAL_ACCENT);

    for (row = 0; row < LIST_ROWS; row++)
    {
        const u8 item = collectionScroll + row;
        const u16 y = LIST_TOP + row;
        u16 x = LEFT + 2;

        if (item >= COLLECTION_ITEMS) break;
        if (item == collectionCursor) VDP_setTileMapXY(BG_A, glyph_tile(ww_string(WW_UI_CURSOR)[0], PAL_ACCENT), LEFT, y);

        if (item < WW_ENDING_COUNT)
        {
            const bool open = ww_has_ending(&game, item);
            draw_icon(WW_UI_ICON_ENDING, x, y, PAL_ACCENT);
            draw_string(open ? ww_endings[item].title : WW_UI_LOCKED, x + 2, y, open ? PAL_INSIGHT : PAL_TEXT);
            if (item == collectionCursor && open) descIndex = ww_endings[item].desc;
        }
        else
        {
            const u8 id = item - WW_ENDING_COUNT;
            const bool open = ww_has_death(&game, id);
            u8 number[2];

            VDP_setTileMapXY(BG_A, glyph_tile(skull, PAL_DANGER), x, y);
            number[0] = WW_CODE_DIGIT_0 + id / 10;
            number[1] = WW_CODE_DIGIT_0 + id % 10;
            draw_codes(number, 2, x + 2, y, PAL_ACCENT);
            draw_string(open ? ww_deaths[id].name : WW_UI_LOCKED, x + 5, y, PAL_TEXT);
            if (item == collectionCursor && open) descIndex = ww_deaths[id].desc;
        }
    }

    draw_string(WW_UI_DIVIDER, LEFT, DESC_DIVIDER_ROW, PAL_ACCENT);
    count = ww_wrap(ww_string(descIndex), ww_string_length(descIndex), WW_TEXT_WIDTH, lines, DESC_ROWS);
    for (row = 0; row < count; row++)
    {
        draw_codes(ww_string(descIndex) + lines[row].start, lines[row].length, LEFT, DESC_TOP + row, PAL_TEXT);
    }
}

static void handle_collection(u16 keys)
{
    if (keys & (BUTTON_B | BUTTON_START))
    {
        if (collectionReturn == STATE_GAME)
        {
            state = STATE_GAME;
            draw_game();
        }
        else
        {
            show_title();
        }
        return;
    }

    if (keys & BUTTON_UP) collectionCursor = collectionCursor == 0 ? COLLECTION_ITEMS - 1 : collectionCursor - 1;
    else if (keys & BUTTON_DOWN) collectionCursor = collectionCursor + 1 >= COLLECTION_ITEMS ? 0 : collectionCursor + 1;
    else return;

    if (collectionCursor < collectionScroll) collectionScroll = collectionCursor;
    if (collectionCursor >= collectionScroll + LIST_ROWS) collectionScroll = collectionCursor - LIST_ROWS + 1;
    draw_collection();
}

/* ── Концовка ────────────────────────────────────────────────────────────── */

static void show_ending(void)
{
    static WWLine lines[12];
    const WWEndingDef* ending = &ww_endings[(u8) game.wonEnding];
    u8 count;
    u8 row;

    state = STATE_ENDING;
    clear_screen(0);
    draw_status();
    draw_string_center(ending->title, 7, PAL_INSIGHT);
    count = ww_wrap(ww_string(ending->desc), ww_string_length(ending->desc), WW_TEXT_WIDTH, lines, 12);
    for (row = 0; row < count; row++)
    {
        draw_codes(ww_string(ending->desc) + lines[row].start, lines[row].length, LEFT, 10 + row, PAL_TEXT);
    }
    draw_string(WW_UI_ENDING_CONTINUE, LEFT, 22, PAL_ACCENT);
    draw_string(WW_UI_ENDING_NEW_GAME, LEFT, 24, PAL_ACCENT);
}

static void handle_ending(u16 keys)
{
    if (keys & (BUTTON_OK | BUTTON_START))
    {
        start_game();
    }
    else if (keys & BUTTON_B)
    {
        ww_load_progress(&game, 0, 0, WW_NO_DEATH);
        save_progress();
        show_title();
    }
}

/* ── Главный цикл ────────────────────────────────────────────────────────── */

static void handle_title(u16 keys)
{
    if (keys & (BUTTON_UP | BUTTON_DOWN))
    {
        titleCursor ^= 1;
        draw_title_cursor();
    }
    else if (keys & (BUTTON_OK | BUTTON_START))
    {
        if (titleCursor == 0)
        {
            start_game();
        }
        else
        {
            collectionReturn = STATE_TITLE;
            state = STATE_COLLECTION;
            collectionCursor = 0;
            collectionScroll = 0;
            draw_collection();
        }
    }
}

int main(bool hardReset)
{
    (void) hardReset;
    VDP_setScreenWidth320();
    VDP_loadTileData(ww_font_tiles, FONT_BASE, WW_GLYPH_COUNT, DMA);
    PAL_setColor(16 + 1, RGB24_TO_VDPCOLOR(0xffdd57));
    PAL_setColor(32 + 1, RGB24_TO_VDPCOLOR(0xc4a35a));
    PAL_setColor(48 + 1, RGB24_TO_VDPCOLOR(0xff6633));
    VDP_setBackgroundColor(0);

    load_progress();
    JOY_setEventHandler(on_joy);
    show_title();

    while (TRUE)
    {
        const u16 keys = pressed;
        pressed = 0;

        if (keys)
        {
            switch (state)
            {
                case STATE_TITLE:
                    handle_title(keys);
                    break;
                case STATE_GAME:
                    handle_game(keys);
                    break;
                case STATE_COLLECTION:
                    handle_collection(keys);
                    break;
                default:
                    handle_ending(keys);
                    break;
            }
        }

        SYS_doVBlankProcess();
    }

    return 0;
}
