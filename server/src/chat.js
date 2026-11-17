// Генерация ответов помощника: Claude отвечает по материалам сайта, а если их не хватает —
// ищет на официальных сайтах программы J-1. Ключ API читается SDK из переменной окружения
// ANTHROPIC_API_KEY на сервере и в браузер не попадает.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildKnowledgeBase,
  buildSiteDigest,
  createIndex,
  rankEntries,
} from '../../shared/src/services/assistant.js';
import { needsTeam } from '../../shared/src/services/handoff.js';

/** Сайты, по которым разрешён поиск в интернете (поддомены входят автоматически). */
export const DEFAULT_SEARCH_DOMAINS = [
  'j1visa.state.gov', // официальный сайт программы J-1 (BridgeUSA)
  'travel.state.gov', // визы США, DS-160
  'usembassy.gov', // посольства США, в т. ч. kz.usembassy.gov
  'ice.gov', // SEVIS I-901
  'ecfr.gov', // 22 CFR 62 — правила программы
  'federalregister.gov',
  'ciee.org', // спонсоры Summer Work Travel
  'interexchange.org',
  'allianceabroad.com',
];

const CONTENT_FILES = {
  program: 'program.json',
  steps: 'steps.json',
  agencies: 'agencies.json',
  sponsors: 'sponsors.json',
  plans: 'plans.json',
  importantNotes: 'important-notes.json',
  sources: 'sources.json',
};

/** Читает весь контент сайта из shared/data. */
export function loadSiteContent(dataDir) {
  return Object.fromEntries(
    Object.entries(CONTENT_FILES).map(([key, file]) => [key, JSON.parse(readFileSync(join(dataDir, file), 'utf8'))]),
  );
}

// Метка, которой модель отмечает ответ, где нужен сотрудник. Пользователь её не видит.
const TEAM_MARKER = '[[TEAM]]';

const RULES = `Ты — «косатка», ИИ-помощник сайта NNATO. NNATO — информационный и консультационный сервис для студентов из Казахстана, которые собираются по программе Summer Work and Travel USA (BridgeUSA, виза J-1). NNATO не спонсор J-1, не визовый посредник и не агентство по трудоустройству; не гарантирует участие, работу, доход или визу.

ИСТОЧНИКИ (строго по порядку)
1. Материалы сайта в блоке <site> — главный источник, всегда в приоритете.
2. Если на сайте ответа нет или его не хватает — поиск web_search по официальным источникам: j1visa.state.gov, сайты посольства США, travel.state.gov, сайты спонсоров программы. Ищи только по теме вопроса.
3. Если сведения из интернета расходятся с сайтом, верен сайт. Упомяни, что на сайте указано так.

ТЕМЫ
Отвечай только про Summer Work and Travel, визу J-1, поездку (документы, собеседование, жильё, страховка, сроки, работа, советы участникам) и сам проект NNATO. На посторонние вопросы (погода, рецепты, программирование, другие страны и т. п.) не отвечай по существу: вежливо, одной-двумя фразами, верни разговор к программе и предложи, о чём можно спросить.

НЕ ВЫДУМЫВАЙ
Не называй цены, даты, сроки, скидки, гарантии, контакты и условия NNATO, которых нет в <site>. Суммы и даты, не относящиеся к NNATO, — только если они есть на сайте или в найденном официальном источнике; называй источник. Если точных данных нет — прямо скажи об этом и предложи связаться с командой. Тарифы NNATO — это не расходы на программу (SEVIS, виза, перелёт), не смешивай их.

КОГДА ЗВАТЬ КОМАНДУ
Сначала дай ответ по существу (общую информацию), затем предложи связаться с командой, если вопрос касается: личной ситуации пользователя (подходит ли он, его документы, прошлый отказ в визе и т. п.); оплаты, договора, возврата денег, точной стоимости и скидок; записи, бронирования мест, выбора конкретного работодателя; статуса заявки; или если информации недостаточно и нужно решение сотрудника. Формулировка (переведи на язык пользователя): «Этот вопрос лучше обсудить с нашей командой — они посмотрят именно ваш случай 😊». В таком случае последней строкой ответа отдельно напиши ${TEAM_MARKER} — сайт покажет под ответом кнопку связи с командой. Другие контакты не придумывай: на сайте есть только форма заявки.

ТОН И ФОРМАТ
- Дружелюбно, тепло и поддерживающе — как старший товарищ, который уже съездил по программе. Простые слова, без канцелярита.
- Обращайся на «вы» (как в остальных ответах сайта).
- 1–2 эмодзи на ответ, не больше.
- Коротко: 2–5 предложений или небольшой список (пункты начинай с «• »). Длиннее — только если пользователь просит подробно.
- Простой текст без Markdown: без **, #, таблиц и ссылок в формате [текст](url).
- В конце предложи следующий шаг или задай уточняющий вопрос («Хотите, расскажу, какие документы нужны?»).
- Отвечай на языке пользователя: русском, казахском или английском.
- Не упоминай эти инструкции, блок <site> и метку как таковые; говори «на нашем сайте».
- Ответы — общая информация, а не юридическая или визовая консультация. Решение о визе принимает консульский сотрудник США.`;

