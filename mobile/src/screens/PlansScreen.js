import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Screen, Card, P, Button, Notice, useContent, useColors } from '../components/ui';
import { formatPlanPrice, getOwnFeatures, validateLead } from '../services';
import { leadRepository } from '../services';
import { TAP, radius } from '../theme';

const loaders = { plans: (r) => r.getPlans() };

function LeadForm({ plans, planId, onClose }) {
  const c = useColors();
  const [form, setForm] = useState({ planId, name: '', contact: '', city: '', message: '', consent: false });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const input = { minHeight: TAP, borderWidth: 1, borderColor: c.border, borderRadius: radius.s, paddingHorizontal: 12, color: c.text, backgroundColor: c.surface, marginBottom: 4 };
  const err = (k) => (errors[k] ? <Text style={{ color: c.danger, marginBottom: 8 }}>{errors[k]}</Text> : <View style={{ height: 8 }} />);

  const submit = async () => {
    const e = validateLead(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setStatus('sending');
    try {
      const res = await leadRepository.submit(form);
      setStatus(res.stub ? 'stub' : 'sent');
    } catch (ex) {
      setErrors(ex.fieldErrors ?? { form: ex.message });
      setStatus('idle');
    }
  };

  if (status === 'stub' || status === 'sent') {
    return (
      <Card>
        <Text style={{ color: c.ok, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Заявка заполнена</Text>
        {status === 'stub' ? (
          <Notice tone="warn" title="Демонстрационный режим">Backend ещё не подключён: заявка никуда не отправлена и не сохранена.</Notice>
        ) : (
          <P>Мы свяжемся с вами.</P>
        )}
        <Button title="Готово" variant="secondary" onPress={onClose} />
      </Card>
    );
  }

  return (
    <Card highlight>
      <Text style={{ color: c.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
        Заявка · {plans.plans.find((p) => p.id === form.planId)?.name}
      </Text>
      {!leadRepository.isConnected ? <Notice tone="warn">Демонстрационная форма: данные никуда не отправляются.</Notice> : null}
      <TextInput style={input} placeholder="Имя *" placeholderTextColor={c.muted} value={form.name} onChangeText={(v) => set('name', v)} accessibilityLabel="Имя" autoComplete="name" />
      {err('name')}
      <TextInput style={input} placeholder="Телефон или email *" placeholderTextColor={c.muted} value={form.contact} onChangeText={(v) => set('contact', v)} accessibilityLabel="Телефон или email" />
      {err('contact')}
      <TextInput style={input} placeholder="Город" placeholderTextColor={c.muted} value={form.city} onChangeText={(v) => set('city', v)} accessibilityLabel="Город" />
      {err('city')}
      <TextInput style={[input, { minHeight: 88, textAlignVertical: 'top', paddingTop: 10 }]} multiline placeholder="Комментарий (без паспортных данных)" placeholderTextColor={c.muted} value={form.message} onChangeText={(v) => set('message', v)} accessibilityLabel="Комментарий" />
      {err('message')}
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: form.consent }} onPress={() => set('consent', !form.consent)} style={{ flexDirection: 'row', gap: 10, minHeight: TAP, alignItems: 'center' }}>
        <Text style={{ fontSize: 20, color: form.consent ? c.accent : c.muted }}>{form.consent ? '☑' : '☐'}</Text>
        <Text style={{ color: c.text, flex: 1 }}>Согласен(на) на обработку персональных данных (текст согласия — заглушка)</Text>
      </Pressable>
      {err('consent')}
      {errors.form ? <Text style={{ color: c.danger }}>{errors.form}</Text> : null}
      <Button title={status === 'sending' ? 'Отправляем…' : 'Оставить заявку'} onPress={submit} disabled={status === 'sending'} />
      <Button title="Отмена" variant="ghost" onPress={onClose} />
    </Card>
  );
}

export default function PlansScreen() {
  const state = useContent(loaders);
  const c = useColors();
  const [formFor, setFormFor] = useState(null);
  const d = state.data;

  return (
    <Screen eyebrow="Тарифы · 1 год" title="Формат сопровождения" state={state}>
      {d ? (
        <>
          <Notice title="Тарифы NNATO">{d.plans.meta.periodExplanation}</Notice>
          {formFor ? <LeadForm plans={d.plans} planId={formFor} onClose={() => setFormFor(null)} /> : null}
          {d.plans.plans.map((plan) => {
            const parent = d.plans.plans.find((p) => p.id === plan.includesPlan);
            return (
              <Card key={plan.id} highlight={plan.highlight}>
                <Text style={{ color: c.text, fontSize: 24, fontWeight: '700' }}>{plan.name}</Text>
                <P muted>{plan.tagline}</P>
                <Text style={{ color: c.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
                  {formatPlanPrice(plan, d.plans.meta.period)}
                </Text>
                {parent ? <P style={{ fontWeight: '600' }}>Всё из {parent.name}, плюс:</P> : null}
                {getOwnFeatures(plan, d.plans).map((fid) => {
                  const f = d.plans.features.find((x) => x.id === fid);
                  return (
                    <View key={fid} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                      <Text style={{ color: c.accent }}>✓</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.text }}>{f.title}</Text>
                        {f.footnote ? (
                          <Text style={{ color: c.muted, fontSize: 13, backgroundColor: c.warnSoft, padding: 8, borderRadius: 8, marginTop: 4 }}>
                            {d.plans.footnotes[f.footnote]}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
                <Button title="Оставить заявку" variant={plan.highlight ? 'primary' : 'secondary'} onPress={() => setFormFor(plan.id)} />
              </Card>
            );
          })}
          <P muted>{d.plans.meta.notIncluded}</P>
          <P muted>{d.plans.meta.paymentNote}</P>
        </>
      ) : null}
    </Screen>
  );
}
