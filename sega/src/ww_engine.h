/* Движок Wrong World без привязки к железу: тот же сюжет и те же правила, что в веб-версии (src/App.tsx). */
#ifndef WW_ENGINE_H
#define WW_ENGINE_H

#include "story_data.h"

#define WW_KIND_GOTO 0
#define WW_KIND_LAUNCH 1
#define WW_KIND_EXIT 2
#define WW_KIND_WIN 3
#define WW_KIND_WAKE 4

#define WW_SCREEN_SCENE 0
#define WW_SCREEN_DEATH 1

#define WW_MUSIC_MAIN 0
#define WW_MUSIC_COMPUTER 1
#define WW_MUSIC_DEATH 2

#define WW_NO_DEATH (-1)
#define WW_NO_ENDING (-1)

typedef struct
{
    u16 text;
    u16 target;
    u8 kind;
    u8 ending;
    u8 insight;
} WWChoice;

typedef struct
{
    u16 start;
    u8 length;
} WWLine;

typedef struct
{
    /* Прогресс между жизнями — его и сохраняем. */
    u32 memory;
    u8 endings;
    s8 lastDeath;

    /* Текущая жизнь: у каждого слоя игры в игре свои флаги. */
    u16 run[WW_MAX_LAYER_DEPTH + 1];
    u8 depth;
    u16 scene;

    /* Что показать на экране. */
    u8 screen;
    u8 music;
    s8 death;
    s8 wonEnding;
    bool saveDirty;
    u8 text[WW_MAX_TEXT];
    u16 textLength;
    WWChoice choices[WW_MAX_CHOICES];
    u8 choiceCount;
} WWGame;

void ww_load_progress(WWGame* game, u32 memory, u8 endings, s8 lastDeath);
void ww_start(WWGame* game);
void ww_choose(WWGame* game, u8 index);

u8 ww_death_count(const WWGame* game);
u8 ww_ending_count(const WWGame* game);
bool ww_has_death(const WWGame* game, u8 id);
bool ww_has_ending(const WWGame* game, u8 id);

const u8* ww_string(u16 index);
u16 ww_string_length(u16 index);

/* Разбивает текст на строки не шире width; возвращает количество строк (не больше maxLines). */
u8 ww_wrap(const u8* text, u16 length, u8 width, WWLine* lines, u8 maxLines);

#endif
