import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { formatDate } from '@shared/index.js';
import { useContent } from '../hooks/useResource.js';
import {
  PageHeader,
  Notice,
  SourceList,
  FactBadge,
  ValueOrPending,
  LoadingState,
  ErrorState,
  ContentDate,
} from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

const loaders = {
  notes: (r) => r.getImportantNotes(),
  program: (r) => r.getProgram(),
  sourceIndex: (r) => r.getSourceIndex(),
};

export default function ImportantPage() {
  const { status, data, error, retry } = useContent(loaders);
  const { hash } = useLocation();

  // Переход с главной по ссылке вида #/important#contract — прокрутить к разделу.
  useEffect(() => {
    if (status !== 'success' || !hash) return;
    const id = decodeURIComponent(hash.slice(1));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }, [status, hash]);

  if (status === 'loading') return <div className="container section"><LoadingState /></div>;
  if (status === 'error') return <div className="container section"><ErrorState error={error} onRetry={retry} /></div>;

  const { notes, program, sourceIndex } = data;

  return (
    <div className="container section">
      <PageHeader
        photo="signature"
        eyebrow="Важные моменты"
        title="Деньги. Документы. Права."
        lead="Практические пункты, которые стоит разобрать до оплаты и держать под рукой в США."
      />

      <nav className="toc" aria-label="На этой странице">
        <a href="#costs" onClick={jump('costs')}>Расходы</a>
        <a href="#facts" onClick={jump('facts')}>Ключевые правила</a>
        {notes.sections.map((s) => <a key={s.id} href={`#${s.id}`} onClick={jump(s.id)}>{s.title}</a>)}
        <a href="#red-flags" onClick={jump('red-flags')}>Тревожные сигналы</a>
        <a href="#help" onClick={jump('help')}>Экстренные контакты</a>
      </nav>

      <section id="costs" className="section-tight" aria-labelledby="costs-h">
        <h2 id="costs-h">Расходы на программу</h2>
        <p className="section-lead">{notes.meta.note}</p>
        <div className="table-scroll" role="region" aria-labelledby="costs-h" tabIndex={0}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Статья</th>
                <th scope="col">Сумма</th>
                <th scope="col">Что важно</th>
                <th scope="col">Источник</th>
              </tr>
            </thead>
            <tbody>
              {notes.costItems.map((c) => (
                <tr key={c.id}>
                  <th scope="row">{c.title}</th>
                  <td><ValueOrPending value={c.amount ? `${c.amount} (${c.currency})` : null} pending="Нет подтверждённой суммы" /></td>
                  <td>
                    {c.text}
                    {c.season || c.included || c.notIncluded ? (
                      <dl className="cost-meta">
                        {c.season ? <div><dt>Сезон</dt><dd>{c.season}</dd></div> : null}
                        {c.included ? <div><dt>Включено</dt><dd>{c.included}</dd></div> : null}
                        {c.notIncluded ? <div><dt>Не включено</dt><dd>{c.notIncluded}</dd></div> : null}
                        {c.verifiedAt ? <div><dt>Проверено</dt><dd>{formatDate(c.verifiedAt)}</dd></div> : null}
                      </dl>
                    ) : null}
                  </td>
                  <td><SourceList ids={c.sourceIds} index={sourceIndex} label="Открыть" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="facts" className="section-tight" aria-labelledby="facts-h">
        <h2 id="facts-h">Ключевые правила и сроки</h2>
        <ul className="fact-list">
          {program.facts.map((f) => (
            <li key={f.id} className="card">
              <div className="fact__head">
                <h3 className="h4">{f.label}</h3>
                <FactBadge status={f.status} />
              </div>
              <p className="fact__value"><ValueOrPending value={f.value} /></p>
              {f.note ? <p className="muted">{f.note}</p> : null}
              <SourceList ids={f.sourceIds} index={sourceIndex} />
            </li>
          ))}
        </ul>
        <details className="card disclosure">
          <summary>{program.excludedJobs.title}</summary>
          <ul className="plain bullets">
            {program.excludedJobs.items.map((i) => <li key={i}>{i}</li>)}
          </ul>
          <SourceList ids={program.excludedJobs.sourceIds} index={sourceIndex} />
        </details>
      </section>

      <div className="note-grid">
        {notes.sections.map((s) => (
          <section key={s.id} id={s.id} className="card note" aria-labelledby={`${s.id}-h`}>
            <h2 id={`${s.id}-h`} className="h3">{s.title}</h2>
            <ul className="plain bullets">
              {s.items.map((i) => <li key={i}>{i}</li>)}
            </ul>
            <SourceList ids={s.sourceIds} index={sourceIndex} />
          </section>
        ))}
      </div>

      <section id="red-flags" className="section-tight" aria-labelledby="rf-h">
        <h2 id="rf-h">Тревожные сигналы</h2>
        <Notice tone="warn" title="Если слышите это — остановитесь и перепроверьте">
          <ul className="plain bullets">
            {notes.redFlags.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </Notice>
      </section>

      <section id="help" className="section-tight" aria-labelledby="help-h">
        <h2 id="help-h">Экстренные контакты и помощь в США</h2>
        <ul className="hotlines">
          {program.hotlines.map((h) => (
            <li key={h.id} className="card">
              <span className="muted">{h.title}</span>
              <a href={h.href} className="hotline__value"><Icon name={h.href.startsWith('mailto') ? 'mail' : 'phone'} /> {h.value}</a>
              {h.note ? <span className="muted">{h.note}</span> : null}
              <SourceList ids={h.sourceIds} index={sourceIndex} />
            </li>
          ))}
        </ul>
        <p>Первым делом при проблемах с работой или жильём звоните своему спонсору по круглосуточному номеру из его документов.</p>
      </section>

      <div className="row-actions">
        <Link to="/steps" className="btn btn--secondary">Пошаговый чек-лист</Link>
        <Link to="/sources" className="btn btn--ghost">Все источники</Link>
      </div>
      <ContentDate date={notes.meta.contentCheckedAt} />
    </div>
  );
}

// Якоря внутри HashRouter: прокручиваем вручную, не меняя маршрут.
function jump(id) {
  return (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ block: 'start' });
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
  };
}
