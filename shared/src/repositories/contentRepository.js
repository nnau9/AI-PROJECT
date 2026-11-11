import { createJsonSource } from './jsonSource.js';
import { createApiSource } from './apiSource.js';
import { indexById } from '../services/sources.js';

/**
 * Единая точка доступа к контенту. Страницы зависят только от этих методов,
 * поэтому замена JSON на API не требует переписывать UI.
 *
 * @param {{ apiBaseUrl?: string|null }} [config]
 */
export function createContentRepository(config = {}) {
  const source = config.apiBaseUrl
    ? createApiSource({ baseUrl: config.apiBaseUrl })
    : createJsonSource();

  const cache = new Map();
  const load = (name) => {
    if (!cache.has(name)) {
      const promise = source.get(name).catch((error) => {
        cache.delete(name);
        throw error;
      });
      cache.set(name, promise);
    }
    return cache.get(name);
  };

  return {
    mode: config.apiBaseUrl ? 'api' : 'json',
    getProgram: () => load('program'),
    getSteps: () => load('steps'),
    getAgencies: () => load('agencies'),
    getSponsors: () => load('sponsors'),
    getPlans: () => load('plans'),
    getImportantNotes: () => load('importantNotes'),
    getSources: () => load('sources'),
    async getSourceIndex() {
      const data = await load('sources');
      return indexById(data.sources);
    },
  };
}
