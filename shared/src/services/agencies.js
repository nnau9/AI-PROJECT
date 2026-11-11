export const AGENCY_STATUS_LABELS = {
  verified: 'Подтверждено независимыми источниками',
  sponsor_listed: 'Названный спонсор есть в списке BridgeUSA',
  claims_only: 'Только заявления агентства',
  needs_check: 'Нужна проверка',
};

export const SOCIAL_LABELS = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
};

/** Множество id спонсоров, которые есть в официальном списке для Казахстана. */
export function listedSponsorIds(sponsorsData) {
  return new Set(
    (sponsorsData?.sponsors ?? []).filter((s) => s.listedForKazakhstan).map((s) => s.id),
  );
}

/** Названные агентством спонсоры, найденные в официальном списке BridgeUSA. */
export function getListedSponsors(agency, sponsorsData) {
  const listed = listedSponsorIds(sponsorsData);
  const byId = Object.fromEntries((sponsorsData?.sponsors ?? []).map((s) => [s.id, s]));
  return (agency.usSponsor?.sponsorIds ?? []).filter((id) => listed.has(id)).map((id) => byId[id]);
}

export function hasListedSponsor(agency, sponsorsData) {
  return getListedSponsors(agency, sponsorsData).length > 0;
}

/** Уникальный отсортированный список городов присутствия. */
export function getAgencyCities(agencies = []) {
  const cities = new Set();
  agencies.forEach((a) => a.cities.forEach((c) => cities.add(c)));
  return [...cities].sort((a, b) => a.localeCompare(b, 'ru'));
}

/**
 * Локальная фильтрация агентств.
 * @param {import('../types.js').Agency[]} agencies
 * @param {{ query?: string, city?: string, status?: string, listedSponsorOnly?: boolean }} filters
 * @param {any} sponsorsData
 */
export function filterAgencies(agencies = [], filters = {}, sponsorsData = null) {
  const query = (filters.query ?? '').trim().toLowerCase();
  return agencies
    .filter((agency) => {
      if (filters.city && filters.city !== 'all' && !agency.cities.includes(filters.city)) return false;
      if (filters.status && filters.status !== 'all' && agency.verificationStatus !== filters.status) return false;
      if (filters.listedSponsorOnly && !hasListedSponsor(agency, sponsorsData)) return false;
      if (query) {
        const haystack = [
          agency.name,
          agency.description,
          ...agency.cities,
          ...(agency.usSponsor?.claimedNames ?? []),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

/** Параметры сравнения агентств — только проверяемые, без оценок «лучше/хуже». */
export function getComparisonRow(agency, sponsorsData) {
  const listedSponsors = getListedSponsors(agency, sponsorsData);
  return {
    id: agency.id,
    name: agency.name,
    cities: agency.cities,
    contactsShown: Boolean(agency.contacts?.website) || (agency.contacts?.phones?.length ?? 0) > 0,
    emailShown: (agency.contacts?.emails?.length ?? 0) > 0,
    sponsorNamed: (agency.usSponsor?.claimedNames ?? []).length > 0,
    sponsorInOfficialList: listedSponsors.length > 0,
    pricePublished: (agency.publishedPrices ?? []).some((p) => !p.stale),
    verificationStatus: agency.verificationStatus,
    lastVerifiedAt: agency.lastVerifiedAt,
  };
}
