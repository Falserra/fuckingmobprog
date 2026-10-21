// Shared UI for CiCo screens (palette carried over from the first prototype).
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RiskLevel } from '@/lib/types';
import { RISK_COPY } from '@/lib/verification';

export const C = {
  ink: '#0F2A43',
  teal: '#12A594',
  bg: '#EEF2F5',
  card: '#FFFFFF',
  mute: '#6B7C8F',
  danger: '#B42318',
  dangerBg: '#FDE2DF',
  line: '#DCE3EA',
};

export const peso = (n: number) => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatDate = (ts: number) =>
  new Date(ts).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Scrollable page. Pass `bare` on screens without a navigation header so content clears the status bar. */
export function Screen({ children, bare }: { children: ReactNode; bare?: boolean }) {
  const insets = useSafeAreaInsets();
  const top = bare ? Math.max(insets.top, StatusBar.currentHeight ?? 0) + 16 : 16;
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={{ paddingTop: top, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Input(p: TextInputProps & { label?: string }) {
  return (
    <View>
      {p.label && <Text style={s.label}>{p.label}</Text>}
      <TextInput placeholderTextColor={C.mute} {...p} style={[s.input, p.style]} />
    </View>
  );
}

type BtnProps = { label: string; onPress: () => void; variant?: 'primary' | 'ghost' | 'danger' | 'teal'; disabled?: boolean; loading?: boolean };
export function Btn({ label, onPress, variant = 'primary', disabled, loading }: BtnProps) {
  const bg = { primary: C.ink, ghost: 'transparent', danger: C.danger, teal: C.teal }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }, variant === 'ghost' && s.ghost]}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={[s.btnT, variant === 'ghost' && { color: C.ink }]}>{label}</Text>}
    </Pressable>
  );
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={s.h1}>{children}</Text>;
}
export function H2({ children }: { children: ReactNode }) {
  return <Text style={s.h2}>{children}</Text>;
}
export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.muted, style]}>{children}</Text>;
}

/** Inline colour-coded risk indicator (NFR-03): shown on the confirmation screen, no extra taps. */
export function RiskIndicator({ level, reasons }: { level: RiskLevel; reasons: string[] }) {
  const c = RISK_COPY[level];
  return (
    <View style={[s.risk, { backgroundColor: c.bg, borderColor: c.color }]}>
      <View style={s.rowCenter}>
        <View style={[s.dot, { backgroundColor: c.color }]} />
        <Text style={[s.riskT, { color: c.color }]}>{c.label}</Text>
      </View>
      {reasons.length === 0 ? (
        <Text style={[s.riskR, { color: c.color }]}>No warning signs found.</Text>
      ) : (
        reasons.map((r) => (
          <Text key={r} style={[s.riskR, { color: c.color }]}>
            • {r}
          </Text>
        ))
      )}
    </View>
  );
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  return (
    <View style={[s.badge, { backgroundColor: verified ? '#DDF5E8' : '#FFF1CC' }]}>
      <Text style={{ color: verified ? '#0E7C4A' : '#8A5A00', fontSize: 12, fontWeight: '700' }}>{verified ? '✓ Verified' : '! Unverified'}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: C.ink, borderColor: C.ink }]}>
      <Text style={{ color: active ? '#fff' : C.ink, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function ListRow({ title, subtitle, right, onPress, tone }: { title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; tone?: 'danger' }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowT, tone === 'danger' && { color: C.danger }]}>{title}</Text>
        {subtitle ? <Text style={s.rowS}>{subtitle}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
      <Text style={s.muted}>{text}</Text>
    </Card>
  );
}

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  h1: { fontSize: 26, fontWeight: '800', color: C.ink, marginBottom: 12 },
  h2: { fontSize: 18, fontWeight: '700', color: C.ink, marginBottom: 8 },
  muted: { color: C.mute, fontSize: 14, lineHeight: 20 },
  label: { color: C.mute, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 12 },
  input: { backgroundColor: C.bg, borderRadius: 10, padding: 13, marginBottom: 10, color: C.ink, fontSize: 16 },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4, marginBottom: 6, minHeight: 48, justifyContent: 'center' },
  ghost: { borderWidth: 1.5, borderColor: C.ink },
  btnT: { color: '#fff', fontWeight: '700', fontSize: 15 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  risk: { borderWidth: 1.5, borderRadius: 12, padding: 12, marginBottom: 12 },
  riskT: { fontWeight: '800', fontSize: 15 },
  riskR: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  chip: { borderWidth: 1.5, borderColor: C.line, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8, backgroundColor: C.card },
  row: { backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowT: { color: C.ink, fontSize: 16, fontWeight: '600' },
  rowS: { color: C.mute, fontSize: 13, marginTop: 2 },
});
