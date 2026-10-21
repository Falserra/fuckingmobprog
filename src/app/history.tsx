// View Transaction History (Figure 7). Tap a record to report it.
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { C, Chip, Empty, ListRow, Screen, formatDate, peso } from '@/components/wallet-ui';
import type { TxType } from '@/lib/types';
import { RISK_COPY } from '@/lib/verification';
import { useWallet } from '@/lib/wallet-store';

const FILTERS: { key: 'all' | TxType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'send', label: 'Sent' },
  { key: 'receive', label: 'Received' },
  { key: 'bill', label: 'Bills' },
  { key: 'topup', label: 'Top ups' },
];
const VERB: Record<TxType, string> = { send: 'Sent to', receive: 'Received from', bill: 'Paid', topup: 'Top up from' };

export default function HistoryScreen() {
  const { transactions } = useWallet();
  const [filter, setFilter] = useState<'all' | TxType>('all');
  const list = filter === 'all' ? transactions : transactions.filter((t) => t.type === filter);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </View>
      {list.length === 0 ? (
        <Empty text="No transactions yet." />
      ) : (
        list.map((t) => {
          const incoming = t.type === 'receive' || t.type === 'topup';
          return (
            <ListRow
              key={t.id}
              title={`${VERB[t.type]} ${t.counterparty}`}
              subtitle={`${formatDate(t.timestamp)} · ${t.status}${t.note ? ` · “${t.note}”` : ''}`}
              onPress={() => router.push({ pathname: '/report', params: { transactionId: t.id } })}
              right={
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '700', color: t.status !== 'completed' ? C.mute : incoming ? '#0E7C4A' : C.ink, textDecorationLine: t.status === 'completed' ? 'none' : 'line-through' }}>
                    {incoming ? '+' : '−'}
                    {peso(t.amount)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: RISK_COPY[t.risk].color, marginRight: 4 }} />
                    <Text style={{ fontSize: 11, color: C.mute }}>{RISK_COPY[t.risk].label}</Text>
                  </View>
                </View>
              }
            />
          );
        })
      )}
      {list.length > 0 && <Text style={{ color: C.mute, textAlign: 'center', marginTop: 8 }}>Don&apos;t recognise a transaction? Tap it to report it.</Text>}
    </Screen>
  );
}
