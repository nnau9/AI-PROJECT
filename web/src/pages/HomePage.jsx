import { Link } from 'react-router-dom';
import { groupStepsByPhase, getMinPlanPrice, formatPrice } from '@shared/index.js';
import { useContent } from '../hooks/useResource.js';
import { FactBadge, SourceList, LoadingState, ErrorState, ContentDate, GridSection } from '../components/ui.jsx';
import { HeroArt } from '../components/Art.jsx';
import Photo from '../components/Photo.jsx';
import Reveal from '../components/Reveal.jsx';
import Icon from '../components/Icon.jsx';

const loaders = {
  program: (r) => r.getProgram(),
  steps: (r) => r.getSteps(),
  plans: (r) => r.getPlans(),
  sourceIndex: (r) => r.getSourceIndex(),
};

const pad = (n, len = 2) => String(n).padStart(len, '0');

function MoreLink({ to, children }) {
  return <Link to={to} className="more-link">{children}</Link>;
}

export default function HomePage() {
  const { status, data, error, retry } = useContent(loaders);
  if (status === 'loading') return <div className="container section"><LoadingState /></div>;
  if (status === 'error') return <div className="container section"><ErrorState error={error} onRetry={retry} /></div>;

  const { program, steps, plans, sourceIndex } = data;
  const phases = groupStepsByPhase(steps);
  const cheapest = getMinPlanPrice(plans);

  const system = [
    {
      to: '/steps',
      title: `${steps.steps.length} шагов. Один чек-лист.`,
      text: 'От проверки критериев до возвращения в Казахстан.',
      go: 'Открыть чек-лист',
    },
    {
      to: '/agencies',
      title: 'Сравнение без рейтингов.',
      text: 'Контакты, американские спонсоры J-1 и источники.',
      go: 'Сравнить',
    },
    {
      to: '/important',
      title: 'Деньги. Права. Безопасность.',
      text: 'Что проверить в оффере, договоре и страховке.',
      go: 'Подробнее',
    },
    {
      to: '/plans',
      title: cheapest ? `От ${formatPrice(cheapest.price, cheapest.currency)} в год.` : 'Годовая подписка.',
      text: 'Lite, Classic и All-in — от гайда до личного сопровождения.',
      go: 'Выбрать тариф',
    },
  ];

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero__grid">
          <div className="hero__side">
            <div className="hero__side-top">
              <span className="square" aria-hidden="true" />
              <p className="label">Манифест</p>
            </div>
            <p className="hero__meta">
              Summer Work Travel USA<br />
              BridgeUSA · виза J-1<br />
              Для студентов Казахстана
            </p>
          </div>
          <div className="hero__main">
            <h1 id="hero-title" className="hero__title">
              Лето в США. С{' '}<span className="accent">ясным</span> планом.
            </h1>
            <div className="hero__below">
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
      <div className="hero__media">
        <Photo name="hero" className="hero__photo" loading="eager" />
      </div>
      <div className="container">
        <p className="hero__disclaimer">
          <Icon name="info" size={16} /> {program.meta.visaDisclaimer} {program.meta.conditionsDisclaimer}
        </p>
      </div>

      <GridSection label="Система" index="01" labelledBy="system">
        <Reveal>
          <h2 id="system" className="stack-title">
            <span>Шаги.</span>
            <span>Агентства.</span>
            <span className="accent">Расходы.</span>
          </h2>
        </Reveal>
        <ul className="sys-grid">
          {system.map((item, i) => (
            <Reveal as="li" key={item.to} className="sys-grid__item">
              <Link to={item.to} className="sys-cell">
                <span className="sys-cell__index">{pad(i + 1)}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className="sys-cell__go">{item.go} →</span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </GridSection>

      <GridSection label="Программа" index="02" labelledBy="what">
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
      </GridSection>

      <GridSection label="Условия" index="03" labelledBy="who">
        <Reveal>
          <h2 id="who" className="display">Кому подходит.</h2>
          <p className="section-lead">Базовые условия BridgeUSA. Спонсор и агентство могут добавлять свои требования — сверяйте их в договоре.</p>
        </Reveal>
        <ul className="check-list">
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

      <GridSection label="Путь" index="04" labelledBy="path">
        <Reveal>
          <h2 id="path" className="display">Путь участника.</h2>
          <p className="section-lead">{steps.steps.length} шагов в {phases.length} этапах — от первой заявки до возвращения домой.</p>
        </Reveal>
        <Reveal className="path__art"><HeroArt /></Reveal>
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

      <GridSection label="До оплаты" index="05" labelledBy="before-pay">
        <Reveal>
          <h2 id="before-pay" className="display">До оплаты — <span className="accent">проверьте.</span></h2>
        </Reveal>
        <ul className="type-list">
          {program.checkBeforePaying.map((item, i) => (
            <Reveal as="li" key={item.id} className="type-item">
              <span className="type-item__index" aria-hidden="true">{pad(i + 1, 3)}</span>
              <div className="type-item__body">
                <h3 className="type-item__title">{item.title}</h3>
                <p className="type-item__text">{item.text}</p>
              </div>
            </Reveal>
          ))}
        </ul>
        <div className="row-actions">
          <Link to="/important" className="btn btn--secondary">Все важные моменты</Link>
          <MoreLink to="/agencies">Вопросы агентству</MoreLink>
        </div>
      </GridSection>

      <GridSection label="Доступ" index="06" labelledBy="cta" className="gsec--access">
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
