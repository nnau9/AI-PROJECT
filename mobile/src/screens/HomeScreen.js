import { Text, View } from 'react-native';
import { Screen, Card, H2, P, Button, Notice, FactBadge, SourceLinks, useContent, useColors } from '../components/ui';
import { groupStepsByPhase } from '../services';

const loaders = {
  program: (r) => r.getProgram(),
  steps: (r) => r.getSteps(),
  sourceIndex: (r) => r.getSourceIndex(),
};

export default function HomeScreen({ navigation }) {
  const state = useContent(loaders);
  const c = useColors();
  const d = state.data;
  return (
    <Screen
      eyebrow="NNATO · Summer Work Travel USA"
      title={d ? 'Лето в США. С ясным планом.' : 'NNATO'}
      lead={d?.program.summary.lead}
      state={state}
    >
      {d ? (
        <>
          <Button title="Посмотреть шаги" onPress={() => navigation.navigate('Steps')} />
          <Button title="Сравнить агентства" variant="secondary" onPress={() => navigation.navigate('Agencies')} />
          <Button title="Выбрать тариф" variant="ghost" onPress={() => navigation.navigate('Plans')} />
          <Notice title="Важно">{d.program.meta.visaDisclaimer} {d.program.meta.conditionsDisclaimer}</Notice>

          <H2>Кому подходит</H2>
          {d.program.eligibility.map((e) => (
            <Card key={e.id}>
              <P>{e.text}</P>
              <FactBadge status={e.status} />
              <SourceLinks ids={e.sourceIds} index={d.sourceIndex} />
            </Card>
          ))}

          <H2>Путь участника</H2>
          {groupStepsByPhase(d.steps).map((phase, i) => (
            <Card key={phase.id}>
              <Text style={{ color: c.accent, fontWeight: '700' }}>{i + 1}. {phase.title}</Text>
              {phase.steps.map((s) => (
                <Text key={s.id} style={{ color: c.muted, marginTop: 4 }}>— {s.title}</Text>
              ))}
            </Card>
          ))}

          <H2>Что проверить до оплаты</H2>
          {d.program.checkBeforePaying.map((item) => (
            <Card key={item.id}>
              <Text style={{ color: c.text, fontWeight: '700', marginBottom: 4 }}>{item.title}</Text>
              <P muted>{item.text}</P>
            </Card>
          ))}
          <View style={{ marginTop: 8 }}>
            <P muted>{d.program.meta.serviceDisclaimer}</P>
          </View>
        </>
      ) : null}
    </Screen>
  );
}
