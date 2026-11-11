import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Screen, Card, H2, P, Badge, Notice, SourceLinks, useContent, useColors } from '../components/ui';
import { groupStepsByPhase, getProgress, checklistKey } from '../services';
import { TAP } from '../theme';

const loaders = { steps: (r) => r.getSteps(), sourceIndex: (r) => r.getSourceIndex() };

export default function StepsScreen() {
  const state = useContent(loaders);
  const c = useColors();
  const [open, setOpen] = useState({});
  // Отметки хранятся в памяти; для сохранения между запусками подключите AsyncStorage.
  const [checked, setChecked] = useState({});
  const d = state.data;
  let n = 0;

  return (
    <Screen eyebrow="Как поехать" title="Пошаговый путь" state={state}>
      {d ? (
        <>
          <Notice tone="warn" title="Общий ориентир">{d.steps.meta.disclaimer}</Notice>
          <P muted>Выполнено: {getProgress(d.steps, checked).done} из {getProgress(d.steps, checked).total}</P>
          {groupStepsByPhase(d.steps).map((phase) => (
            <View key={phase.id}>
              <H2>{phase.title}</H2>
              {phase.steps.map((step) => {
                n += 1;
                const isOpen = Boolean(open[step.id]);
                return (
                  <Card key={step.id}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isOpen }}
                      onPress={() => setOpen((o) => ({ ...o, [step.id]: !o[step.id] }))}
                      style={{ minHeight: TAP }}
                    >
                      <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>{n}. {step.title} {isOpen ? '▲' : '▼'}</Text>
                      <Text style={{ color: c.muted, marginTop: 2 }}>{step.summary}</Text>
                    </Pressable>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                      {step.dependsOn.map((dep) => <Badge key={dep}>{d.steps.dependencyLabels[dep]}</Badge>)}
                    </View>
                    {isOpen ? (
                      <View>
                        {step.details ? <P>{step.details}</P> : null}
                        {step.checklist.map((item, i) => {
                          const key = checklistKey(step.id, i);
                          const on = Boolean(checked[key]);
                          return (
                            <Pressable
                              key={key}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: on }}
                              onPress={() => setChecked((s) => ({ ...s, [key]: !on }))}
                              style={{ flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: TAP }}
                            >
                              <Text style={{ color: on ? c.ok : c.muted, fontSize: 20 }}>{on ? '☑' : '☐'}</Text>
                              <Text style={{ color: on ? c.muted : c.text, flex: 1, textDecorationLine: on ? 'line-through' : 'none' }}>{item}</Text>
                            </Pressable>
                          );
                        })}
                        <SourceLinks ids={step.sourceIds} index={d.sourceIndex} />
                      </View>
                    ) : null}
                  </Card>
                );
              })}
            </View>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
