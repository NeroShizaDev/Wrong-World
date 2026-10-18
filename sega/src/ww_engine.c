#include "ww_engine.h"

#define DEATH_BIT(id) (((u32)1) << (id))

const u8* ww_string(u16 index)
{
    return (const u8*) ww_strings[index];
}

u16 ww_string_length(u16 index)
{
    const u8* text = ww_string(index);
    u16 length = 0;
    while (text[length] != WW_CODE_END) length++;
    return length;
}

static bool condition_ok(const WWGame* game, u16 index)
{
    const WWCond* cond = &ww_conds[index];
    const u16 run = game->run[game->depth];

    if ((game->memory & cond->memAll) != cond->memAll) return FALSE;
    if (game->memory & cond->memNone) return FALSE;
    if ((run & cond->runAll) != cond->runAll) return FALSE;
    if (run & cond->runNone) return FALSE;
    if ((s16) game->depth < cond->minDepth) return FALSE;
    if ((s16) game->depth > cond->maxDepth) return FALSE;
    return TRUE;
}

static const WWVariantDef* resolve_scene(const WWGame* game, u16 scene)
{
    const WWSceneDef* def = &ww_scenes[scene];
    u8 i;

    for (i = 0; i < def->variantCount; i++)
    {
        const WWVariantDef* variant = &ww_variants[def->firstVariant + i];
        if (condition_ok(game, variant->cond)) return variant;
    }
    return &ww_variants[def->firstVariant + def->variantCount - 1];
}

static void put_code(WWGame* game, u8 code)
{
    if (game->textLength < WW_MAX_TEXT) game->text[game->textLength++] = code;
}

static void put_string(WWGame* game, u16 index);

static void put_last_death(WWGame* game)
{
    if (game->lastDeath == WW_NO_DEATH)
    {
        put_string(game, WW_UI_LAST_DEATH_NONE);
        return;
    }
    put_string(game, WW_UI_QUOTE_OPEN);
    put_string(game, ww_deaths[(u8) game->lastDeath].name);
    put_string(game, WW_UI_QUOTE_CLOSE);
}

static void put_string(WWGame* game, u16 index)
{
    const u8* text = ww_string(index);

    while (*text != WW_CODE_END)
    {
        if (*text == WW_CODE_LAST_DEATH) put_last_death(game);
        else put_code(game, *text);
        text++;
    }
}

static void put_number(WWGame* game, u8 value)
{
    if (value >= 10) put_code(game, WW_CODE_DIGIT_0 + value / 10);
    put_code(game, WW_CODE_DIGIT_0 + value % 10);
}

/* Порча текста в игре внутри игры, как corruptText() в веб-версии. */
static void corrupt(WWGame* game, u16 from)
{
    u16 i;

    if (game->depth < 2) return;
    for (i = from; i < game->textLength; i++)
    {
        if (game->depth == 2)
        {
            if ((i - from) % 13 == 0) game->text[i] = WW_CODE_UNDERSCORE;
        }
        else if (game->text[i] < WW_CODE_COUNT)
        {
            game->text[i] = ww_corrupt[game->text[i]];
        }
    }
}

static void add_choice(WWGame* game, u16 text, u16 target, u8 kind, u8 ending, u8 insight)
{
    WWChoice* choice;

    if (game->choiceCount >= WW_MAX_CHOICES) return;
    choice = &game->choices[game->choiceCount++];
    choice->text = text;
    choice->target = target;
    choice->kind = kind;
    choice->ending = ending;
    choice->insight = insight;
}

static void die(WWGame* game, u8 id)
{
    const bool nested = game->depth > 0;
    const bool isNew = (game->memory & DEATH_BIT(id)) == 0;
    u8 i;

    /* Смерть в игре внутри игры настоящая: все слои схлопываются в комнату. */
    if (nested)
    {
        put_code(game, WW_CODE_NEWLINE);
        put_string(game, WW_UI_NESTED_DEATH);
    }
    put_code(game, WW_CODE_NEWLINE);
    put_code(game, WW_CODE_NEWLINE);
    put_string(game, WW_UI_DIVIDER);
    put_code(game, WW_CODE_NEWLINE);
    put_string(game, WW_UI_DEATH_PREFIX);
    put_number(game, id);
    put_string(game, WW_UI_COLON_SPACE);
    put_string(game, ww_deaths[id].name);
    put_code(game, WW_CODE_NEWLINE);
    put_string(game, ww_deaths[id].desc);
    put_code(game, WW_CODE_NEWLINE);
    put_string(game, WW_UI_DIVIDER);
    put_code(game, WW_CODE_NEWLINE);
    put_code(game, WW_CODE_NEWLINE);
    put_string(game, WW_UI_DARKNESS);
    put_code(game, WW_CODE_NEWLINE);
    put_string(game, isNew ? WW_UI_NEW_DEATH : WW_UI_OLD_DEATH);

    game->memory |= DEATH_BIT(id) | WW_MEM_DIED;
    game->lastDeath = (s8) id;
    game->depth = 0;
    for (i = 0; i <= WW_MAX_LAYER_DEPTH; i++) game->run[i] = 0;
    game->screen = WW_SCREEN_DEATH;
    game->death = (s8) id;
    game->music = WW_MUSIC_DEATH;
    game->saveDirty = TRUE;

    game->choiceCount = 0;
    add_choice(game, WW_UI_WAKE, WW_SCENE_RESPAWN, WW_KIND_WAKE, 0, 0);
}

