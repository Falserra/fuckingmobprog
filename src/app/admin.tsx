// Administrator dashboard (Figure 9 / Figure 14): review reports, freeze/unlock accounts,
// monitor flagged transactions. Same "displayDashboard" entry point as customers, different view.
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Btn, C, Card, Chip, Empty, H2, Muted, Screen, formatDate, peso, s } from '@/components/wallet-ui';
import { RISK_COPY } from '@/lib/verification';
import { useWallet } from '@/lib/wallet-store';

type Tab = 'reports' | 'accounts' | 'flagged';

export default function AdminScreen() {
  const { me, accounts, reports, allTransactions, accountById, reviewReport, setAccountStatus, logout } = useWallet();
  const [tab, setTab] = useState<Tab>('reports');

  const pending = reports.filter((r) => r.status === 'pending').sort((a, b) => Number(b.emergency) - Number(a.emergency) || a.timestamp - b.timestamp);
  const closed = reports.filter((r) => r.status !== 'pending');
  const customers = accounts.filter((a) => a.role === 'customer');
  const flagged = allTransactions.filter((t) => t.risk !== 'green' && t.type !== 'receive');

  const confirmFreeze = (reportId: string, name: string) =>
    Alert.alert('Freeze account?', `${name} will not be able to move money until unlocked.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Freeze', style: 'destructive', onPress: () => reviewReport(reportId, 'freeze') },
    ]);

  return (
    <Screen bare>
      <View style={[s.rowCenter, { justifyContent: 'space-between' }]}>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>Security console</Text>
          <Muted>Signed in as {me?.name}</Muted>
        </View>
        <Btn label="Log out" variant="ghost" onPress={logout} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginVertical: 14 }}>
        <Stat label="Pending reports" value={pending.length} alert={pending.some((r) => r.emergency)} />
        <Stat label="Frozen accounts" value={customers.filter((a) => a.status === 'frozen').length} />
        <Stat label="Flagged txns" value={flagged.length} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <Chip label={`Reports (${pending.length})`} active={tab === 'reports'} onPress={() => setTab('reports')} />
        <Chip label="Accounts" active={tab === 'accounts'} onPress={() => setTab('accounts')} />
        <Chip label="Flagged" active={tab === 'flagged'} onPress={() => setTab('flagged')} />
      </View>

      {tab === 'reports' && (
        <>
          {pending.length === 0 && <Empty text="No reports waiting for review." />}
          {pending.map((r) => {
            const who = accountById(r.accountId);
            const frozen = who?.status === 'frozen';
            return (
              <Card key={r.id} style={r.emergency ? { borderWidth: 2, borderColor: C.danger } : undefined}>
                {r.emergency && <Text style={{ color: C.danger, fontWeight: '800', marginBottom: 4 }}>🚨 EMERGENCY FREEZE</Text>}
                <Text style={{ color: C.ink, fontWeight: '700' }}>
                  {who?.name} (@{who?.username})
                </Text>
                <Muted>
                  Ticket {r.id.toUpperCase()} · {formatDate(r.timestamp)} · review by {formatDate(r.timestamp + 24 * 3_600_000)}
                </Muted>
                <Text style={{ color: C.ink, marginVertical: 8 }}>{r.description}</Text>
                {frozen ? (
                  <>
                    <Btn label="Confirm fraud — keep frozen" variant="danger" onPress={() => reviewReport(r.id, 'freeze')} />
                    <Btn
                      label="False alarm — unlock & close"
                      variant="ghost"
                      onPress={() => {
                        setAccountStatus(r.accountId, 'active');
                        reviewReport(r.id, 'dismiss');
                      }}
                    />
                  </>
                ) : (
                  <>
                    <Btn label="Confirmed fraudulent — freeze account" variant="danger" onPress={() => confirmFreeze(r.id, who?.name ?? 'This user')} />
                    <Btn label="Dismiss report" variant="ghost" onPress={() => reviewReport(r.id, 'dismiss')} />
                  </>
                )}
              </Card>
            );
          })}
          {closed.length > 0 && (
            <>
              <H2>Closed</H2>
              {closed.map((r) => (
                <Muted key={r.id}>
                  {formatDate(r.timestamp)} · {accountById(r.accountId)?.name} · {r.status === 'dismissed' ? 'Dismissed' : 'Frozen'}
                </Muted>
              ))}
            </>
          )}
        </>
      )}

      {tab === 'accounts' &&
        customers.map((a) => (
          <Card key={a.id}>
            <View style={[s.rowCenter, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.ink, fontWeight: '700' }}>
                  {a.name} {a.verified ? '✓' : ''}
                </Text>
                <Muted>
                  @{a.username} · {peso(a.balance)}
                </Muted>
              </View>
              <Text style={{ color: a.status === 'frozen' ? C.danger : '#0E7C4A', fontWeight: '700' }}>{a.status === 'frozen' ? 'Frozen' : 'Active'}</Text>
            </View>
            <Btn
              label={a.status === 'frozen' ? 'Unlock account' : 'Freeze account'}
              variant={a.status === 'frozen' ? 'teal' : 'ghost'}
              onPress={() => setAccountStatus(a.id, a.status === 'frozen' ? 'active' : 'frozen')}
            />
          </Card>
        ))}

      {tab === 'flagged' &&
        (flagged.length === 0 ? (
          <Empty text="No flagged transactions." />
        ) : (
          flagged.map((t) => (
            <Card key={t.id}>
              <View style={[s.rowCenter, { justifyContent: 'space-between' }]}>
                <Text style={{ color: C.ink, fontWeight: '700', flex: 1 }}>
                  {accountById(t.accountId)?.name} → {t.counterparty}
                </Text>
                <Text style={{ color: RISK_COPY[t.risk].color, fontWeight: '700' }}>{RISK_COPY[t.risk].label}</Text>
              </View>
              <Muted>
                {t.type} · {peso(t.amount)} · {t.status} · {formatDate(t.timestamp)}
              </Muted>
            </Card>
          ))
        ))}
    </Screen>
  );
}

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: alert ? C.dangerBg : C.card, borderRadius: 12, padding: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '800', color: alert ? C.danger : C.ink }}>{value}</Text>
      <Text style={{ color: C.mute, fontSize: 12 }}>{label}</Text>
    </View>
  );
}
