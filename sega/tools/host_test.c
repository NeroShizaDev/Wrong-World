/*
 * Нативная проверка движка Mega Drive без эмулятора: собирается обычным C-компилятором с WW_HOST.
 * Проходит обе концовки по сценарию, проверяет игру в игре и прах прошлого вас,
 * а затем случайно блуждает по сюжету в поисках переполнений и слишком длинных строк.
 * Запуск на Windows: sega\tools\host-test.cmd
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "ww_engine.h"

static int failures = 0;

#define CHECK(condition, message)                                   \
    do                                                              \
    {                                                               \
        if (!(condition))                                           \
        {                                                           \
            printf("FAIL %s:%d: %s\n", __FILE__, __LINE__, message); \
            failures++;                                             \
        }                                                           \
    } while (0)

static void decode(const u8* codes, u16 length, char* out, size_t size)
{
    size_t used = 0;
    u16 i;

    out[0] = 0;
    for (i = 0; i < length; i++)
    {
        const char* utf8 = ww_glyph_utf8[codes[i]];
        size_t len = strlen(utf8);
        if (used + len + 1 >= size) break;
        memcpy(out + used, utf8, len);
        used += len;
    }
    out[used] = 0;
}

static void decode_string(u16 index, char* out, size_t size)
{
    decode(ww_string(index), ww_string_length(index), out, size);
}

static void screen_text(const WWGame* game, char* out, size_t size)
{
    decode(game->text, game->textLength, out, size);
}

/* Выбирает вариант, текст которого содержит needle. */
static int pick(WWGame* game, const char* needle)
{
    char buffer[512];
    u8 i;

    for (i = 0; i < game->choiceCount; i++)
    {
        decode_string(game->choices[i].text, buffer, sizeof buffer);
        if (strstr(buffer, needle))
        {
            ww_choose(game, i);
            return 1;
        }
    }

    printf("FAIL: нет выбора «%s». Есть:\n", needle);
    for (i = 0; i < game->choiceCount; i++)
    {
        decode_string(game->choices[i].text, buffer, sizeof buffer);
        printf("  - %s\n", buffer);
    }
    failures++;
    return 0;
}

static int play(WWGame* game, const char* const* steps)
{
    for (; *steps; steps++)
        if (!pick(game, *steps)) return 0;
    return 1;
}

static void expect_death(const WWGame* game, int id, const char* label)
{
    char message[128];
    snprintf(message, sizeof message, "%s: ожидалась смерть #%d, а получилось %d", label, id, game->death);
    CHECK(game->screen == WW_SCREEN_DEATH && game->death == id, message);
}

static void scripted(void)
{
    static WWGame game;
    char text[4096];

    ww_load_progress(&game, 0, 0, WW_NO_DEATH);
    ww_start(&game);
    screen_text(&game, text, sizeof text);
    CHECK(strstr(text, "Будильник звонит в 7:00") != NULL, "стартовая сцена");
    CHECK(game.music == WW_MUSIC_MAIN, "в комнате играет основная тема");

    /* Прах прошлого вас называет прошлую смерть. */
    {
        static const char* const steps[] = {"Резко вскочить", NULL};
        play(&game, steps);
        expect_death(&game, 0, "одеяло");
        CHECK(game.music == WW_MUSIC_DEATH, "музыка смерти");
    }
    {
        static const char* const steps[] = {"Открыть глаза", "Осторожно встать", "Подойти к компьютеру", "Сдуть пыль", NULL};
        play(&game, steps);
        expect_death(&game, 11, "пыль");
        screen_text(&game, text, sizeof text);
        CHECK(strstr(text, "того, кого убило «Одеяло-убийца»") != NULL, "прах напоминает прошлую смерть");
    }

    /* Побег на мимике: одеяло, стул, битва титанов, приручение. */
    {
        static const char* const steps[] = {"Открыть глаза", "Осторожно встать", "Подойти к компьютеру", "Сесть на стул", NULL};
        play(&game, steps);
        expect_death(&game, 7, "стул-мимик");
    }
    {
        static const char* const steps[] = {"Открыть глаза", "Выбраться из-под одеяла", "Подойти к компьютеру", "Бросить одеяло на стул-мимик", NULL};
        play(&game, steps);
        expect_death(&game, 23, "битва титанов");
    }
    {
        static const char* const steps[] = {"Открыть глаза", "Выбраться из-под одеяла", "Подойти к компьютеру", "нырнуть за шкаф",
                                            "Выехать в дверь", "Навстречу закату", NULL};
        play(&game, steps);
        CHECK(game.wonEnding == 0, "концовка «Выживший»");
        CHECK(ww_has_ending(&game, 0), "концовка сохранена");
    }

    /* Компьютер и игра в игре: музыка компьютера, четвёртый слой убивает и возвращает в комнату. */
    ww_start(&game);
    {
        static const char* const steps[] = {"Осторожно встать", "Подойти к компьютеру", "Сесть на стул", NULL};
        play(&game, steps);
        CHECK(game.music == WW_MUSIC_COMPUTER, "за компьютером играет его тема");
    }
    {
        static const char* const steps[] = {"Запустить «Wrong World Demo»", "Выйти из игры", NULL};
        play(&game, steps);
        CHECK(game.depth == 0 && game.screen == WW_SCREEN_SCENE, "выход из игры возвращает к компьютеру");
    }
    {
        static const char* const steps[] = {"Запустить «Wrong World Demo»", "Запустить игру на компьютере в игре",
                                            "Запустить игру на компьютере в игре", NULL};
        play(&game, steps);
        CHECK(game.depth == 3, "третий слой");
        screen_text(&game, text, sizeof text);
        CHECK(strstr(text, "бНОПНЯ") != NULL, "описание графики третьего слоя");
        pick(&game, "Запустить игру");
        expect_death(&game, 8, "слишком глубоко");
        CHECK(game.depth == 0, "смерть в игре схлопывает слои");
        screen_text(&game, text, sizeof text);
        CHECK(strstr(text, "Смерть в игре оказалась настоящей") != NULL, "строка про настоящую смерть");
    }

    /* Стоять столбом: пылесос, а во второй раз — столб. */
    {
        static const char* const steps[] = {"Открыть глаза", "Осторожно встать", "Стоять столбом", "Стоять дальше", NULL};
        play(&game, steps);
        expect_death(&game, 14, "пылесос");
    }
    {
        static const char* const steps[] = {"Открыть глаза", "Осторожно встать", "Стоять столбом", "Пошевелиться", "Стоять столбом", NULL};
        play(&game, steps);
        expect_death(&game, 25, "столб");
    }

    /* Кактус не виноват: испуг, курьер, извинение, полив, зелёный коридор. */
    ww_load_progress(&game, 0, 0, WW_NO_DEATH);
    ww_start(&game);
    {
        static const char* const steps[] = {"Осторожно встать", "Подойти к кактусу", "Потрогать кактус", NULL};
        play(&game, steps);
        expect_death(&game, 20, "кактус");
        screen_text(&game, text, sizeof text);
        CHECK(strstr(text, "Кактус не виноват") != NULL, "название смерти №20");
    }
    {
        static const char* const steps[] = {"Открыть глаза", "Осторожно встать", "Подойти к двери", "Открыть курьеру", NULL};
        play(&game, steps);
        expect_death(&game, 22, "курьер");
    }
    {
        static const char* const steps[] = {"Открыть глаза", "Осторожно встать", "Подойти к кактусу", "Протянуть ладонь",
                                            "Заняться чайником", "пока кактус сторожит", "Подойти к двери", "Сделать вид",
                                            "довериться кактусу", "Выйти во двор", NULL};
        play(&game, steps);
        CHECK(game.wonEnding == 1, "концовка «Кактус не виноват»");
    }
}

