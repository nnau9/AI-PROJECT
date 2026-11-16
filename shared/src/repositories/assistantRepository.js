import { buildKnowledgeBase, createIndex, findAnswer, selectContext } from '../services/assistant.js';

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

/**
 * Ответы помощника.
 *
 * Без endpoint (по умолчанию) ответ подбирается прямо в браузере из материалов сайта:
 * вопрос никуда не отправляется и нигде не сохраняется.
 *
 * С endpoint вопрос уходит на ваш сервер с языковой моделью:
 *   POST {endpoint}
 *   { question, history: [{ role: 'user'|'assistant', text }], context: [{ title, text, link }] }
 *   → { answer: string, links?: [{ to, label }] }
 * context — карточки сайта, ближайшие к вопросу: модель должна отвечать только по ним.
 * Если сервер недоступен или ответил ошибкой, используется локальный ответ.
 *
 * @param {{ loadContent: () => Promise<object>, endpoint?: string|null, fetchImpl?: typeof fetch, delayMs?: number, timeoutMs?: number }} config
 */
export function createAssistantRepository(config) {
  const { loadContent, endpoint = null, fetchImpl = globalThis.fetch, delayMs = 650, timeoutMs = 20000 } = config;

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
      return { text: data.answer.trim(), links: sanitizeLinks(data.links), matched: true, topic: null, mode: 'api' };
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
      if (endpoint) {
        try {
          return await askRemote(question, history.slice(-10), index);
        } catch {
          /* сервер недоступен — отвечаем по материалам сайта локально */
        }
      } else if (delayMs > 0) {
        // Короткая пауза, чтобы ответ не «выстреливал» мгновенно и был виден индикатор набора.
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      const { text, links, matched, topic } = findAnswer(question, index);
      return { text, links, matched, topic: topic ?? null, mode: 'local' };
    },
  };
}