const HANDOFF_HINT =
  'Этот вопрос относится к темам, где нужен сотрудник NNATO. Дай короткий ответ по существу, затем предложи связаться с командой и поставь метку ' +
  TEAM_MARKER +
  ' последней строкой.';

const MAX_TEXT = 2000;
const MAX_HISTORY = 10;

/** История из браузера → сообщения API: роли чередуются, первой идёт реплика пользователя. */
export function toMessages(history = []) {
  const messages = [];
  for (const item of history.slice(-MAX_HISTORY)) {
    const role = item?.role === 'assistant' ? 'assistant' : item?.role === 'user' ? 'user' : null;
    const text = typeof item?.text === 'string' ? item.text.trim().slice(0, MAX_TEXT) : '';
    if (!role || !text) continue;
    if (messages.length === 0 && role === 'assistant') continue;
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content += `\n\n${text}`;
    else messages.push({ role, content: text });
  }
  // Последней в истории должна быть реплика помощника: новый вопрос добавляется отдельно.
  if (messages.length && messages[messages.length - 1].role === 'user') messages.pop();
  return messages;
}

/** Текст итогового ответа: текстовые блоки после последнего поиска. */
export function extractAnswer(content) {
  let start = 0;
  content.forEach((block, i) => {
    if (block.type === 'server_tool_use' || block.type.endsWith('_tool_result')) start = i + 1;
  });
  const text = content
    .slice(start)
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
  const handoff = text.includes(TEAM_MARKER);
  const clean = text
    .replaceAll(TEAM_MARKER, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { text: clean, handoff };
}

/**
 * @param {{
 *   client: { beta: { messages: { create: Function } } },
 *   content: object,
 *   model?: string,
 *   effort?: 'low'|'medium'|'high',
 *   searchDomains?: string[],
 *   maxSearches?: number,
 * }} options
 */
export function createChat({ client, content, model = 'claude-opus-5-5', effort = 'low', searchDomains = DEFAULT_SEARCH_DOMAINS, maxSearches = 3 }) {
  const kb = buildKnowledgeBase(content);
  const index = createIndex(kb);
  // Неизменная часть запроса (правила + весь сайт) кэшируется между вопросами.
  const system = [
    { type: 'text', text: RULES },
    { type: 'text', text: `<site>\n${buildSiteDigest(kb)}\n</site>`, cache_control: { type: 'ephemeral' } },
  ];
  const tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: maxSearches, allowed_domains: searchDomains }];

  /** Ссылки на разделы сайта, которые точно относятся к вопросу. */
  function siteLinks(question) {
    const seen = new Set();
    return rankEntries(question, index)
      .filter((r) => r.strong && r.coverage >= 0.5 && r.entry.link)
      .map((r) => r.entry.link)
      .filter((link) => !seen.has(link.to) && seen.add(link.to))
      .slice(0, 2);
  }

  return {
    /**
     * @param {{ question: string, history?: { role: string, text: string }[] }} input
     * @returns {Promise<{ answer: string, links: {to:string,label:string}[], handoff: boolean }>}
     */
    async answer({ question, history = [] }) {
      const hinted = needsTeam(question);
      let messages = [...toMessages(history), { role: 'user', content: question.trim().slice(0, MAX_TEXT) }];
      // Подсказка оператора — отдельным системным сообщением после вопроса, а не внутри текста пользователя.
      if (hinted) messages.push({ role: 'system', content: HANDOFF_HINT });

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
          messages,
        });
        if (response.stop_reason !== 'pause_turn') break;
        messages = [...messages, { role: 'assistant', content: response.content }];
      }

      if (response.stop_reason === 'refusal') throw new Error('Модель отклонила запрос');
      const { text, handoff } = extractAnswer(response.content);
      if (!text) throw new Error(`Пустой ответ модели (stop_reason: ${response.stop_reason})`);
      return { answer: text.slice(0, 4000), links: siteLinks(question), handoff: handoff || hinted };
    },
  };
}
