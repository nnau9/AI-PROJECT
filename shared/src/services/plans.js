const CURRENCY_SYMBOLS = { KZT: '₸', USD: '$' };

/** Группировка разрядов неразрывным пробелом: 15999 → «15 999». */
export function formatNumber(value) {
  return Math.round(Number(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Цена тарифа: 5990, 'KZT' → «5 990 ₸». Символ задаётся явно, чтобы
 * отображение не зависело от локали браузера или устройства.
 */
export function formatPrice(price, currency = 'KZT') {
  if (price === null || price === undefined || Number.isNaN(Number(price))) return '—';
  const symbol = CURRENCY_SYMBOLS[currency];
  if (currency === 'USD') return `$${formatNumber(price)}`;
  return symbol ? `${formatNumber(price)} ${symbol}` : `${formatNumber(price)} ${currency}`;
}

/** «5 990 ₸ / год» */
export function formatPlanPrice(plan, periodLabel = 'год') {
  return `${formatPrice(plan.price, plan.currency)} / ${periodLabel}`;
}

/** Минимальная цена среди тарифов (для «от … в год»). */
export function getMinPlanPrice(plansData) {
  const plans = (plansData?.plans ?? []).filter((p) => typeof p.price === 'number');
  if (!plans.length) return null;
  return plans.reduce((min, p) => (p.price < min.price ? p : min));
}

export function planHasFeature(plan, featureId) {
  return plan.features.includes(featureId);
}

/** Матрица доступности функций: [{ feature, availability: { [planId]: boolean } }] */
export function buildFeatureMatrix(plansData) {
  const plans = plansData?.plans ?? [];
  return (plansData?.features ?? []).map((feature) => ({
    feature,
    availability: Object.fromEntries(plans.map((p) => [p.id, planHasFeature(p, feature.id)])),
  }));
}

/** Функции тарифа, которых нет в «родительском» тарифе (для карточек «Всё из X, плюс…»). */
export function getOwnFeatures(plan, plansData) {
  if (!plan.includesPlan) return plan.features;
  const parent = plansData.plans.find((p) => p.id === plan.includesPlan);
  if (!parent) return plan.features;
  return plan.features.filter((f) => !parent.features.includes(f));
}

/** Цепочка включённых тарифов: All-in → ['Classic', 'Lite'] */
export function getIncludedPlanNames(plan, plansData) {
  const names = [];
  let current = plan;
  while (current?.includesPlan) {
    current = plansData.plans.find((p) => p.id === current.includesPlan);
    if (current) names.push(current.name);
  }
  return names;
}

export function getPlanById(plansData, id) {
  return plansData?.plans?.find((p) => p.id === id) ?? null;
}
