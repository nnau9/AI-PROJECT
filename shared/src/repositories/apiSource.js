// Заготовка источника контента из API. Backend должен отдавать те же
// структуры, что и JSON-файлы в shared/data:
//   GET {baseUrl}/content/{name}
//   name: program | steps | agencies | sponsors | plans | importantNotes | sources

/**
 * @param {{ baseUrl: string, fetchImpl?: typeof fetch }} options
 */
export function createApiSource({ baseUrl, fetchImpl = globalThis.fetch }) {
  const root = baseUrl.replace(/\/+$/, '');
  return {
    async get(name) {
      const response = await fetchImpl(`${root}/content/${encodeURIComponent(name)}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Не удалось загрузить «${name}»: HTTP ${response.status}`);
      }
      return response.json();
    },
  };
}
