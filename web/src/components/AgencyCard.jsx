import { useId, useState } from 'react';
import { getListedSponsors, SOCIAL_LABELS, formatDate, formatMoney } from '@shared/index.js';
import { AgencyStatusBadge, ClaimTag, ExternalLink, SourceList, ValueOrPending, Badge } from './ui.jsx';
import Icon from './Icon.jsx';

function Row({ label, children }) {
  return (
    <div className="kv">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function PriceItem({ p }) {
  return (
    <li className="price-item">
      <div className="price-item__head">
        <strong className="price-item__amount">{formatMoney(p.amount, p.currency, p.prefix)}</strong>
        <span>{p.label}</span>
        {p.stale ? <Badge tone="warn">Устарело</Badge> : null}
        {p.closed ? <Badge tone="neutral">Набор закрыт</Badge> : null}
      </div>
      <dl className="price-item__meta">
        <div><dt>Валюта</dt><dd>{p.currency}</dd></div>
        <div><dt>Сезон</dt><dd><ValueOrPending value={p.season} pending="не указан на сайте" /></dd></div>
        <div><dt>Включено</dt><dd>{p.included?.length ? p.included.join('; ') : <span className="pending">не раскрыто на сайте</span>}</dd></div>
        <div><dt>Не включено</dt><dd>{p.notIncluded?.length ? p.notIncluded.join('; ') : <span className="pending">не раскрыто на сайте</span>}</dd></div>
        <div><dt>Проверено</dt><dd>{formatDate(p.asOf)}</dd></div>
      </dl>
      {p.note ? <p className="kv__sub muted">{p.note}</p> : null}
      <p className="kv__sub muted">Цена агентства на программу, не подписка NNATO. Не публичная оферта — сверяйте с договором.</p>
    </li>
  );
}

export default function AgencyCard({ agency, sponsorsData, sourceIndex }) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const listed = getListedSponsors(agency, sponsorsData);
  const { contacts, usSponsor } = agency;

  return (
    <article className="agency card" aria-labelledby={`${agency.id}-name`}>
      <header className="agency__head">
        <h3 id={`${agency.id}-name`}>{agency.name}</h3>
        <AgencyStatusBadge status={agency.verificationStatus} />
      </header>
      <p className="agency__desc">{agency.description} <ClaimTag /></p>

      <dl className="kv-list">
        <Row label="Города">
          <ValueOrPending value={agency.cities.length ? agency.cities.join(', ') : null} pending="Не указаны на сайте" />
        </Row>
        <Row label="Спонсор J-1 (США)">
          {usSponsor?.claimedNames?.length ? (
            <>
              {usSponsor.claimedNames.join(', ')} <ClaimTag />
              {listed.length > 0 ? (
                <span className="kv__sub">
                  <Icon name="check" size={14} /> Есть в официальном списке BridgeUSA для SWT с Казахстаном:{' '}
                  {listed.map((s) => s.officialName).join('; ')}{' '}
                  {usSponsor.officialRecordUrl ? <ExternalLink href={usSponsor.officialRecordUrl}>Запись BridgeUSA</ExternalLink> : null}
                </span>
              ) : null}
            </>
          ) : (
            <span className="pending">Не назван на сайте агентства</span>
          )}
          {usSponsor?.relationNote ? <span className="kv__sub muted">{usSponsor.relationNote}</span> : null}
        </Row>
      </dl>

      <div className="contacts" aria-label={`Контакты ${agency.name}`}>
        {contacts.website ? (
          <ExternalLink href={contacts.website} className="chip"><Icon name="globe" size={16} /> {hostOf(contacts.website)}</ExternalLink>
        ) : null}
        {contacts.phones.map((p) => (
          <a key={p.href} href={p.href} className="chip"><Icon name="phone" size={16} /> {p.value}{p.label ? <span className="muted"> · {p.label}</span> : null}</a>
        ))}
        {contacts.emails.map((e) => (
          <a key={e} href={`mailto:${e}`} className="chip"><Icon name="mail" size={16} /> {e}</a>
        ))}
        {contacts.social.map((s) => (
          <ExternalLink key={s.url} href={s.url} className="chip"><Icon name="chat" size={16} /> {SOCIAL_LABELS[s.type] ?? s.type}</ExternalLink>
        ))}
      </div>
      <p className="fine">Контакты сверены с сайтом агентства: {formatDate(contacts.checkedAt ?? agency.lastVerifiedAt)}</p>

      <button type="button" className="btn btn--ghost btn--small agency__more" aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen((v) => !v)}>
        {open ? 'Скрыть подробности' : 'Офисы, услуги, цены'}
        <Icon name="chevron" size={16} className={open ? 'rot' : ''} />
      </button>

      {open && (
        <div id={detailsId} className="agency__details">
          {agency.offices.length > 0 ? (
            <section>
              <h4>Офисы</h4>
              <ul className="plain">
                {agency.offices.map((o) => (
                  <li key={`${o.city}-${o.address}`}>
                    <strong>{o.city}:</strong> <ValueOrPending value={o.address} pending="адрес не проверялся" />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h4>Заявленные услуги <ClaimTag /></h4>
            <ul className="plain bullets">
              {agency.services.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </section>

          <section>
            <h4>Цены на программу с сайта агентства</h4>
            {agency.publishedPrices.length === 0 ? (
              <p className="pending">Цены на проверенных страницах не опубликованы</p>
            ) : (
              <ul className="plain">
                {agency.publishedPrices.map((p) => <PriceItem key={p.label} p={p} />)}
              </ul>
            )}
          </section>

          <section>
            <h4>Заявления организации</h4>
            <ul className="plain bullets">
              {agency.claims.map((c) => <li key={c.text}>{c.text}</li>)}
            </ul>
          </section>

          {agency.openQuestions?.length ? (
            <section>
              <h4>Что не удалось проверить</h4>
              <ul className="plain bullets">
                {agency.openQuestions.map((q) => <li key={q}>{q}</li>)}
              </ul>
            </section>
          ) : null}
        </div>
      )}

      <footer className="agency__foot">
        <span className="muted">Проверено: {formatDate(agency.lastVerifiedAt)}</span>
        <SourceList ids={agency.sources} index={sourceIndex} />
      </footer>
    </article>
  );
}
