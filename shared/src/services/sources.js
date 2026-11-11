export const SOURCE_STATUS_LABELS = {
  ok: 'Проверено',
  partial: 'Проверено частично',
  blocked: 'Не открылась при проверке',
  not_reviewed: 'Содержимое не разбиралось',
};

export const SOURCE_KIND_LABELS = {
  official: 'Официальный источник',
  agency: 'Сайт организации',
  registry: 'Государственный реестр',
  design: 'Дизайн-ориентир',
};

export const FACT_STATUS_LABELS = {
  confirmed: 'Подтверждено',
  partial: 'Частично подтверждено',
  needs_check: 'Нужна проверка',
  agency_claim: 'Заявление организации',
};

/** @param {{id:string}[]} list */
export function indexById(list = []) {
  return Object.fromEntries(list.map((item) => [item.id, item]));
}

/** Возвращает существующие источники по id, пропуская неизвестные. */
export function resolveSources(ids = [], index = {}) {
  return ids.map((id) => index[id]).filter(Boolean);
}

/** Находит ссылки на источники, которых нет в реестре (для проверки данных). */
export function findMissingSourceIds(ids = [], index = {}) {
  return ids.filter((id) => !index[id]);
}
