// Генерация ответов помощника: модель отвечает по материалам сайта, а если их не хватает —
// ищет на официальных сайтах программы J-1. Сама модель подключается через провайдера
// (providers/gemini.js или providers/anthropic.js); ключ API живёт только на сервере.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildKnowledgeBase,
  buildSiteDigest,
  createIndex,
  rankEntries,
} from '../../shared/src/services/assistant.js';
import { needsTeam } from '../../shared/src/services/handoff.js';

/** Сайты, по которым разрешён поиск (Claude: жёсткий фильтр; Gemini: только через правила). */
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
2. Если на сайте ответа нет или его не хватает — поиск в интернете. Опирайся только на надёжные источники: j1visa.state.gov, travel.state.gov, сайты посольства США (kz.usembassy.gov), ice.gov, сайты спонсоров программы (CIEE, InterExchange, Alliance Abroad и др.). Форумы, блоги, соцсети и сайты агентств для фактов не используй. Ищи только по теме вопроса.
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

// Материалы сайта на русском и тянут модель к русскому — поэтому язык вопроса подсказываем явно.
const LANGUAGE_HINTS = {
  en: 'The user writes in English. Answer entirely in English (translate the site information and the phrase about the team).',
  kk: 'Пользователь пишет по-казахски. Отвечай полностью на казахском языке.',
};

/** Язык вопроса: kk (казахские буквы), en (латиница) или ru. */
export function detectLanguage(text) {
  const value = String(text ?? '');
  if (/[әғқңөұүһі]/i.test(value)) return 'kk';
  const cyr = (value.match(/[а-яё]/gi) ?? []).length;
  const lat = (value.match(/[a-z]/gi) ?? []).length;
  return lat > cyr ? 'en' : 'ru';
}

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

/** Убирает служебную метку и Markdown-жирный; handoff — модель попросила позвать команду. */
export function cleanAnswer(raw) {
  const text = String(raw ?? '').trim();
  const handoff = text.includes(TEAM_MARKER);
  const clean = text
    .replaceAll(TEAM_MARKER, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { text: clean, handoff };
}

/**
 * @typedef {{ role: 'user'|'assistant', content: string }} ChatMessage
 * @typedef {{
 *   name: string,
 *   generate: (input: { rules: string, site: string, messages: ChatMessage[], hint: string|null }) => Promise<string>,
 * }} Provider  generate возвращает текст ответа или бросает ошибку (отказ, пустой ответ, сбой API).
 */

/**
 * @param {{ provider: Provider, content: object }} options
 */
export function createChat({ provider, content }) {
  const kb = buildKnowledgeBase(content);
  const index = createIndex(kb);
  const site = `<site>\n${buildSiteDigest(kb)}\n</site>`;

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
    provider: provider.name,
    /**
     * @param {{ question: string, history?: { role: string, text: string }[] }} input
     * @returns {Promise<{ answer: string, links: {to:string,label:string}[], handoff: boolean }>}
     */
    async answer({ question, history = [] }) {
      const hinted = needsTeam(question);
      const messages = [...toMessages(history), { role: 'user', content: question.trim().slice(0, MAX_TEXT) }];
      const hint = [hinted ? HANDOFF_HINT : null, LANGUAGE_HINTS[detectLanguage(question)]].filter(Boolean).join('\n') || null;
      const raw = await provider.generate({ rules: RULES, site, messages, hint });
      const { text, handoff } = cleanAnswer(raw);
      if (!text) throw new Error(`Пустой ответ модели (${provider.name})`);
      return { answer: text.slice(0, 4000), links: siteLinks(question), handoff: handoff || hinted };
    },
  };
}
