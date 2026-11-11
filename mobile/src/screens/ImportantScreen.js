import { Linking, Pressable, Text } from 'react-native';
import { Screen, Card, H2, P, Bullet, Notice, FactBadge, SourceLinks, useContent, useColors } from '../components/ui';
import { TAP } from '../theme';

const loaders = {
  notes: (r) => r.getImportantNotes(),
  program: (r) => r.getProgram(),
  sourceIndex: (r) => r.getSourceIndex(),
};

export default function ImportantScreen() {
  const state = useContent(loaders);
  const c = useColors();
  const d = state.data;
  return (
    <Screen eyebrow="Важные моменты" title="Деньги, документы, права" state={state}>
      {d ? (
        <>
          <H2>Полная стоимость</H2>
          <P muted>{d.notes.meta.note}</P>
          {d.notes.costItems.map((item) => (
            <Card key={item.id}>
              <Text style={{ color: c.text, fontWeight: '700' }}>{item.title}</Text>
              <Text style={{ color: item.amount ? c.text : c.warn, marginVertical: 4 }}>
                {item.amount ? `${item.amount} (${item.currency})` : 'Нет подтверждённой суммы'}
              </Text>
              <P muted>{item.text}</P>
              <SourceLinks ids={item.sourceIds} index={d.sourceIndex} />
            </Card>
          ))}

          <H2>Ключевые правила</H2>
          {d.program.facts.map((f) => (
            <Card key={f.id}>
              <Text style={{ color: c.text, fontWeight: '700', marginBottom: 4 }}>{f.label}</Text>
              <FactBadge status={f.status} />
              <P>{f.value ?? 'Нужна проверка'}</P>
              {f.note ? <P muted>{f.note}</P> : null}
              <SourceLinks ids={f.sourceIds} index={d.sourceIndex} />
            </Card>
          ))}

          {d.notes.sections.map((s) => (
            <Card key={s.id}>
              <Text accessibilityRole="header" style={{ color: c.text, fontWeight: '700', fontSize: 17, marginBottom: 8 }}>{s.title}</Text>
              {s.items.map((i) => <Bullet key={i}>{i}</Bullet>)}
              <SourceLinks ids={s.sourceIds} index={d.sourceIndex} />
            </Card>
          ))}

          <H2>Тревожные сигналы</H2>
          <Notice tone="warn">{d.notes.redFlags.map((r) => `• ${r}`).join('\n')}</Notice>

          <H2>Экстренные контакты</H2>
          {d.program.hotlines.map((h) => (
            <Card key={h.id}>
              <P muted>{h.title}</P>
              <Pressable accessibilityRole="link" onPress={() => Linking.openURL(h.href)} style={{ minHeight: TAP, justifyContent: 'center' }}>
                <Text style={{ color: c.accent, fontSize: 20, fontWeight: '700' }}>{h.value}</Text>
              </Pressable>
              {h.note ? <P muted>{h.note}</P> : null}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
