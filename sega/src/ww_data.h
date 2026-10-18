/* Формат данных сюжета, который генерирует sega/tools/export-story.mjs. */
#ifndef WW_DATA_H
#define WW_DATA_H

#include "ww_types.h"

/* Коды символов в строках: 0 — конец, 1 — перевод строки, 2 — название прошлой смерти, дальше глифы шрифта. */
#define WW_CODE_END 0
#define WW_CODE_NEWLINE 1
#define WW_CODE_LAST_DEATH 2
#define WW_CODE_FIRST_GLYPH 3

#define WW_ACTION_GOTO 0
#define WW_ACTION_LAUNCH 1
#define WW_ACTION_EXIT 2
#define WW_ACTION_WIN 3

#define WW_VARIANT_IDLE 1     /* можно предложить «Стоять столбом» */
#define WW_VARIANT_GRAPHICS 2 /* показать описание графики слоя */
#define WW_VARIANT_COMPUTER 4 /* герой сидит за компьютером */

/* Условие: все биты memAll/runAll есть, ни одного из memNone/runNone нет, глубина в пределах. */
typedef struct
{
    u32 memAll;
    u32 memNone;
    u16 runAll;
    u16 runNone;
    s8 minDepth;
    s8 maxDepth;
} WWCond;

typedef struct
{
    u16 text;
    u16 cond;
} WWNoteDef;

typedef struct
{
    u16 text;
    u16 cond;
    u16 target;
    u8 action;
    u8 ending;
    u8 insight;
} WWChoiceDef;

typedef struct
{
    u16 cond;
    u16 text;
    u16 firstNote;
    u16 firstChoice;
    u8 noteCount;
    u8 choiceCount;
    s8 death;
    u8 flags;
    u16 setMask;
    u16 unsetMask;
    u32 rememberMask;
} WWVariantDef;

typedef struct
{
    u16 firstVariant;
    u8 variantCount;
} WWSceneDef;

typedef struct
{
    u16 name;
    u16 desc;
} WWDeathDef;

typedef struct
{
    u16 title;
    u16 desc;
} WWEndingDef;

#endif