static int bit_count(u32 value)
{
    int count = 0;
    for (; value; value &= value - 1) count++;
    return count;
}

/* Случайное блуждание: ни буфер текста, ни список выборов не должны переполняться. */
static void random_walk(void)
{
    static WWGame game;
    static WWLine lines[64];
    u32 seed = 12345;
    long step;
    u32 deaths = 0;
    u8 endings = 0;
    u16 longestText = 0;
    u8 mostLines = 0;

    ww_load_progress(&game, 0, 0, WW_NO_DEATH);
    ww_start(&game);

    for (step = 0; step < 300000; step++)
    {
        u8 count;
        u8 i;

        CHECK(game.textLength < WW_MAX_TEXT, "буфер текста переполнен");
        CHECK(game.choiceCount > 0 || game.wonEnding != WW_NO_ENDING, "тупик без выборов");
        if (game.textLength > longestText) longestText = game.textLength;

        count = ww_wrap(game.text, game.textLength, WW_TEXT_WIDTH, lines, 64);
        if (count > mostLines) mostLines = count;
        for (i = 0; i < count; i++) CHECK(lines[i].length <= WW_TEXT_WIDTH, "строка шире экрана");

        if (game.screen == WW_SCREEN_DEATH) deaths |= ((u32) 1) << game.death;
        if (game.wonEnding != WW_NO_ENDING)
        {
            endings |= (u8) (1 << game.wonEnding);
            ww_start(&game);
            continue;
        }

        seed = seed * 1103515245u + 12345u;
        ww_choose(&game, (u8) ((seed >> 16) % game.choiceCount));
        if (failures > 20) break;
    }

    printf("Случайное блуждание: смертей встречено %d/%d, концовок %d/%d, самый длинный экран %u байт (буфер %d), "
           "строк до %u.\n",
           bit_count(deaths), WW_DEATH_COUNT, bit_count(endings), WW_ENDING_COUNT, longestText, WW_MAX_TEXT,
           mostLines);
}

/* Каждая строка выбора должна помещаться в две строки экрана рядом с курсором. */
static void choice_widths(void)
{
    static WWLine lines[8];
    u16 i;

    for (i = 0; i < WW_CHOICE_DEF_COUNT; i++)
    {
        const u16 text = ww_choices[i].text;
        const u8 count = ww_wrap(ww_string(text), ww_string_length(text), WW_TEXT_WIDTH - 4, lines, 8);
        CHECK(count <= 2, "выбор занимает больше двух строк");
    }
}

int main(void)
{
    scripted();
    choice_widths();
    random_walk();

    if (failures)
    {
        printf("Провалено проверок: %d\n", failures);
        return 1;
    }
    printf("Движок Mega Drive: все проверки пройдены.\n");
    return 0;
}
