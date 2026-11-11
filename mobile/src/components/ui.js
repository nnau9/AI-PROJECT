import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getColors, radius, space, TAP } from '../theme';
import {
  contentRepository,
  resolveSources,
  formatDate,
  SOURCE_STATUS_LABELS,
  FACT_STATUS_LABELS,
  AGENCY_STATUS_LABELS,
} from '../services';

export function useColors() {
  return getColors(useColorScheme());
}

/** Загрузка нескольких коллекций контента (аналог веб-хука useContent). */
export function useContent(loaders) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    const entries = Object.entries(loaders);
    Promise.all(entries.map(([, load]) => load(contentRepository)))
      .then((values) => {
        if (!cancelled) setState({ status: 'success', data: Object.fromEntries(entries.map(([k], i) => [k, values[i]])), error: null });
      })
      .catch((error) => !cancelled && setState({ status: 'error', data: null, error }));
    return () => {
      cancelled = true;
    };
  }, [loaders, attempt]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

export function Screen({ eyebrow, title, lead, children, state }) {
  const c = useColors();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: space[4], paddingBottom: space[6] }} keyboardShouldPersistTaps="handled">
        {eyebrow ? <Text style={{ color: c.sigInk, fontWeight: '600', marginBottom: space[1] }}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={{ color: c.text, fontSize: 34, fontWeight: '700', letterSpacing: -0.8, marginBottom: space[2] }}>
          {title}
        </Text>
        {lead ? <Text style={{ color: c.muted, fontSize: 17, lineHeight: 24, marginBottom: space[4] }}>{lead}</Text> : null}
        {state?.status === 'loading' ? (
          <View style={{ paddingVertical: space[6] }} accessibilityLabel="Загрузка">
            <ActivityIndicator color={c.accent} />
          </View>
        ) : state?.status === 'error' ? (
          <Card>
            <Text style={{ color: c.danger, fontWeight: '600', marginBottom: space[2] }}>Не удалось загрузить данные</Text>
            <Text style={{ color: c.muted, marginBottom: space[3] }}>{state.error?.message}</Text>
            <Button title="Попробовать снова" variant="secondary" onPress={state.retry} />
          </Card>
        ) : (
          children
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style, highlight }) {
  const c = useColors();
  return (
    <View
      style={[
        { backgroundColor: c.surface, borderColor: highlight ? c.accent : c.border, borderWidth: highlight ? 2 : StyleSheet.hairlineWidth, borderRadius: radius.m, padding: space[4], marginBottom: space[3] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function H2({ children }) {
  const c = useColors();
  return <Text accessibilityRole="header" style={{ color: c.text, fontSize: 22, fontWeight: '700', marginTop: space[5], marginBottom: space[3] }}>{children}</Text>;
}

export function P({ children, muted, style }) {
  const c = useColors();
  return <Text style={[{ color: muted ? c.muted : c.text, fontSize: 16, lineHeight: 23, marginBottom: space[2] }, style]}>{children}</Text>;
}

export function Bullet({ children }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: space[2], marginBottom: space[1] }}>
      <Text style={{ color: c.muted }}>•</Text>
      <Text style={{ color: c.text, flex: 1, fontSize: 15, lineHeight: 21 }}>{children}</Text>
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', disabled }) {
  const c = useColors();
  const bg = variant === 'primary' ? c.accent : variant === 'secondary' ? c.accentSoft : 'transparent';
  const fg = variant === 'primary' ? c.onAccent : c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: TAP, paddingHorizontal: space[5], borderRadius: 999, alignItems: 'center', justifyContent: 'center',
        backgroundColor: bg, borderWidth: variant === 'ghost' ? 1 : 0, borderColor: c.border, opacity: pressed || disabled ? 0.7 : 1, marginBottom: space[2],
      })}
    >
      <Text style={{ color: fg, fontWeight: '600', fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
}

const TONES = {
  ok: ['okSoft', 'ok'],
  warn: ['warnSoft', 'warn'],
  info: ['accentSoft', 'accent'],
  neutral: ['surfaceMuted', 'muted'],
};

export function Badge({ tone = 'neutral', children }) {
  const c = useColors();
  const [bg, fg] = TONES[tone];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: c[bg], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginRight: 6, marginBottom: 6 }}>
      <Text style={{ color: c[fg], fontSize: 12, fontWeight: '600' }}>{children}</Text>
    </View>
  );
}

const FACT_TONE = { confirmed: 'ok', partial: 'warn', needs_check: 'warn', agency_claim: 'neutral' };
const AGENCY_TONE = { verified: 'ok', sponsor_listed: 'info', claims_only: 'neutral', needs_check: 'warn' };
export const FactBadge = ({ status }) => <Badge tone={FACT_TONE[status]}>{FACT_STATUS_LABELS[status]}</Badge>;
export const AgencyBadge = ({ status }) => <Badge tone={AGENCY_TONE[status]}>{AGENCY_STATUS_LABELS[status]}</Badge>;

export function ClaimTag() {
  const c = useColors();
  return <Text style={{ color: c.warn, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}> заявление организации</Text>;
}

export function LinkText({ url, children }) {
  const c = useColors();
  return (
    <Text accessibilityRole="link" onPress={() => Linking.openURL(url)} style={{ color: c.accent, textDecorationLine: 'underline', fontSize: 15, lineHeight: 22 }}>
      {children}
    </Text>
  );
}

export function SourceLinks({ ids = [], index = {} }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const items = resolveSources(ids, index);
  if (!items.length) return null;
  return (
    <View style={{ marginTop: space[2] }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((v) => !v)} style={{ minHeight: TAP, justifyContent: 'center' }}>
        <Text style={{ color: c.muted, fontSize: 14 }}>Источники ({items.length}) {open ? '▲' : '▼'}</Text>
      </Pressable>
      {open
        ? items.map((s) => (
            <View key={s.id} style={{ backgroundColor: c.surfaceMuted, borderRadius: radius.s, padding: space[3], marginBottom: space[2] }}>
              <LinkText url={s.url}>{s.title}</LinkText>
              <Text style={{ color: c.muted, fontSize: 13, marginTop: 2 }}>
                {SOURCE_STATUS_LABELS[s.status]} · проверено {formatDate(s.checkedAt)}
              </Text>
            </View>
          ))
        : null}
    </View>
  );
}

export function Notice({ tone = 'info', title, children }) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: tone === 'warn' ? c.warnSoft : c.accentSoft, borderRadius: radius.m, padding: space[4], marginBottom: space[4] }}>
      {title ? <Text style={{ color: c.text, fontWeight: '700', marginBottom: space[1] }}>{title}</Text> : null}
      <Text style={{ color: c.text, fontSize: 15, lineHeight: 21 }}>{children}</Text>
    </View>
  );
}
