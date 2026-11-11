import { SOURCE_KIND_LABELS, SOURCE_STATUS_LABELS, formatDate } from '@shared/index.js';
import { useContent } from '../hooks/useResource.js';
import { PageHeader, ExternalLink, Badge, LoadingState, ErrorState, ContentDate } from '../components/ui.jsx';

const loaders = { sources: (r) => r.getSources() };
const STATUS_TONE = { ok: 'ok', partial: 'warn', blocked: 'warn', not_reviewed: 'neutral' };
const KIND_ORDER = ['official', 'registry', 'agency', 'design'];

export default function SourcesPage() {
  const { status, data, error, retry } = useContent(loaders);
  if (status === 'loading') return <div className="container section"><LoadingState /></div>;
  if (status === 'error') return <div className="container section"><ErrorState error={error} onRetry={retry} /></div>;

  const { sources } = data;

  return (
    <div className="container section">
      <PageHeader
        eyebrow="Источники"
        title="Откуда эти сведения"
        lead="Каждый изменяемый факт на сайте ссылается на источник с датой проверки и статусом. Если страница не открылась при проверке, мы так и пишем."
      />
      {KIND_ORDER.map((kind) => {
        const items = sources.sources.filter((s) => s.kind === kind);
        if (!items.length) return null;
        return (
          <section key={kind} className="section-tight" aria-labelledby={`kind-${kind}`}>
            <h2 id={`kind-${kind}`}>{SOURCE_KIND_LABELS[kind]}</h2>
            <ul className="source-table">
              {items.map((s) => (
                <li key={s.id} className="card">
                  <div className="fact__head">
                    <ExternalLink href={s.url}>{s.title}</ExternalLink>
                    <Badge tone={STATUS_TONE[s.status]}>{SOURCE_STATUS_LABELS[s.status]}</Badge>
                  </div>
                  <span className="muted">{s.publisher} · проверено {formatDate(s.checkedAt)}</span>
                  {s.note ? <p>{s.note}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <ContentDate date={sources.meta.lastReviewAt} />
    </div>
  );
}
