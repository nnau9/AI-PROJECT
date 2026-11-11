/** «2026-11-11» → «11 ноября 2026 г.»; пустое значение → «—». */
export function formatDate(iso, locale = 'ru-RU') {
  if (!iso) return '—';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatMoney(amount, currency, prefix = '') {
  if (amount === null || amount === undefined) return null;
  const symbol = currency === 'USD' ? '$' : '';
  const value = Number(amount).toLocaleString('ru-RU');
  const text = symbol ? `${symbol}${value}` : `${value} ${currency}`;
  return prefix ? `${prefix} ${text}` : text;
}
