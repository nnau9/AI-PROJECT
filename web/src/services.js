// Экземпляры репозиториев для веба. Конфигурация берётся из переменных окружения Vite.
import { createContentRepository, createLeadRepository } from '@shared/index.js';

const env = import.meta.env;

export const contentRepository = createContentRepository({
  apiBaseUrl: env.VITE_API_BASE_URL || null,
});

export const leadRepository = createLeadRepository({
  endpoint: env.VITE_LEADS_ENDPOINT || null,
});
