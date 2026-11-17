// Провайдер Anthropic Claude (платный ключ — console.anthropic.com). Поиск в интернете —
// серверный инструмент web_search, жёстко ограниченный списком доменов.

import { DEFAULT_SEARCH_DOMAINS } from '../chat.js';

/** Текст итогового ответа: текстовые блоки после последнего поиска. */
export function extractText(content) {
  let start = 0;
  content.forEach((block, i) => {
    if (block.type === 'server_tool_use' || block.type.endsWith('_tool_result')) start = i + 1;
  });
  return content
    .slice(start)
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

/**
 * @param {{
 *   client: { beta: { messages: { create: Function } } },
 *   model?: string,
 *   effort?: 'low'|'medium'|'high',
 *   searchDomains?: string[],
 *   maxSearches?: number,
 * }} options
 */
export function createAnthropicProvider({ client, model = 'claude-opus-5-5', effort = 'low', searchDomains = DEFAULT_SEARCH_DOMAINS, maxSearches = 3 }) {
  const tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: maxSearches, allowed_domains: searchDomains }];

  return {
    name: `anthropic:${model}`,
    async generate({ rules, site, messages, hint }) {
      // Неизменная часть запроса (правила + весь сайт) кэшируется между вопросами.
      const system = [
        { type: 'text', text: rules },
        { type: 'text', text: site, cache_control: { type: 'ephemeral' } },
      ];
      let turn = [...messages];
      // Подсказка оператора — отдельным системным сообщением после вопроса, а не внутри текста пользователя.
      if (hint) turn.push({ role: 'system', content: hint });

      let response;
      // Долгий поиск может прийти с pause_turn — тогда продолжаем тот же ход.
      for (let attempt = 0; attempt < 4; attempt += 1) {
        response = await client.beta.messages.create({
          model,
          max_tokens: 16000,
          output_config: { effort },
          // Если модель отклонит запрос, сервер API сам повторит его на запасной модели.
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system,
          tools,
          messages: turn,
        });
        if (response.stop_reason !== 'pause_turn') break;
        turn = [...turn, { role: 'assistant', content: response.content }];
      }

      if (response.stop_reason === 'refusal') throw new Error('Модель отклонила запрос');
      return extractText(response.content);
    },
  };
}
