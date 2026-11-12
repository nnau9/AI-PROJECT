import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  groupStepsByPhase,
  getMinPlanPrice,
  formatPrice,
  formatPlanPrice,
  formatDate,
  SOURCE_KIND_LABELS,
  SOURCE_STATUS_LABELS,
} from '@shared/index.js';
import { useContent } from '../hooks/useResource.js';
import {
  FactBadge,
  SourceList,
  LoadingState,
  ErrorState,
  ContentDate,
  GridSection,
  AgencyStatusBadge,
} from '../components/ui.jsx';
import Globe, { ROUTE } from '../components/Globe.jsx';
import Photo from '../components/Photo.jsx';
import Reveal from '../components/Reveal.jsx';
import Icon from '../components/Icon.jsx';

const loaders = {
  program: (r) => r.getProgram(),
  steps: (r) => r.getSteps(),
  agencies: (r) => r.getAgencies(),
  notes: (r) => r.getImportantNotes(),
  plans: (r) => r.getPlans(),
  sources: (r) => r.getSources(),
  sourceIndex: (r) => r.getSourceIndex(),
};

const pad = (n, len = 2) => String(n).padStart(len, '0');
const coord = (v, pos, neg) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? pos : neg}`;

// Порядок разделов на главной повторяет путь участника:
// понять программу → пройти шаги → выбрать агентство → проверить риски → тариф → источники.
const SECTIONS = [
  { id: 'cat-program', label: 'Программа' },
  { id: 'cat-steps', label: 'Как поехать' },
  { id: 'cat-agencies', label: 'Агентства' },
  { id: 'cat-important', label: 'Важные моменты' },
  { id: 'cat-plans', label: 'Тарифы' },
  { id: 'cat-sources', label: 'Источники' },
];
const sectionIndex = (id) => pad(SECTIONS.findIndex((s) => s.id === id) + 1);

function MoreLink({ to, children }) {
  return <Link to={to} className="more-link">{children}</Link>;
}

// Якоря внутри HashRouter: прокручиваем вручную, не меняя маршрут.
function jump(id) {
  return (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  };
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Заголовок каталога: номер, крупное название, метаданные моноширинным. */
function CatalogHead({ id, title, meta, lead }) {
  return (
    <Reveal className="catalog-head">
      <h2 id={id} className="display">{title}</h2>
      <p className="catalog-head__meta">
        {meta.map((m) => <span key={m}>{m}</span>)}
      </p>
      {lead ? <p className="section-lead">{lead}</p> : null}
    </Reveal>
  );
}

function countBy(list, key) {
  return list.reduce((acc, item) => ({ ...acc, [item[key]]: (acc[item[key]] ?? 0) + 1 }), {});
}

export default function HomePage() {
  const { status, data, error, retry } = useContent(loaders);
  const [paused, setPaused] = useState(prefersReducedMotion);

  if (status === 'loading') return <div className="container section"><LoadingState /></div>;
  if (status === 'error') return <div className="container section"><ErrorState error={error} onRetry={retry} /></div>;

  const { program, steps, agencies, notes, plans, sources, sourceIndex } = data;
  const phases = groupStepsByPhase(steps);
  const cheapest = getMinPlanPrice(plans);
  const agencyList = [...agencies.agencies].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const byKind = countBy(sources.sources, 'kind');
  const byStatus = countBy(sources.sources, 'status');

  return (
    <>
      {/* ============ Первый экран: глобус ============ */}
      <section className="hero-globe" data-globe-scope aria-labelledby="hero-title">
        <Globe paused={paused} className="hero-globe__stage" />
        <div className="container hero-globe__frame">
          <div className="hero-globe__top" data-globe-top>
            <div className="hero-globe__tag">
              <span className="square square--accent blink" aria-hidden="true" />
              <p className="label">Манифест</p>
            </div>
            <p className="hero-globe__meta">
              Summer Work Travel USA<br />
              BridgeUSA · виза J-1<br />
              Для студентов Казахстана
            </p>
            <div className="hero-globe__hud">
              <p className="hero-globe__coords" aria-hidden="true">
                <span>KZ {coord(ROUTE.from.lat, 'N', 'S')} {coord(ROUTE.from.lon, 'E', 'W')}</span>
                <span>US {coord(ROUTE.to.lat, 'N', 'S')} {coord(ROUTE.to.lon, 'E', 'W')}</span>
              </p>
              <button type="button" className="hud-btn" onClick={() => setPaused((p) => !p)}>
                <span className="hud-btn__box" aria-hidden="true">{paused ? '▶' : '❚❚'}</span>
                <span className="hud-btn__label">{paused ? 'Запустить вращение' : 'Остановить вращение'}</span>
              </button>
            </div>
          </div>

          <nav className="hero-index" aria-label="Разделы на главной">
            <ol>
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} onClick={jump(s.id)}>
                    <span className="hero-index__num">{pad(i + 1)}</span>
                    <span className="hero-index__text">{s.label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="hero-globe__bottom" data-globe-bottom>
            <h1 id="hero-title" className="hero-globe__title">
              Лето в США. С{' '}<span className="accent">ясным</span> планом.
            </h1>
            <div className="hero-globe__aside">
              <p className="hero__lead">
                Программа культурного обмена для студентов из Казахстана — шаги, проверка агентств и честные расходы в одном месте.
              </p>
              <div className="hero__actions">
                <Link to="/steps" className="btn btn--primary">Посмотреть шаги</Link>
                <MoreLink to="/agencies">Сравнить агентства</MoreLink>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="container">
        <p className="hero__disclaimer">
          <Icon name="info" size={16} /> {program.meta.visaDisclaimer} {program.meta.conditionsDisclaimer}
        </p>
      </div>

      {/* ============ 01 Программа ============ */}
      <GridSection id="cat-program" label="Программа" index={sectionIndex('cat-program')} labelledBy="what">
        <Reveal>
          <h2 id="what" className="display">Что это за программа.</h2>
          <p className="section-lead">{program.summary.lead}</p>
        </Reveal>
        <div className="split" style={{ marginTop: 'var(--space-7)' }}>
          <Reveal className="split__media">
            <Photo name="summerJob" className="split__photo" />
          </Reveal>
          <ul className="statements">
            {program.summary.points.map((p, i) => (
              <Reveal as="li" key={p.text} className="statement">
                <span className="statement__index">{pad(i + 1)}</span>
                <div>
                  <p>{p.text}</p>
                  <SourceList ids={p.sourceIds} index={sourceIndex} />
                </div>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal className="subhead">
          <h3 id="who" className="subhead__title">Кому подходит.</h3>
          <p className="section-lead">Базовые условия BridgeUSA. Спонсор и агентство могут добавлять свои требования — сверяйте их в договоре.</p>
        </Reveal>
        <ul className="check-list" aria-labelledby="who">
          {program.eligibility.map((item) => (
            <Reveal as="li" key={item.id} className="check-row">
              <Icon name={item.status === 'confirmed' ? 'check' : 'info'} className="card__icon" />
              <div>
                <p>{item.text}</p>
                <div className="card__meta">
                  <FactBadge status={item.status} />
                  <SourceList ids={item.sourceIds} index={sourceIndex} />
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      </GridSection>

      {/* ============ 02 Как поехать ============ */}
      <GridSection id="cat-steps" label="Как поехать" index={sectionIndex('cat-steps')} labelledBy="path">
        <CatalogHead
          id="path"
          title="Путь участника."
          meta={[`${steps.steps.length} шагов`, `${phases.length} этапов`, 'Чек-лист']}
          lead={`${steps.steps.length} шагов в ${phases.length} этапах — от первой заявки до возвращения домой.`}
        />
        <ol className="path">
          {phases.map((phase, i) => (
            <Reveal as="li" key={phase.id} className="path__item">
              <span className="path__num" aria-hidden="true">{pad(i + 1)}</span>
              <div>
                <h3>{phase.title}</h3>
                <ul>
                  {phase.steps.map((s) => (
                    <li key={s.id}><Link to={`/steps#${s.id}`}>{s.title}</Link></li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </ol>
        <div className="row-actions">
          <Link to="/steps" className="btn btn--primary">Открыть интерактивный чек-лист</Link>
        </div>
      </GridSection>

      {/* ============ 03 Агентства ============ */}
      <GridSection id="cat-agencies" label="Агентства" index={sectionIndex('cat-agencies')} labelledBy="agencies-h">
        <CatalogHead
          id="agencies-h"
          title="Агентства. Без рейтингов."
          meta={[`${agencyList.length} агентств`, 'По алфавиту', `Проверено ${formatDate(agencies.meta.verifiedAt)}`]}
          lead="Это не рейтинг. Мы показываем только то, что удалось найти в источниках, и отмечаем, что подтверждено, а что — заявление самого агентства."
        />
        <ul className="row-list">
          {agencyList.map((a, i) => (
            <Reveal as="li" key={a.id} className="row-list__item">
              <Link to="/agencies" className="row-link">
                <span className="row-link__num">{pad(i + 1)}</span>
                <span className="row-link__main">
                  <span className="row-link__title">{a.name}</span>
                  <span className="row-link__meta">
                    {a.cities.length ? a.cities.join(', ') : 'Город не указан'}
                    {' · '}
                    Спонсор J-1: {a.usSponsor?.claimedNames?.length ? a.usSponsor.claimedNames.join(', ') : 'не назван'}
                  </span>
                </span>
                <span className="row-link__aside">
                  <AgencyStatusBadge status={a.verificationStatus} />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
        <div className="row-actions">
          <Link to="/agencies" className="btn btn--primary">Сравнить агентства</Link>
        </div>
      </GridSection>

      {/* ============ 04 Важные моменты ============ */}
      <GridSection id="cat-important" label="Важные моменты" index={sectionIndex('cat-important')} labelledBy="important-h">
        <CatalogHead
          id="important-h"
          title="Деньги. Документы. Права."
          meta={[`${notes.sections.length} тем`, `${notes.redFlags.length} тревожных сигналов`, `${notes.agencyQuestions.length} вопросов агентству`]}
          lead="Практические пункты, которые стоит разобрать до оплаты и держать под рукой в США."
        />
        <ul className="topic-grid">
          {notes.sections.map((s, i) => (
            <Reveal as="li" key={s.id}>
              <Link to={`/important#${s.id}`} className="topic">
                <span className="topic__num">{pad(i + 1)}</span>
                <span className="topic__title">{s.title}</span>
                <span className="topic__go" aria-hidden="true">→</span>
              </Link>
            </Reveal>
          ))}
        </ul>

        <Reveal className="subhead">
          <h3 id="before-pay" className="subhead__title">До оплаты — <span className="accent">проверьте.</span></h3>
        </Reveal>
        <ul className="type-list" aria-labelledby="before-pay">
          {program.checkBeforePaying.map((item, i) => (
            <Reveal as="li" key={item.id} className="type-item">
              <span className="type-item__index" aria-hidden="true">{pad(i + 1, 3)}</span>
              <div className="type-item__body">
                <h4 className="type-item__title">{item.title}</h4>
                <p className="type-item__text">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </ul>
        <div className="row-actions">
          <Link to="/important" className="btn btn--primary">Все важные моменты</Link>
          <MoreLink to="/agencies">Вопросы агентству</MoreLink>
        </div>
      </GridSection>

      {/* ============ 05 Тарифы ============ */}
      <GridSection id="cat-plans" label="Тарифы" index={sectionIndex('cat-plans')} labelledBy="plans-h">
        <CatalogHead
          id="plans-h"
          title="Выберите свой уровень поддержки."
          meta={[
            `${plans.plans.length} тарифа`,
            'Годовая подписка',
            cheapest ? `От ${formatPrice(cheapest.price, cheapest.currency)}` : null,
          ].filter(Boolean)}
          lead="Три тарифа на год: от самостоятельного пути по гайду до личного сопровождения."
        />
        <ul className="plan-strip">
          {plans.plans.map((plan) => (
            <Reveal as="li" key={plan.id} className="plan-strip__item">
              <Link to="/plans" className={`plan-tile ${plan.highlight ? 'plan-tile--highlight' : ''}`}>
                {plan.highlight ? <span className="plan-tile__ribbon">Популярный выбор</span> : null}
                <span className="plan-tile__name">{plan.name}</span>
                <span className="plan-tile__tagline">{plan.tagline}</span>
                <span className="plan-tile__price">{formatPlanPrice(plan)}</span>
              </Link>
            </Reveal>
          ))}
        </ul>
        <div className="row-actions">
          <Link to="/plans" className="btn btn--primary">Выбрать тариф</Link>
          <MoreLink to="/apply">Оставить заявку</MoreLink>
        </div>
      </GridSection>

      {/* ============ 06 Источники ============ */}
      <GridSection id="cat-sources" label="Источники" index={sectionIndex('cat-sources')} labelledBy="sources-h">
        <CatalogHead
          id="sources-h"
          title="Откуда эти сведения."
          meta={[`${sources.sources.length} источников`, `Проверка ${formatDate(sources.meta.lastReviewAt)}`]}
          lead="Каждый изменяемый факт на сайте ссылается на источник с датой проверки и статусом. Если страница не открылась при проверке, мы так и пишем."
        />
        <div className="stat-grid">
          <Reveal className="stat-grid__col">
            <p className="label">По типу</p>
            <dl className="stat-list">
              {Object.entries(byKind).map(([kind, n]) => (
                <div key={kind}>
                  <dt>{SOURCE_KIND_LABELS[kind] ?? kind}</dt>
                  <dd>{n}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal className="stat-grid__col">
            <p className="label">По статусу проверки</p>
            <dl className="stat-list">
              {Object.entries(byStatus).map(([st, n]) => (
                <div key={st}>
                  <dt>{SOURCE_STATUS_LABELS[st] ?? st}</dt>
                  <dd>{n}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
        <div className="row-actions">
          <Link to="/sources" className="btn btn--secondary">Все источники</Link>
        </div>
      </GridSection>

      {/* ============ Доступ ============ */}
      <GridSection label="Доступ" index={pad(SECTIONS.length + 1)} labelledBy="cta" className="gsec--access">
        <Reveal>
          <h2 id="cta" className="access__title">Готовы начать?</h2>
          <p className="access__sub">
            Годовые тарифы NNATO: гайд и чек-листы,<br />
            куратор и английский, личное сопровождение.
          </p>
        </Reveal>
        <div className="access__bottom">
          <div>
            <p className="fine">{program.meta.serviceDisclaimer}</p>
            <ContentDate date={program.meta.contentCheckedAt} />
          </div>
          <div className="access__cta">
            <MoreLink to="/apply">Оставить заявку</MoreLink>
            <Link to="/plans" className="btn btn--secondary btn--large">Выбрать тариф</Link>
          </div>
        </div>
      </GridSection>
    </>
  );
}
