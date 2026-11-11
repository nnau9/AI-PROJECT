export const PLAN_IDS = ['lite', 'classic', 'all-in'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Телефон: 10–15 цифр после удаления пробелов, скобок, дефисов и «+». */
export function isValidPhone(value) {
  const digits = String(value).replace(/[\s()+-]/g, '');
  return /^\d{10,15}$/.test(digits);
}

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value).trim());
}

/**
 * Клиентская валидация заявки. Возвращает объект { поле: сообщение }.
 * @param {Partial<import('../types.js').LeadInput>} input
 */
export function validateLead(input = {}) {
  const errors = {};
  const name = (input.name ?? '').trim();
  const contact = (input.contact ?? '').trim();

  if (name.length < 2) errors.name = 'Укажите имя — минимум 2 символа.';
  else if (name.length > 80) errors.name = 'Имя слишком длинное.';

  if (!contact) errors.contact = 'Укажите телефон или email для связи.';
  else if (!isValidPhone(contact) && !isValidEmail(contact)) {
    errors.contact = 'Похоже, это не телефон и не email. Пример: +7 700 000 00 00';
  }

  if ((input.city ?? '').trim().length > 60) errors.city = 'Слишком длинное название города.';

  if (!PLAN_IDS.includes(input.planId)) errors.planId = 'Выберите тариф.';

  if ((input.message ?? '').length > 1000) errors.message = 'Сообщение длиннее 1000 символов.';

  if (input.consent !== true) errors.consent = 'Нужно согласие на обработку данных.';

  return errors;
}

export function normalizeLead(input) {
  return {
    name: input.name.trim(),
    contact: input.contact.trim(),
    city: (input.city ?? '').trim(),
    planId: input.planId,
    message: (input.message ?? '').trim(),
    consent: true,
  };
}
