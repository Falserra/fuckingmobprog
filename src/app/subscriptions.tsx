// Subscription Hub (FR-04, Figure 8 / Figure 13): view, block or unbind third-party auto-deductions.
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Btn, C, Card, Empty, H2, Muted, Screen, formatDate, peso } from '@/components/wallet-ui';
import type { Subscription } from '@/lib/types';
import { useWallet } from '@/lib/wallet-store';

const STATUS_COPY: Record<Subscription['status'], { label: string; color: string; bg: string }> = {
  active: { label: 'Auto-deducting', color: '#0E7C4A', bg: '#DDF5E8' },
  blocked: { label: 'Blocked', color: '#8A5A00', bg: '#FFF1CC' },
  unbound: { label: 'Unbound', color: '#6B7C8F', bg: '#E6EBF0' },
};

export default function SubscriptionsScreen() {
  const { subscriptions, setSubscriptionStatus } = useWallet();
  const [busy, setBusy] = useState<string | null>(null);

  const monthly = subscriptions
    .filter((x) => x.status === 'active')
    .reduce((sum, x) => sum + (x.cycle === 'weekly' ? x.amount * 4.33 : x.cycle === 'yearly' ? x.amount / 12 : x.amount), 0);

  const act = (sub: Subscription, status: Subscription['status']) => {
    const run = async () => {
      setBusy(sub.id + status);
      const res = await setSubscriptionStatus(sub.id, status);
      setBusy(null);
      if (!res.ok) Alert.alert('Unable to revoke access', res.error);
    };
    if (status === 'unbound') {
      Alert.alert(`Unbind ${sub.merchant}?`, `${sub.merchant}'s access token will be revoked and it can never charge this wallet again unless you re-link it.`, [
        { text: 'Keep', style: 'cancel' },
        { text: 'Unbind', style: 'destructive', onPress: run },
      ]);
    } else run();
  };

  const linked = subscriptions.filter((x) => x.status !== 'unbound');
  const removed = subscriptions.filter((x) => x.status === 'unbound');

  return (
    <Screen>
      <Card style={{ backgroundColor: C.ink }}>
        <Text style={{ color: '#BFD3E6' }}>Estimated auto-deductions per month</Text>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 }}>{peso(monthly)}</Text>
        <Text style={{ color: '#BFD3E6', marginTop: 4 }}>{subscriptions.filter((x) => x.status === 'active').length} app(s) can charge your wallet</Text>
      </Card>

      {linked.length === 0 && <Empty text="No linked apps can charge your wallet." />}
      {linked.map((sub) => {
        const st = STATUS_COPY[sub.status];
        return (
          <Card key={sub.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <H2>{sub.merchant}</H2>
                <Muted>
                  {sub.plan} · {peso(sub.amount)} / {sub.cycle.replace('ly', '')}
                </Muted>
                <Muted>Linked {formatDate(sub.linkedOn)}</Muted>
                {sub.status === 'active' && <Muted>Next charge {formatDate(sub.nextCharge)}</Muted>}
              </View>
              <View style={{ backgroundColor: st.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: st.color, fontSize: 12, fontWeight: '700' }}>{st.label}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                {sub.status === 'active' ? (
                  <Btn label="Block" variant="ghost" onPress={() => act(sub, 'blocked')} loading={busy === sub.id + 'blocked'} />
                ) : (
                  <Btn label="Allow again" variant="ghost" onPress={() => act(sub, 'active')} loading={busy === sub.id + 'active'} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Btn label="Unbind" variant="danger" onPress={() => act(sub, 'unbound')} loading={busy === sub.id + 'unbound'} />
              </View>
            </View>
          </Card>
        );
      })}

      {removed.length > 0 && (
        <>
          <H2>Unbound</H2>
          {removed.map((sub) => (
            <Muted key={sub.id}>
              {sub.merchant} — {sub.plan} (access revoked)
            </Muted>
          ))}
        </>
      )}
      <Muted style={{ marginTop: 12 }}>
        Block pauses charges but keeps the link. Unbind revokes the app&apos;s access token so it can no longer deduct from your wallet.
      </Muted>
    </Screen>
  );
}
