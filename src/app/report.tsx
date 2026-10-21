// Report Suspicious Activity (Figure 9 / Figure 14).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Btn, C, Card, Chip, H2, Input, Muted, Screen, formatDate, peso } from '@/components/wallet-ui';
import { useWallet } from '@/lib/wallet-store';

const REASONS = ['I didn’t make this transaction', 'Scam / phishing message', 'Someone asked for my OTP', 'Unauthorized auto-deduction', 'Fake QR code', 'Other'];

export default function ReportScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId?: string }>();
  const { transactions, reports, me, submitReport } = useWallet();
  const tx = transactions.find((t) => t.id === transactionId);
  const [reason, setReason] = useState(tx ? REASONS[0] : '');
  const [details, setDetails] = useState('');
  const mine = reports.filter((r) => r.accountId === me?.id);

  const submit = () => {
    if (!reason) return Alert.alert('Choose a reason', 'Tell us what happened.');
    const txText = tx ? ` [${tx.type} ${peso(tx.amount)} – ${tx.counterparty}, ${formatDate(tx.timestamp)}]` : '';
    submitReport({ transactionId: tx?.id, description: `${reason}${txText}${details.trim() ? ': ' + details.trim() : ''}` });
    Alert.alert('Report sent', 'Your timestamped ticket is in the Security Team queue. You will be notified once it is reviewed.');
    router.back();
  };

  return (
    <Screen>
      {tx && (
        <Card>
          <Text style={{ color: C.mute, fontSize: 13, fontWeight: '600' }}>Reporting transaction</Text>
          <Text style={{ color: C.ink, fontWeight: '700', marginTop: 4 }}>
            {tx.counterparty} · {peso(tx.amount)}
          </Text>
          <Muted>
            {formatDate(tx.timestamp)} · {tx.status}
          </Muted>
        </Card>
      )}
      <H2>What happened?</H2>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {REASONS.map((r) => (
          <Chip key={r} label={r} active={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      <Card>
        <Input
          label="Details (optional)"
          placeholder="Usernames, links, what they said…"
          multiline
          value={details}
          onChangeText={setDetails}
          style={{ minHeight: 90, textAlignVertical: 'top' }}
        />
        <Btn label="Submit report" onPress={submit} />
      </Card>
      <Muted>Need to stop money leaving right now? Use the red Emergency freeze button on your dashboard.</Muted>

      {mine.length > 0 && (
        <>
          <H2>Your reports</H2>
          {mine.map((r) => (
            <Card key={r.id}>
              <Text style={{ color: C.ink, fontWeight: '600' }} numberOfLines={2}>
                {r.description}
              </Text>
              <Muted>
                {formatDate(r.timestamp)} · {r.status === 'pending' ? 'Pending review' : r.status === 'dismissed' ? 'Reviewed – closed' : 'Confirmed – account frozen'}
              </Muted>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
