import { useMemo, useState } from 'react';
import { Linking, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { Screen, Card, H2, P, Bullet, Notice, AgencyBadge, ClaimTag, SourceLinks, useContent, useColors } from '../components/ui';
import { filterAgencies, getAgencyCities, getListedSponsors, SOCIAL_LABELS, formatDate } from '../services';
import { TAP, radius } from '../theme';

const loaders = {
  agencies: (r) => r.getAgencies(),
  sponsors: (r) => r.getSponsors(),
  notes: (r) => r.getImportantNotes(),
  sourceIndex: (r) => r.getSourceIndex(),
};

function Chip({ label, active, onPress }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{ minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, marginRight: 8, marginBottom: 8, backgroundColor: active ? c.accent : c.surface, borderWidth: 1, borderColor: active ? c.accent : c.border }}
    >
      <Text style={{ color: active ? c.onAccent : c.text, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

export default function AgenciesScreen() {
  const state = useContent(loaders);
  const c = useColors();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('all');
  const [listedOnly, setListedOnly] = useState(false);
  const d = state.data;

  const results = useMemo(
    () => (d ? filterAgencies(d.agencies.agencies, { query, city, listedSponsorOnly: listedOnly }, d.sponsors) : []),
    [d, query, city, listedOnly],
  );

  return (
    <Screen eyebrow="Агентства" title="Сравнение агентств" lead="Не рейтинг: только проверяемые параметры и источники." state={state}>
      {d ? (
        <>
          <Notice tone="warn" title="Как мы проверяли">{d.agencies.meta.method}</Notice>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Название, город или спонсор"
            placeholderTextColor={c.muted}
            accessibilityLabel="Поиск агентства"
            style={{ minHeight: TAP, borderWidth: 1, borderColor: c.border, borderRadius: radius.s, paddingHorizontal: 12, color: c.text, backgroundColor: c.surface, marginBottom: 12 }}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip label="Все города" active={city === 'all'} onPress={() => setCity('all')} />
            {getAgencyCities(d.agencies.agencies).map((ct) => <Chip key={ct} label={ct} active={city === ct} onPress={() => setCity(ct)} />)}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: TAP, marginBottom: 8 }}>
            <Text style={{ color: c.text, flex: 1 }}>Только со спонсором из списка BridgeUSA</Text>
            <Switch value={listedOnly} onValueChange={setListedOnly} accessibilityLabel="Только со спонсором из официального списка" />
          </View>
          <P muted>Найдено: {results.length} из {d.agencies.agencies.length}</P>

          {results.length === 0 ? (
            <Card><P>Ничего не найдено. Измените фильтры.</P></Card>
          ) : (
            results.map((a) => {
              const listed = getListedSponsors(a, d.sponsors);
              return (
                <Card key={a.id}>
                  <Text accessibilityRole="header" style={{ color: c.text, fontSize: 18, fontWeight: '700', marginBottom: 6 }}>{a.name}</Text>
                  <AgencyBadge status={a.verificationStatus} />
                  <P muted>{a.description}<ClaimTag /></P>
                  <P>Города: {a.cities.length ? a.cities.join(', ') : 'не указаны на сайте'}</P>
                  <P>
                    Спонсор J-1: {a.usSponsor?.claimedNames?.length ? a.usSponsor.claimedNames.join(', ') : 'не назван'}
                    {a.usSponsor?.claimedNames?.length ? <ClaimTag /> : null}
                  </P>
                  {listed.length ? <P muted>✓ В списке BridgeUSA для SWT с Казахстаном: {listed.map((s) => s.officialName).join('; ')}</P> : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                    {a.contacts.website ? <Chip label="Сайт" onPress={() => Linking.openURL(a.contacts.website)} /> : null}
                    {a.contacts.phones.slice(0, 1).map((p) => <Chip key={p.href} label={p.value} onPress={() => Linking.openURL(p.href)} />)}
                    {a.contacts.emails.slice(0, 1).map((e) => <Chip key={e} label={e} onPress={() => Linking.openURL(`mailto:${e}`)} />)}
                    {a.contacts.social.map((s) => <Chip key={s.url} label={SOCIAL_LABELS[s.type] ?? s.type} onPress={() => Linking.openURL(s.url)} />)}
                  </View>
                  <P muted>Проверено: {formatDate(a.lastVerifiedAt)}</P>
                  <SourceLinks ids={a.sources} index={d.sourceIndex} />
                </Card>
              );
            })
          )}

          <H2>Вопросы агентству до договора</H2>
          {d.notes.agencyQuestions.map((q) => <Bullet key={q}>{q}</Bullet>)}
        </>
      ) : null}
    </Screen>
  );
}
