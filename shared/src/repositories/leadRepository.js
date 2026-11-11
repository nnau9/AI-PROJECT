import { validateLead, normalizeLead } from '../services/leads.js';

/**
 * Отправка заявки. Пока backend не подключён (endpoint пуст), это ЗАГЛУШКА:
 * данные никуда не передаются и нигде не сохраняются, возвращается { stub: true }.
 *
 * @param {{ endpoint?: string|null, fetchImpl?: typeof fetch, delayMs?: number }} [config]
 */
export function createLeadRepository(config = {}) {
  const { endpoint = null, fetchImpl = globalThis.fetch, delayMs = 600 } = config;

  return {
    isConnected: Boolean(endpoint),
    /**
     * @param {import('../types.js').LeadInput} input
     * @returns {Promise<{ ok: true, stub: boolean }>}
     */
    async submit(input) {
      const errors = validateLead(input);
      if (Object.keys(errors).length > 0) {
        const error = new Error('Проверьте поля формы');
        error.fieldErrors = errors;
        throw error;
      }
      const lead = normalizeLead(input);

      if (!endpoint) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return { ok: true, stub: true };
      }

      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      if (!response.ok) throw new Error(`Сервер ответил ошибкой: HTTP ${response.status}`);
      return { ok: true, stub: false };
    },
  };
}
