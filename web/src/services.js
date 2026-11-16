// Экземпляры репозиториев для веба. Конфигурация берётся из переменных окружения Vite.
import {
  createContentRepository,
  createLeadRepository,
  createAssistantRepository,
  loadAssistantContent,
} from '@shared/index.js';

const env = import.meta.env;

export const contentRepository = createContentRepository({
  apiBaseUrl: env.VITE_API_BASE_URL || null,
});

export const leadRepository = createLeadRepository({
  endpoint: env.VITE_LEADS_ENDPOINT || null,
});

// Помощник в чате. Без VITE_CHAT_ENDPOINT отвечает прямо в браузере по материалам сайта.
export const assistantRepository = createAssistantRepository({
  endpoint: env.VITE_CHAT_ENDPOINT || null,
  loadContent: () => loadAssistantContent(contentRepository),
});
