// Провайдер Google Gemini (бесплатный ключ — Google AI Studio).
//
// Модели перебираются по порядку: если модель перегружена (503/504), недоступна (404)
// или исчерпала квоту (429), запрос уходит следующей. Модели 2.5 новым ключам уже не выдаются.
//
// Поиск в интернете — встроенный инструмент googleSearch. На бесплатном тарифе для моделей
// Gemini 3 у него нет квоты (429): тогда сервер отвечает без поиска, только по материалам сайта,
// и не пробует поиск снова в течение часа. С платным ключом поиск включится сам.
// Ограничить поиск доменами Gemini API не позволяет, поэтому источники заданы в правилах (RULES).

const BLOCKED = new Set(['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'IMAGE_SAFETY']);
const NEXT_MODEL = new Set([404, 429, 500, 503, 504]);
const SEARCH_RETRY_MS = 60 * 60 * 1000;

export const DEFAULT_GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

const NO_SEARCH_NOTE =
  'Поиск в интернете сейчас недоступен. Отвечай по материалам сайта и общеизвестным сведениям о программе J-1; ' +
  'если для точного ответа нужны актуальные данные (сборы, сроки, правила), скажи об этом и посоветуй проверить на j1visa.state.gov или сайте посольства США.';

/**
 * @param {{
 *   client: { models: { generateContent: Function } },
 *   models?: string[],
 *   search?: 'auto'|'on'|'off'|boolean,
 *   now?: () => number,
 * }} options
 *   search: auto — пробовать поиск и обходиться без него, если нет квоты; on — только с поиском; off — без поиска.
 */
export function createGeminiProvider({ client, models = DEFAULT_GEMINI_MODELS, search = 'auto', now = Date.now }) {
  const mode = search === true ? 'on' : search === false ? 'off' : search;
  let searchBlockedUntil = 0;

  async function call(model, { contents, systemInstruction, withSearch }) {
    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: withSearch ? systemInstruction : `${systemInstruction}\n\n${NO_SEARCH_NOTE}`,
        temperature: 0.4,
        maxOutputTokens: 2048,
        ...(withSearch ? { tools: [{ googleSearch: {} }] } : {}),
      },
    });
    if (response.promptFeedback?.blockReason) throw new Error(`Gemini заблокировал запрос: ${response.promptFeedback.blockReason}`);
    const finish = response.candidates?.[0]?.finishReason;
    if (finish && BLOCKED.has(finish)) throw new Error(`Gemini остановил ответ: ${finish}`);
    return response.text ?? '';
  }

  return {
    name: `gemini:${models[0]}`,
    async generate({ rules, site, messages, hint }) {
      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      // Подсказку оператора кладём в системные инструкции, а не в текст пользователя.
      const systemInstruction = [rules, site, hint].filter(Boolean).join('\n\n');

      let lastError;
      for (const model of models) {
        const trySearch = mode === 'on' || (mode === 'auto' && now() >= searchBlockedUntil);
        try {
          return await call(model, { contents, systemInstruction, withSearch: trySearch });
        } catch (error) {
          lastError = error;
          // Нет квоты на поиск — повторяем на той же модели без поиска.
          if (trySearch && mode === 'auto' && error.status === 429) {
            searchBlockedUntil = now() + SEARCH_RETRY_MS;
            try {
              return await call(model, { contents, systemInstruction, withSearch: false });
            } catch (retryError) {
              lastError = retryError;
              if (!NEXT_MODEL.has(retryError.status)) throw retryError;
              continue;
            }
          }
          if (!NEXT_MODEL.has(error.status)) throw error;
        }
      }
      throw lastError;
    },
  };
}