static void enter(WWGame* game, u16 scene)
{
    const WWVariantDef* variant = resolve_scene(game, scene);
    u16 textStart;
    u8 i;

    if ((game->memory | variant->rememberMask) != game->memory)
    {
        game->memory |= variant->rememberMask;
        game->saveDirty = TRUE;
    }
    game->run[game->depth] |= variant->setMask;
    game->run[game->depth] &= (u16) ~variant->unsetMask;

    game->scene = scene;
    game->screen = WW_SCREEN_SCENE;
    game->death = WW_NO_DEATH;
    game->textLength = 0;
    game->choiceCount = 0;

    if ((variant->flags & WW_VARIANT_GRAPHICS) && game->depth > 0)
    {
        const u8 level = game->depth > 3 ? 3 : game->depth;
        put_string(game, level == 1 ? WW_UI_LAYER_1 : level == 2 ? WW_UI_LAYER_2 : WW_UI_LAYER_3);
        put_code(game, WW_CODE_NEWLINE);
        put_code(game, WW_CODE_NEWLINE);
    }

    textStart = game->textLength;
    put_string(game, variant->text);
    for (i = 0; i < variant->noteCount; i++)
    {
        const WWNoteDef* note = &ww_notes[variant->firstNote + i];
        if (!condition_ok(game, note->cond)) continue;
        put_code(game, WW_CODE_NEWLINE);
        put_string(game, note->text);
    }

    if (variant->death >= 0)
    {
        die(game, (u8) variant->death);
        return;
    }

    corrupt(game, textStart);

    for (i = 0; i < variant->choiceCount; i++)
    {
        const WWChoiceDef* def = &ww_choices[variant->firstChoice + i];
        if (!condition_ok(game, def->cond)) continue;
        add_choice(game, def->text, def->target, def->action, def->ending, def->insight);
    }
    if (game->depth == 0 && (variant->flags & WW_VARIANT_IDLE) && game->choiceCount > 0)
    {
        add_choice(game, WW_STR_IDLE, WW_SCENE_IDLE, WW_KIND_GOTO, 0, 0);
    }

    game->music = (game->depth > 0 || (variant->flags & WW_VARIANT_COMPUTER)) ? WW_MUSIC_COMPUTER : WW_MUSIC_MAIN;
}

void ww_load_progress(WWGame* game, u32 memory, u8 endings, s8 lastDeath)
{
    game->memory = memory;
    game->endings = endings;
    game->lastDeath = (lastDeath >= 0 && lastDeath < WW_DEATH_COUNT) ? lastDeath : WW_NO_DEATH;
    game->saveDirty = FALSE;
}

void ww_start(WWGame* game)
{
    u8 i;

    game->depth = 0;
    for (i = 0; i <= WW_MAX_LAYER_DEPTH; i++) game->run[i] = 0;
    game->wonEnding = WW_NO_ENDING;
    enter(game, WW_SCENE_START);
}

void ww_choose(WWGame* game, u8 index)
{
    const WWChoice* choice;

    if (index >= game->choiceCount) return;
    choice = &game->choices[index];

    switch (choice->kind)
    {
        case WW_KIND_WAKE:
            enter(game, WW_SCENE_RESPAWN);
            break;

        case WW_KIND_LAUNCH:
            if (game->depth >= WW_MAX_LAYER_DEPTH)
            {
                enter(game, WW_SCENE_TOO_DEEP);
            }
            else
            {
                game->depth++;
                game->run[game->depth] = 0;
                enter(game, WW_SCENE_NESTED_START);
            }
            break;

        case WW_KIND_EXIT:
            if (game->depth > 0) game->depth--;
            enter(game, WW_SCENE_NESTED_EXIT);
            break;

        case WW_KIND_WIN:
            game->endings |= (u8) (1 << choice->ending);
            game->wonEnding = (s8) choice->ending;
            game->saveDirty = TRUE;
            break;

        default:
            enter(game, choice->target);
            break;
    }
}

u8 ww_death_count(const WWGame* game)
{
    u8 count = 0;
    u8 id;

    for (id = 0; id < WW_DEATH_COUNT; id++)
        if (game->memory & DEATH_BIT(id)) count++;
    return count;
}

u8 ww_ending_count(const WWGame* game)
{
    u8 count = 0;
    u8 id;

    for (id = 0; id < WW_ENDING_COUNT; id++)
        if (game->endings & (1 << id)) count++;
    return count;
}

bool ww_has_death(const WWGame* game, u8 id)
{
    return (game->memory & DEATH_BIT(id)) != 0;
}

bool ww_has_ending(const WWGame* game, u8 id)
{
    return (game->endings & (1 << id)) != 0;
}

u8 ww_wrap(const u8* text, u16 length, u8 width, WWLine* lines, u8 maxLines)
{
    u8 count = 0;
    u16 start = 0;

    while (start < length && count < maxLines)
    {
        u16 end = start;
        u16 lastSpace = 0xFFFF;

        while (end < length && text[end] != WW_CODE_NEWLINE && end - start < width)
        {
            if (text[end] == WW_CODE_SPACE) lastSpace = end;
            end++;
        }

        /* Слово не влезло — переносим его целиком; слишком длинное слово режем. */
        if (end < length && end - start == width && text[end] != WW_CODE_NEWLINE && text[end] != WW_CODE_SPACE &&
            lastSpace != 0xFFFF)
        {
            end = lastSpace;
        }

        lines[count].start = start;
        lines[count].length = (u8) (end - start);
        count++;

        start = end;
        if (start < length && (text[start] == WW_CODE_NEWLINE || text[start] == WW_CODE_SPACE)) start++;
    }

    return count;
}
