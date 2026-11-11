// Экземпляры общего слоя для мобильного приложения.
import { createContentRepository, createLeadRepository } from '../../shared/src/index.js';

export const contentRepository = createContentRepository({
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || null,
});

export const leadRepository = createLeadRepository({
  endpoint: process.env.EXPO_PUBLIC_LEADS_ENDPOINT || null,
});

export * from '../../shared/src/index.js';
