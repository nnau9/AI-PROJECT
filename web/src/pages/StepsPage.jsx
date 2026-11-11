import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { groupStepsByPhase, getProgress, isStepComplete, checklistKey } from '@shared/index.js';
import { useContent, useLocalState } from '../hooks/useResource.js';
import { PageHeader, Notice, SourceList, Badge, LoadingState, ErrorState, ContentDate } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

const loaders = {
  steps: (r) => r.getSteps(),
  sourceIndex: (r) => r.getSourceIndex(),
};

function StepItem({ step, number, open, onToggle, checked, onCheck, labels, sourceIndex }) {
  const done = isStepComplete(step, checked);
  const panelId = `panel-${step.id}`;
  return (
    <li className={`step ${open ? 'step--open' : ''} ${done ? 'step--done' : ''}`} id={step.id}>
      <h3 className="step__heading">
        <button type="button" className="step__toggle" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
          <span className="step__num" aria-hidden="true">{done ? <Icon name="check" size={16} /> : number}</span>
          <span className="step__titles">
            <span className="step__title">{step.title}</span>
            <span className="step__summary">{step.summary}</span>
          </span>
          <Icon name="chevron" className={`step__chev ${open ? 'rot' : ''}`} />
        </button>
      </h3>
      <div className="step__deps">
        {step.dependsOn.map((d) => (
          <Badge key={d} tone="neutral">{labels[d]}</Badge>
        ))}
        {done ? <Badge tone="ok">Выполнено</Badge> : null}
      </div>
      {open && (
        <div className="step__panel" id={panelId}>
          {step.details ? <p>{step.details}</p> : null}
          <fieldset className="checklist">
            <legend>Чек-лист</legend>
            {step.checklist.map((item, i) => {
              const key = checklistKey(step.id, i);
              return (
                <label key={key} className="checklist__item">
                  <input type="checkbox" checked={Boolean(checked[key])} onChange={(e) => onCheck(key, e.target.checked)} />
                  <span>{item}</span>
                </label>
              );
            })}
          </fieldset>
          {step.link ? (
            <Link to={step.link.to} className="btn btn--secondary btn--small">{step.link.label}</Link>
          ) : null}
          <SourceList ids={step.sourceIds} index={sourceIndex} />
        </div>
      )}
    </li>
  );
}

export default function StepsPage() {
  const { status, data, error, retry } = useContent(loaders);
  const [checked, setChecked] = useLocalState('swt.checklist.v1', {});
  const [openIds, setOpenIds] = useState(() => new Set());
  const [filter, setFilter] = useState('all');
  const { hash } = useLocation();

  // Открываем и прокручиваем к шагу из ссылки вида /steps#ds2019
  useEffect(() => {
    if (status !== 'success' || !hash) return;
    const id = decodeURIComponent(hash.slice(1));
    setOpenIds((prev) => new Set(prev).add(id));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }, [status, hash]);

  const phases = useMemo(() => (data ? groupStepsByPhase(data.steps) : []), [data]);

  if (status === 'loading') return <div className="container section"><LoadingState /></div>;
  if (status === 'error') return <div className="container section"><ErrorState error={error} onRetry={retry} /></div>;

  const { steps, sourceIndex } = data;
  const progress = getProgress(steps, checked);
  const toggle = (id) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const onCheck = (key, value) => setChecked((prev) => ({ ...prev, [key]: value }));
  const allOpen = openIds.size === steps.steps.length;
  let counter = 0;

  return (
    <div className="container section">
      <PageHeader
        photo="almaty"
        eyebrow="Как поехать"
        title="Пошаговый путь участника"
        lead="Раскройте шаг, чтобы увидеть детали и чек-лист. Отметки сохраняются только в этом браузере."
      />
      <Notice tone="warn" title="Это общий ориентир">{steps.meta.disclaimer}</Notice>

      <div className="toolbar">
        <div className="progress" aria-label={`Выполнено ${progress.done} из ${progress.total} пунктов`}>
          <div className="progress__bar"><span style={{ width: `${progress.percent}%` }} /></div>
          <span className="progress__text">{progress.done} / {progress.total} пунктов · {progress.percent}%</span>
        </div>
        <div className="toolbar__controls">
          <label className="field field--inline">
            <span>Показать</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Все шаги</option>
              {Object.entries(steps.dependencyLabels).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => setOpenIds(allOpen ? new Set() : new Set(steps.steps.map((s) => s.id)))}>
            {allOpen ? 'Свернуть все' : 'Раскрыть все'}
          </button>
          {progress.done > 0 ? (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setChecked({})}>Сбросить отметки</button>
          ) : null}
        </div>
      </div>

      {phases.map((phase) => {
        const visible = phase.steps.filter((s) => filter === 'all' || s.dependsOn.includes(filter));
        // Нумерация сквозная независимо от фильтра.
        const numbered = phase.steps.map((s) => ({ step: s, n: ++counter }));
        if (visible.length === 0) return null;
        return (
          <section key={phase.id} className="phase" aria-labelledby={`phase-${phase.id}`}>
            <h2 id={`phase-${phase.id}`} className="phase__title">{phase.title}</h2>
            <ol className="steps">
              {numbered
                .filter(({ step }) => visible.includes(step))
                .map(({ step, n }) => (
                  <StepItem
                    key={step.id}
                    step={step}
                    number={n}
                    open={openIds.has(step.id)}
                    onToggle={() => toggle(step.id)}
                    checked={checked}
                    onCheck={onCheck}
                    labels={steps.dependencyLabels}
                    sourceIndex={sourceIndex}
                  />
                ))}
            </ol>
          </section>
        );
      })}

      <div className="row-actions">
        <Link to="/important" className="btn btn--secondary">Важные моменты</Link>
        <Link to="/plans" className="btn btn--primary">Выбрать тариф сопровождения</Link>
      </div>
      <ContentDate date={steps.meta.verifiedAt} />
    </div>
  );
}
