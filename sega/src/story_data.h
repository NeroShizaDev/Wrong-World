/* Сгенерировано sega/tools/export-story.mjs из src/story.ts. Не править вручную: node sega/tools/export-story.mjs */

#ifndef WW_STORY_DATA_H
#define WW_STORY_DATA_H

#include "ww_data.h"

#define WW_TEXT_WIDTH 38
#define WW_MAX_TEXT 746
#define WW_MAX_CHOICES 9
#define WW_MAX_LAYER_DEPTH 3
#define WW_SCENE_COUNT 62
#define WW_CHOICE_DEF_COUNT 221
#define WW_DEATH_COUNT 26
#define WW_ENDING_COUNT 2
#define WW_GLYPH_COUNT 140
#define WW_CODE_COUNT 143

#define WW_SCENE_START 0
#define WW_SCENE_RESPAWN 1
#define WW_SCENE_NESTED_START 30
#define WW_SCENE_NESTED_EXIT 31
#define WW_SCENE_TOO_DEEP 33
#define WW_SCENE_IDLE 13

#define WW_MEM_DIED 0x04000000
/* память "died" — бит 26 */
/* память "know_book" — бит 27 */
/* память "know_mimic" — бит 28 */
/* память "woke_before" — бит 29 */
/* флаг жизни "book_read" — бит 0 */
/* флаг жизни "cactus_watered" — бит 1 */
/* флаг жизни "chair_stool" — бит 2 */
/* флаг жизни "courier_gone" — бит 3 */
/* флаг жизни "has_blanket" — бит 4 */
/* флаг жизни "has_cactus" — бит 5 */
/* флаг жизни "has_robe" — бит 6 */
/* флаг жизни "has_tea" — бит 7 */
/* флаг жизни "idle_warned" — бит 8 */
/* флаг жизни "sticker_read" — бит 9 */
/* флаг жизни "tamed" — бит 10 */

#define WW_STR_IDLE 34
#define WW_UI_TITLE 0
#define WW_UI_EYEBROW 1
#define WW_UI_SUBTITLE_1 2
#define WW_UI_SUBTITLE_2 3
#define WW_UI_SUBTITLE_3 4
#define WW_UI_MENU_WAKE 5
#define WW_UI_MENU_COLLECTION 6
#define WW_UI_STATUS_HINT 7
#define WW_UI_COLLECTION 6
#define WW_UI_BACK 8
#define WW_UI_ENDINGS 9
#define WW_UI_DEATHS 10
#define WW_UI_LOCKED 11
#define WW_UI_DEATH_PREFIX 12
#define WW_UI_COLON_SPACE 13
#define WW_UI_DIVIDER 14
#define WW_UI_DARKNESS 15
#define WW_UI_NEW_DEATH 16
#define WW_UI_OLD_DEATH 17
#define WW_UI_NESTED_DEATH 18
#define WW_UI_WAKE 19
#define WW_UI_MORE 20
#define WW_UI_ENDING_CONTINUE 21
#define WW_UI_ENDING_RESET 22
#define WW_UI_LAST_DEATH_NONE 23
#define WW_UI_LAYER_1 24
#define WW_UI_LAYER_2 25
#define WW_UI_LAYER_3 26
#define WW_UI_ICON_DEATH 27
#define WW_UI_ICON_ENDING 28
#define WW_UI_ICON_INSIGHT 29
#define WW_UI_CURSOR 30
#define WW_UI_PROMPT 31
#define WW_UI_QUOTE_OPEN 32
#define WW_UI_QUOTE_CLOSE 33

#define WW_CODE_SPACE 3
#define WW_CODE_UNDERSCORE 43
#define WW_CODE_SLASH 13
#define WW_CODE_DIGIT_0 14

extern const char* const ww_strings[];
extern const WWCond ww_conds[];
extern const WWSceneDef ww_scenes[];
extern const WWVariantDef ww_variants[];
extern const WWNoteDef ww_notes[];
extern const WWChoiceDef ww_choices[];
extern const WWDeathDef ww_deaths[];
extern const WWEndingDef ww_endings[];
extern const u8 ww_corrupt[];
extern const u32 ww_font_tiles[];
#ifdef WW_HOST
extern const char* const ww_glyph_utf8[];
#endif

#endif
