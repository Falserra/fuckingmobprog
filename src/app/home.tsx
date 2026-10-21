// Dashboard / Main Menu (Figure 4): branches into Money Movement, History,
// Subscription Hub and Report & Freeze.
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Btn, C, Card, ListRow, Muted, Screen, formatDate, peso, s } from '@/components/wallet-ui';
import { useMe, useWallet } from '@/lib/wallet-store';

const QUICK: { label: string; icon: string; href: Href }[] = [
  { label: 'Send', icon: '↗', href: { pathname: '/transact', params: { type: 'send' } } },
  { label: 'Pay bills', icon: '🧾', href: { pathname: '/transact', params: { type: 'bill' } } },
  { label: 'Top up', icon: '＋', href: { pathname: '/transact', params: { type: 'topup' } } },
  { label: 'Receive', icon: '↙', href: '/receive' },
];

export default function HomeScreen() {
  const me = useMe();
  const { transactions, notifications, subscriptions, emergencyFreeze, logout } = useWallet();
  const [freezing, setFreezing] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  const activeSubs = subscriptions.filter((x) => x.status === 'active').length;
  const frozen = me.status === 'frozen';

  // FR-05: one tap freezes the wallet (applied immediately) and files a timestamped fraud ticket.
  const freeze = async () => {
    setFreezing(true);
    await emergencyFreeze();
    setFreezing(false);
    Alert.alert('Wallet frozen', 'All outgoing money is blocked. A fraud ticket was sent to the Security Team for review within 24 hours.');
  };

  return (
    <Screen bare>
      <View style={[s.rowCenter, { justifyContent: 'space-between', marginBottom: 12 }]}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: C.ink }}>Hi, {me.name.split(' ')[0]}</Text>
        <Pressable onPress={() => router.push('/notifications')} hitSlop={12} accessibilityLabel={`Notifications, ${unread} unread`}>
          <Text style={{ fontSize: 22 }}>🔔</Text>
          {unread > 0 && (
            <View style={{ position: 'absolute', top: -4, right: -8, backgroundColor: C.danger, borderRadius: 9, minWidth: 18, paddingHorizontal: 4, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{unread}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {frozen && (
        <Card style={{ backgroundColor: C.dangerBg }}>
          <Text style={{ color: C.danger, fontWeight: '800', fontSize: 16 }}>Account frozen</Text>
          <Text style={{ color: C.danger, marginTop: 4 }}>
            Sending, paying and topping up are disabled while the Security Team reviews your case. You&apos;ll be notified when it is unlocked.
          </Text>
        </Card>
      )}

      <View style={{ backgroundColor: C.ink, borderRadius: 18, padding: 22, marginBottom: 14 }}>
        <Text style={{ color: '#BFD3E6' }}>Wallet balance</Text>
        <Text style={{ color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 4 }}>{peso(me.balance)}</Text>
        <Text style={{ color: '#BFD3E6', marginTop: 6 }}>@{me.username}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {QUICK.map((q) => {
          const disabled = frozen && q.label !== 'Receive';
          return (
            <Pressable
              key={q.label}
              disabled={disabled}
              onPress={() => router.push(q.href)}
              style={({ pressed }) => [{ flex: 1, backgroundColor: C.card, borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
              <Text style={{ fontSize: 22, color: C.ink }}>{q.icon}</Text>
              <Text style={{ color: C.ink, fontWeight: '600', marginTop: 4, fontSize: 13 }}>{q.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ListRow title="Transaction history" subtitle={`${transactions.length} record(s)`} onPress={() => router.push('/history')} right={<Text style={s.muted}>›</Text>} />
      <ListRow title="Subscription Hub" subtitle={`${activeSubs} active auto-deduction(s)`} onPress={() => router.push('/subscriptions')} right={<Text style={s.muted}>›</Text>} />
      <ListRow title="Check a link or SMS" subtitle="Scan messages for phishing before you tap" onPress={() => router.push('/scan')} right={<Text style={s.muted}>›</Text>} />
      <ListRow title="Report suspicious activity" subtitle="Send a fraud ticket to the Security Team" onPress={() => router.push('/report')} right={<Text style={s.muted}>›</Text>} />
      <ListRow title="Security settings" subtitle="Biometrics and security demo options" onPress={() => router.push('/settings')} right={<Text style={s.muted}>›</Text>} />

      {!frozen && (
        <View style={{ marginTop: 8 }}>
          <Btn label="🚨 Emergency freeze" variant="danger" onPress={freeze} loading={freezing} />
          <Muted style={{ textAlign: 'center', marginBottom: 8 }}>Being scammed right now? One tap locks your wallet instantly.</Muted>
        </View>
      )}

      <Text style={[s.h2, { marginTop: 12 }]}>Recent activity</Text>
      {transactions.length === 0 ? (
        <Muted>No transactions yet.</Muted>
      ) : (
        transactions.slice(0, 3).map((t) => (
          <ListRow
            key={t.id}
            title={t.counterparty}
            subtitle={`${formatDate(t.timestamp)} · ${t.status}`}
            right={
              <Text style={{ fontWeight: '700', color: t.status !== 'completed' ? C.mute : t.type === 'receive' || t.type === 'topup' ? '#0E7C4A' : C.ink }}>
                {t.type === 'receive' || t.type === 'topup' ? '+' : '−'}
                {peso(t.amount)}
              </Text>
            }
          />
        ))
      )}

      <View style={{ marginTop: 16 }}>
        <Btn label="Log out" variant="ghost" onPress={logout} />
      </View>
    </Screen>
  );
}
