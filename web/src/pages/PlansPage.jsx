import { Link } from 'react-router-dom';
import {
  formatPrice,
  buildFeatureMatrix,
  getOwnFeatures,
  getIncludedPlanNames,
  formatDate,
} from '@shared/index.js';
import { useContent } from '../hooks/useResource.js';
import { PageHeader, Notice, LoadingState, ErrorState } from '../components/ui.jsx';
import Reveal from '../components/Reveal.jsx';
import Icon from '../components/Icon.jsx';

const loaders = { plans: (r) => r.getPlans() };

function scrollToFootnote(e) {
  e.preventDefault();
  document.getElementById('footnote-offer')?.scrollIntoView({ block: 'center' });
}

function FeatureText({ feature, footnotes }) {
  return (
    <>
      {feature.title}
      {feature.footnote ? (
        <sup><a href="#footnote-offer" aria-label="Условия подбора офферов" onClick={scrollToFootnote}>*</a></sup>
      ) : null}
      {feature.footnote && footnotes[feature.footnote] ? (
        <span className="feature-note">{footnotes[feature.footnote]}</span>
      ) : null}
    </>
  );
}

export default function PlansPage() {
  const { status, data, error, retry } = useContent(loaders);
  if (status === 'loading') return <div className="container section"><LoadingState /></div>;
  if (status === 'error') return <div className="container section"><ErrorState error={error} onRetry={retry} /></div>;

  const { plans } = data;
  const featureById = Object.fromEntries(plans.features.map((f) => [f.id, f]));
  const matrix = buildFeatureMatrix(plans);

  return (
    <div className="container section">
      <PageHeader
        eyebrow="Тарифы NNATO · годовая подписка"
        title="Выберите свой уровень поддержки."
        lead="Три тарифа на год: от самостоятельного пути по гайду до личного сопровождения."
        center
      />

      <div className="plan-grid">
        {plans.plans.map((plan) => {
          const own = getOwnFeatures(plan, plans);
          const included = getIncludedPlanNames(plan, plans).reverse();
          return (
            <Reveal as="article" key={plan.id} className={`plan ${plan.highlight ? 'plan--highlight' : ''}`} aria-labelledby={`plan-${plan.id}`}>
              {plan.highlight ? <span className="plan__ribbon">Популярный выбор</span> : null}
              <h2 id={`plan-${plan.id}`} className="plan__name">{plan.name}</h2>
              <p className="plan__tagline">{plan.tagline}</p>
              <p className="plan__price" aria-label={`${formatPrice(plan.price, plan.currency)} за год`}>
                <span className="plan__amount">{formatPrice(plan.price, plan.currency)}</span>
                <span className="plan__period"> / {plans.meta.period}</span>
              </p>
              <Link to={`/apply?plan=${plan.id}`} className={`btn ${plan.highlight ? 'btn--primary' : 'btn--secondary'} plan__cta`}>
                Оставить заявку
              </Link>
              {included.length ? <p className="plan__includes">Всё, что входит в {included.join(' и ')}, плюс:</p> : <p className="plan__includes">Входит:</p>}
              <ul className="plan__features">
                {own.map((id) => (
                  <li key={id}>
                    <Icon name="check" size={18} />
                    <span><FeatureText feature={featureById[id]} footnotes={plans.footnotes} /></span>
                  </li>
                ))}
              </ul>
            </Reveal>
          );
        })}
      </div>

      <Notice tone="info" title="Что важно знать о подписке">
        <p>{plans.meta.periodExplanation}</p>
        <p>
          {plans.meta.notIncluded} Ориентиры по расходам на программу — в разделе{' '}
          <Link to="/important">«Важные моменты»</Link>.
        </p>
        <p>{plans.meta.paymentNote}</p>
      </Notice>

      <section className="section-tight" aria-labelledby="matrix">
        <h2 id="matrix" className="display center">Сравнение тарифов.</h2>
        <div className="table-scroll" role="region" aria-labelledby="matrix" tabIndex={0}>
          <table className="table table--matrix">
            <thead>
              <tr>
                <th scope="col">Что входит</th>
                {plans.plans.map((p) => <th key={p.id} scope="col">{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="row-price">
                <th scope="row">Стоимость за год</th>
                {plans.plans.map((p) => <td key={p.id}><strong>{formatPrice(p.price, p.currency)}</strong></td>)}
              </tr>
              {matrix.map(({ feature, availability }) => (
                <tr key={feature.id}>
                  <th scope="row">{feature.title}{feature.footnote ? '*' : ''}</th>
                  {plans.plans.map((p) => (
                    <td key={p.id}>
                      {availability[p.id] ? (
                        <span className="yes"><Icon name="check" size={18} title="Входит" /></span>
                      ) : (
                        <span className="no" aria-label="Не входит">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="scroll-hint" aria-hidden="true">← Прокрутите таблицу →</p>
        <p id="footnote-offer" className="footnote">* {plans.footnotes['offer-floor']}</p>
        <p className="footnote">
          Цены: {plans.meta.priceSource}, в тенге (₸), за 12 месяцев. Актуальны на {formatDate(plans.meta.priceSetAt)}
        </p>
      </section>
    </div>
  );
}
