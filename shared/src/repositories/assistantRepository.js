import { buildKnowledgeBase, createIndex, findAnswer, selectContext, isReadyAnswer } from '../services/assistant.js';
import { needsTeam, HANDOFF_TEXT, CONTACT_LINK } from '../services/handoff.js';

const CONTENT_LOADERS = {
  program: 'getProgram',
  steps: 'getSteps',
  agencies: 'getAgencies',
  sponsors: 'getSponsors',
  plans: 'getPlans',
  importantNotes: 'getImportantNotes',
  sources: 'getSources',
};

/** Загружает весь контент сайта через contentRepository — для базы знаний помощника. */
export async function loadAssistantContent(contentRepository) {
  const keys = Object.keys(CONTENT_LOADERS);
  const values = await Promise.all(keys.map((key) => contentRepository[CONTENT_LOADERS[key]]()));
  return Object.fromEntries(keys.map((key, i) => [key, values[i]]));
}

// Ссылки из ответа сервера допускаются только на разделы самого сайта («/plans», «/steps#ds160»).
function sanitizeLinks(links) {
  if (!Array.isArray(links)) return [];
  return links
    .filter((l) => l && typeof l.to === 'string' && typeof l.label === 'string' && /^\/(?!\/)/.test(l.to))
    .slice(0, 3)
    .map((l) => ({ to: l.to, label: l.label.slice(0, 80) }));
}

// Предложить связаться с командой: та же кнопка «Задать вопрос команде» (форма заявки), что и раньше.
function withTeamLink(links) {
  if (links.some((l) => l.to === CONTACT_LINK.to)) return links;
  return [CONTACT_LINK, ...links].slice(0, 3);
}

/**
 * Ответы помощника.
 *
 * Порядок:
 * 1. Готовый ответ (быстрые кнопки, приветствие, связь с командой и т. п. — см. isReadyAnswer)
 *    отдаётся как есть, прямо из браузера.
 * 2. Иначе, если задан endpoint, вопрос уходит на сервер чата с языковой моделью
 *    (server/ в корне проекта): модель отвечает по материалам сайта, при необходимости
 *    ищет на официальных сайтах программы J-1 и не выдумывает цены, даты и условия.
 *      POST {endpoint}
 *      { question, history: [{ role: 'user'|'assistant', text }], context: [{ title, text, link }] }
 *      → { answer: string, links?: [{ to, label }], handoff?: boolean }
 *    handoff: true — вопрос требует сотрудника; к ответу добавляется кнопка связи с командой.
 * 3. Без endpoint или при сбое сервера — локальный ответ по материалам сайта, как раньше.
 *
 * Ключ API хранится только на сервере; браузер его не знает.
 *
 * @param {{ loadContent: () => Promise<object>, endpoint?: string|null, fetchImpl?: typeof fetch, delayMs?: number, timeoutMs?: number }} config
 */
export function createAssistantRepository(config) {
  const { loadContent, endpoint = null, fetchImpl = globalThis.fetch, delayMs = 650, timeoutMs = 60000 } = config;

  let indexPromise = null;
  const getIndex = () => {
    if (!indexPromise) {
      indexPromise = loadContent()
        .then((content) => createIndex(buildKnowledgeBase(content)))
        .catch((error) => {
          indexPromise = null;
          throw error;
        });
    }
    return indexPromise;
  };

  async function askRemote(question, history, index) {
    const controller = typeof AbortController === 'undefined' ? null : new AbortController();
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history, context: selectContext(question, index) }),
        signal: controller?.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (typeof data?.answer !== 'string' || !data.answer.trim()) throw new Error('Пустой ответ сервера');
      const handoff = data.handoff === true || needsTeam(question);
      const links = sanitizeLinks(data.links);
      return { text: data.answer.trim(), links: handoff ? withTeamLink(links) : links, matched: true, topic: null, mode: 'api' };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return {
    isConnected: Boolean(endpoint),
    /** Заранее собрать базу знаний (например, при открытии чата). */
    warmUp: () => getIndex().then(() => undefined),
    /**
     * @param {string} question
     * @param {{ role: 'user'|'assistant', text: string }[]} [history]
     * @returns {Promise<{ text: string, links: {to:string,label:string}[], matched: boolean, topic: string|null, mode: 'local'|'api' }>}
     */
    async ask(question, history = []) {
      const index = await getIndex();
      const local = findAnswer(question, index);
      const ready = isReadyAnswer(question, local);
      if (endpoint && !ready) {
        try {
          return await askRemote(question, history.slice(-10), index);
        } catch {
          /* сервер недоступен — отвечаем по материалам сайта локально */
        }
      } else if (delayMs > 0) {
        // Короткая пауза, чтобы ответ не «выстреливал» мгновенно и был виден индикатор набора.
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      const { matched, topic } = local;
      let { text, links } = local;
      // Вопрос про оплату, договор, личную ситуацию и т. п. — после ответа предлагаем команду.
      if (!ready && needsTeam(question)) {
        if (!text.includes(HANDOFF_TEXT)) text = `${text}\n\n${HANDOFF_TEXT}`;
        links = withTeamLink(links);
      }
      return { text, links, matched, topic: topic ?? null, mode: 'local' };
    },
  };
}
