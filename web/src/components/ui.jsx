import { useId, useState } from 'react';
import {
  FACT_STATUS_LABELS,
  SOURCE_STATUS_LABELS,
  SOURCE_KIND_LABELS,
  AGENCY_STATUS_LABELS,
  resolveSources,
  formatDate,
} from '@shared/index.js';
import Icon from './Icon.jsx';
import Photo from './Photo.jsx';

const FACT_TONE = { confirmed: 'ok', partial: 'warn', needs_check: 'warn', agency_claim: 'neutral' };
const AGENCY_TONE = { verified: 'ok', sponsor_listed: 'info', claims_only: 'neutral', needs_check: 'warn' };

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function FactBadge({ status }) {
  return <Badge tone={FACT_TONE[status] ?? 'neutral'}>{FACT_STATUS_LABELS[status] ?? status}</Badge>;
}

export function AgencyStatusBadge({ status }) {
  return <Badge tone={AGENCY_TONE[status] ?? 'neutral'}>{AGENCY_STATUS_LABELS[status] ?? status}</Badge>;
}

export function ClaimTag() {
  return (
    <span className="claim-tag" title="Сведения взяты с сайта самой организации и не подтверждены независимым источником">
      заявление организации
    </span>
  );
}

export function ExternalLink({ href, children, className = '' }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`ext-link ${className}`}>
      {children}
      <Icon name="external" size={14} />
      <span className="visually-hidden"> (откроется в новой вкладке)</span>
    </a>
  );
}

/** Раскрывающийся список источников с датами и статусом проверки. */
export function SourceList({ ids = [], index = {}, label = 'Источники', defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const items = resolveSources(ids, index);
  if (items.length === 0) {
    return <p className="source-empty">Источник: не требуется / общая рекомендация сервиса</p>;
  }
  return (
    <div className="sources">
      <button
        type="button"
        className="sources__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="doc" size={16} />
        {label} ({items.length})
        <Icon name="chevron" size={16} className={open ? 'rot' : ''} />
      </button>
      {open && (
        <ul className="sources__list" id={panelId}>
          {items.map((s) => (
            <li key={s.id}>
              <ExternalLink href={s.url}>{s.title}</ExternalLink>
              <span className="sources__meta">
                {SOURCE_KIND_LABELS[s.kind]} · {SOURCE_STATUS_LABELS[s.status]} · проверено{' '}
                {formatDate(s.checkedAt)}
              </span>
              {s.note ? <span className="sources__note">{s.note}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, lead, children, center = false, photo = null }) {
  return (
    <header className={`page-header ${center ? 'page-header--center' : ''} ${photo ? 'page-header--photo' : ''}`}>
      <div className="page-header__side">
        <span className="square" aria-hidden="true" />
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      </div>
      <div className="page-header__body">
        <h1>{title}</h1>
        {lead ? <p className="lead">{lead}</p> : null}
        {children}
        {photo ? (
          <div className="page-header__media">
            <Photo name={photo} className="page-header__photo" loading="eager" />
          </div>
        ) : null}
      </div>
    </header>
  );
}

/** Раздел 12-колоночной сетки: колонки 1–3 — липкая подпись, 4–12 — контент. */
export function GridSection({ id, label, index, labelledBy, className = '', children }) {
  return (
    <section id={id} className={`gsec ${className}`} aria-labelledby={labelledBy}>
      <div className="container gsec__grid">
        <div className="gsec__side">
          <p className="side-label">
            {index ? <span className="mono">{index}</span> : null}
            {label}
          </p>
        </div>
        <div className="gsec__main">{children}</div>
      </div>
    </section>
  );
}

export function Notice({ tone = 'info', title, children }) {
  return (
    <div className={`notice notice--${tone}`} role="note">
      <Icon name={tone === 'warn' ? 'alert' : 'info'} size={20} />
      <div>
        {title ? <strong className="notice__title">{title}</strong> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function LoadingState({ label = 'Загружаем данные…' }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <div className="skeleton" />
      <div className="skeleton skeleton--short" />
      <div className="skeleton" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state state--error" role="alert">
      <h2>Не удалось загрузить данные</h2>
      <p>{error?.message ?? 'Неизвестная ошибка.'}</p>
      {onRetry ? (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          Попробовать снова
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, children, as: Heading = 'h2' }) {
  return (
    <div className="state state--empty" role="status">
      <Heading className="state__title">{title}</Heading>
      {children}
    </div>
  );
}

/** Значение или аккуратная заглушка «нужна проверка». */
export function ValueOrPending({ value, pending = 'Нужна проверка' }) {
  if (value === null || value === undefined || value === '') {
    return <span className="pending">{pending}</span>;
  }
  return <>{value}</>;
}

export function ContentDate({ date }) {
  return <p className="content-date">Контент проверен: {formatDate(date)}</p>;
}
