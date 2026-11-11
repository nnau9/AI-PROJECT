import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { validateLead, PLAN_IDS, formatPlanPrice } from '@shared/index.js';
import { useContent } from '../hooks/useResource.js';
import { leadRepository } from '../services.js';
import { PageHeader, Notice, LoadingState, ErrorState } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

const loaders = { plans: (r) => r.getPlans() };

const FIELD_ORDER = ['planId', 'name', 'contact', 'city', 'message', 'consent'];

export default function ApplyPage() {
  const { status, data, error, retry } = useContent(loaders);
  const [params] = useSearchParams();
  const initialPlan = PLAN_IDS.includes(params.get('plan')) ? params.get('plan') : '';
  const [form, setForm] = useState({ planId: initialPlan, name: '', contact: '', city: '', message: '', consent: false });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitState, setSubmitState] = useState({ status: 'idle', error: null, stub: false });
  const formRef = useRef(null);

  if (status === 'loading') return <div className="container section"><LoadingState /></div>;
  if (status === 'error') return <div className="container section"><ErrorState error={error} onRetry={retry} /></div>;

  const { plans } = data;

  const update = (field, value) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (touched[field]) setErrors(validateLead(next));
  };
  const blur = (field) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validateLead(form));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateLead(form);
    setErrors(nextErrors);
    setTouched(Object.fromEntries(FIELD_ORDER.map((f) => [f, true])));
    const firstInvalid = FIELD_ORDER.find((f) => nextErrors[f]);
    if (firstInvalid) {
      formRef.current?.querySelector(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    setSubmitState({ status: 'sending', error: null, stub: false });
    try {
      const result = await leadRepository.submit(form);
      setSubmitState({ status: 'success', error: null, stub: result.stub });
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      setSubmitState({ status: 'error', error: err, stub: false });
    }
  };

  if (submitState.status === 'success') {
    const plan = plans.plans.find((p) => p.id === form.planId);
    return (
      <div className="container section narrow">
        <div className="success card" role="status" aria-live="polite">
          <span className="success__icon"><Icon name="check" size={32} /></span>
          <h1>Заявка заполнена</h1>
          <p>Тариф: <strong>{plan?.name}</strong> · {plan ? formatPlanPrice(plan, plans.meta.period) : null}</p>
          {submitState.stub ? (
            <Notice tone="warn" title="Демонстрационный режим">
              Backend ещё не подключён, поэтому заявка <strong>никуда не отправлена и не сохранена</strong>.
              Отправка заработает после подключения API (переменная VITE_LEADS_ENDPOINT).
            </Notice>
          ) : (
            <p>Мы свяжемся с вами по указанному контакту.</p>
          )}
          <div className="row-actions">
            <Link to="/steps" className="btn btn--secondary">Пока изучить шаги</Link>
            <button type="button" className="btn btn--ghost" onClick={() => { setSubmitState({ status: 'idle', error: null, stub: false }); setForm({ ...form, message: '', consent: false }); }}>
              Заполнить ещё раз
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fieldError = (f) => (touched[f] && errors[f] ? errors[f] : null);
  const describedBy = (f, hint) => [hint ? `${f}-hint` : null, fieldError(f) ? `${f}-error` : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="container section narrow">
      <PageHeader eyebrow="Заявка" title="Оставить заявку" lead="Только данные для первичной связи. Мы не просим паспорт, документы или оплату." />

      {!leadRepository.isConnected ? (
        <Notice tone="warn" title="Форма работает в демонстрационном режиме">
          Валидация работает, но данные пока никуда не отправляются и не сохраняются. Отправка заработает после подключения backend.
        </Notice>
      ) : null}

      <form ref={formRef} className="form card" noValidate onSubmit={onSubmit}>
        <fieldset className="field-group">
          <legend>Тариф <span aria-hidden="true">*</span></legend>
          <div className="segmented" role="radiogroup">
            {plans.plans.map((p) => (
              <label key={p.id} className={`segmented__opt ${form.planId === p.id ? 'is-active' : ''}`}>
                <input type="radio" name="planId" value={p.id} checked={form.planId === p.id} onChange={() => { update('planId', p.id); setTouched((t) => ({ ...t, planId: true })); }} aria-describedby={describedBy('planId')} />
                <span className="segmented__name">{p.name}</span>
                <span className="segmented__price">{formatPlanPrice(p, plans.meta.period)}</span>
              </label>
            ))}
          </div>
          {fieldError('planId') ? <p className="field-error" id="planId-error">{errors.planId}</p> : null}
        </fieldset>

        <label className="field">
          <span>Имя <span aria-hidden="true">*</span></span>
          <input name="name" autoComplete="given-name" value={form.name} onChange={(e) => update('name', e.target.value)} onBlur={() => blur('name')} aria-invalid={Boolean(fieldError('name'))} aria-describedby={describedBy('name')} required maxLength={80} />
          {fieldError('name') ? <span className="field-error" id="name-error">{errors.name}</span> : null}
        </label>

        <label className="field">
          <span>Телефон или email <span aria-hidden="true">*</span></span>
          <input name="contact" autoComplete="tel" inputMode="text" value={form.contact} onChange={(e) => update('contact', e.target.value)} onBlur={() => blur('contact')} aria-invalid={Boolean(fieldError('contact'))} aria-describedby={describedBy('contact', true)} required />
          <span className="field-hint" id="contact-hint">Например, +7 700 000 00 00 или name@mail.kz</span>
          {fieldError('contact') ? <span className="field-error" id="contact-error">{errors.contact}</span> : null}
        </label>

        <label className="field">
          <span>Город</span>
          <input name="city" autoComplete="address-level2" value={form.city} onChange={(e) => update('city', e.target.value)} onBlur={() => blur('city')} aria-invalid={Boolean(fieldError('city'))} aria-describedby={describedBy('city')} maxLength={60} />
          {fieldError('city') ? <span className="field-error" id="city-error">{errors.city}</span> : null}
        </label>

        <label className="field">
          <span>Комментарий</span>
          <textarea name="message" rows={4} value={form.message} onChange={(e) => update('message', e.target.value)} onBlur={() => blur('message')} aria-invalid={Boolean(fieldError('message'))} aria-describedby={describedBy('message', true)} maxLength={1000} />
          <span className="field-hint" id="message-hint">Курс, вуз, удобное время для связи. Не указывайте паспортные данные.</span>
          {fieldError('message') ? <span className="field-error" id="message-error">{errors.message}</span> : null}
        </label>

        <label className="checkbox">
          <input type="checkbox" name="consent" checked={form.consent} onChange={(e) => { update('consent', e.target.checked); setTouched((t) => ({ ...t, consent: true })); }} aria-invalid={Boolean(fieldError('consent'))} aria-describedby={describedBy('consent', true)} />
          <span>
            Я согласен(на) на обработку персональных данных для обратной связи. <span aria-hidden="true">*</span>
            <span className="field-hint" id="consent-hint">Текст согласия — заглушка; финальная политика обработки данных будет опубликована до подключения backend.</span>
          </span>
        </label>
        {fieldError('consent') ? <p className="field-error" id="consent-error">{errors.consent}</p> : null}

        {submitState.status === 'error' ? (
          <p className="field-error" role="alert">{submitState.error?.message}</p>
        ) : null}

        <button type="submit" className="btn btn--primary btn--block" disabled={submitState.status === 'sending'}>
          {submitState.status === 'sending' ? 'Отправляем…' : 'Оставить заявку'}
        </button>
        <p className="fine">Оплата на сайте не принимается. Условия подписки NNATO фиксируются в договоре-оферте.</p>
      </form>
    </div>
  );
}
