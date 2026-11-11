import { useMemo, useState } from 'react';
import {
  filterAgencies,
  getAgencyCities,
  getComparisonRow,
  AGENCY_STATUS_LABELS,
  formatDate,
} from '@shared/index.js';
import { useContent } from '../hooks/useResource.js';
import {
  PageHeader,
  Notice,
  LoadingState,
  ErrorState,
  EmptyState,
  ExternalLink,
  AgencyStatusBadge,
  SourceList,
} from '../components/ui.jsx';
import AgencyCard from '../components/AgencyCard.jsx';
import Icon from '../components/Icon.jsx';

const loaders = {
  agencies: (r) => r.getAgencies(),
  sponsors: (r) => r.getSponsors(),
  notes: (r) => r.getImportantNotes(),
  sourceIndex: (r) => r.getSourceIndex(),
};

const initialFilters = { query: '', city: 'all', status: 'all', listedSponsorOnly: false };

const Yes = () => <span className="yes"><Icon name="check" size={16} /> Да</span>;
const No = () => <span className="no">Нет</span>;

export default function AgenciesPage() {
  const { status, data, error, retry } = useContent(loaders);
  const [filters, setFilters] = useState(initialFilters);

  const results = useMemo(
    () => (data ? filterAgencies(data.agencies.agencies, filters, data.sponsors) : []),
    [data, filters],
  );

  if (status === 'loading') return <div className="container section"><LoadingState /></div>;
  if (status === 'error') return <div className="container section"><ErrorState error={error} onRetry={retry} /></div>;

  const { agencies, sponsors, notes, sourceIndex } = data;
  const cities = getAgencyCities(agencies.agencies);
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(initialFilters);

  return (
    <div className="container section">
      <PageHeader
        photo="conversation"
        eyebrow="Агентства"
        title="Агентства. Без рейтингов."
        lead="Это не рейтинг. Мы показываем только то, что удалось найти в источниках, и отмечаем, что подтверждено, а что — заявление самого агентства."
      />

      <div className="explain-grid">
        <div className="card">
          <h2 className="h4">Американский спонсор J-1</h2>
          <p>Организация, назначенная Госдепартаментом США. Выдаёт DS-2019 и отвечает за участника в США. Проверяется по списку BridgeUSA.</p>
        </div>
        <div className="card">
          <h2 className="h4">Местное агентство</h2>
          <p>Компания в Казахстане, которая принимает заявки и работает со спонсором. Присутствие спонсора в списке не подтверждает качество агентства.</p>
        </div>
        <div className="card">
          <h2 className="h4">Как читать статусы</h2>
          <p>«Названный спонсор есть в списке BridgeUSA» — проверено по официальному списку. «Заявление организации» — со слов агентства, без независимого подтверждения.</p>
        </div>
      </div>

      <Notice tone="warn" title="Как мы проверяли">
        {agencies.meta.method} Последняя проверка: {formatDate(agencies.meta.verifiedAt)}
      </Notice>

      <form className="filters" role="search" aria-label="Фильтры агентств" onSubmit={(e) => e.preventDefault()}>
        <label className="field field--search">
          <span className="visually-hidden">Поиск</span>
          <Icon name="search" size={18} />
          <input
            type="search"
            placeholder="Название, город или спонсор"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Город</span>
          <select value={filters.city} onChange={(e) => set({ city: e.target.value })}>
            <option value="all">Все города</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Статус проверки</span>
          <select value={filters.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="all">Любой</option>
            {Object.entries(AGENCY_STATUS_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={filters.listedSponsorOnly} onChange={(e) => set({ listedSponsorOnly: e.target.checked })} />
          <span>Только со спонсором из официального списка</span>
        </label>
        {isFiltered ? (
          <button type="button" className="btn btn--ghost btn--small" onClick={() => setFilters(initialFilters)}>Сбросить</button>
        ) : null}
      </form>

      <p className="results-count" role="status" aria-live="polite">
        Найдено: {results.length} из {agencies.agencies.length}
      </p>

      {results.length === 0 ? (
        <EmptyState title="Ничего не найдено">
          <p>Попробуйте изменить фильтры.</p>
          <button type="button" className="btn btn--secondary" onClick={() => setFilters(initialFilters)}>Сбросить фильтры</button>
        </EmptyState>
      ) : (
        <div className="agency-grid">
          {results.map((a) => (
            <AgencyCard key={a.id} agency={a} sponsorsData={sponsors} sourceIndex={sourceIndex} />
          ))}
        </div>
      )}

      <section className="section-tight" aria-labelledby="compare">
        <h2 id="compare">Таблица сравнения</h2>
        <p className="section-lead">«Да» означает, что сведения указаны в источнике, а не что они независимо подтверждены.</p>
        <div className="table-scroll" role="region" aria-labelledby="compare" tabIndex={0}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Агентство</th>
                <th scope="col">Города</th>
                <th scope="col">Сайт и телефон</th>
                <th scope="col">Email</th>
                <th scope="col">Спонсор назван</th>
                <th scope="col">Спонсор в списке BridgeUSA</th>
                <th scope="col">Актуальная цена на сайте</th>
                <th scope="col">Статус</th>
              </tr>
            </thead>
            <tbody>
              {results.map((a) => {
                const row = getComparisonRow(a, sponsors);
                return (
                  <tr key={row.id}>
                    <th scope="row">{row.name}</th>
                    <td>{row.cities.length ? row.cities.join(', ') : <span className="pending">—</span>}</td>
                    <td>{row.contactsShown ? <Yes /> : <No />}</td>
                    <td>{row.emailShown ? <Yes /> : <No />}</td>
                    <td>{row.sponsorNamed ? <Yes /> : <No />}</td>
                    <td>{row.sponsorInOfficialList ? <Yes /> : <No />}</td>
                    <td>{row.pricePublished ? <Yes /> : <No />}</td>
                    <td><AgencyStatusBadge status={row.verificationStatus} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="scroll-hint" aria-hidden="true">← Прокрутите таблицу →</p>
      </section>

      <section className="section-tight" aria-labelledby="questions">
        <h2 id="questions">Вопросы агентству до подписания договора</h2>
        <ol className="numbered">
          {notes.agencyQuestions.map((q) => <li key={q}>{q}</li>)}
        </ol>
      </section>

      <section className="section-tight" aria-labelledby="sponsors">
        <h2 id="sponsors">Спонсоры SWT с участниками из Казахстана</h2>
        <p className="section-lead">{sponsors.meta.description}</p>
        <ul className="sponsor-list">
          {sponsors.sponsors.map((s) => <li key={s.id}>{s.officialName}</li>)}
        </ul>
        <p>
          <ExternalLink href="https://j1visa.state.gov/participants/how-to-apply/sponsor-search/">Проверить спонсора в BridgeUSA Sponsor Search</ExternalLink>
        </p>
        <SourceList ids={[sponsors.meta.sourceId]} index={sourceIndex} />
      </section>
    </div>
  );
}
