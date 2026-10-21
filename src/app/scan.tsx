// Link / SMS checker (FR-02, revised): flags known-malicious domains and phishing
// patterns with a visible warning before the user opens anything.
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { Btn, C, Card, Chip, H2, Input, Muted, RiskIndicator, Screen } from '@/components/wallet-ui';
import { scanMessage } from '@/lib/verification';

const SAMPLES = [
  'CONGRATULATIONS! You won ₱500,000 from GCash. Claim your prize at http://gcash-rewards.com/claim before it expires!',
  'Your CiCo account will be locked in 24 hours. Verify your account now: bit.ly/cico-verify',
  'Hi! Share your OTP so I can send the refund to your wallet.',
  'Your Meralco bill for October is ready. View it at https://meralco.com.ph',
];

export default function ScanScreen() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ReturnType<typeof scanMessage> | null>(null);

  const scan = (t = text) => {
    if (!t.trim()) return Alert.alert('Nothing to check', 'Paste a link or the full text message.');
    setResult(scanMessage(t));
  };

  const open = (url: string, level: string) => {
    const go = () => WebBrowser.openBrowserAsync(url.startsWith('http') ? url : `https://${url}`);
    if (level === 'green') return go();
    Alert.alert('This link looks unsafe', 'CiCo recommends not opening it. Open anyway?', [
      { text: 'Don’t open', style: 'cancel' },
      { text: 'Open anyway', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <Screen>
      <Card>
        <Input
          label="Paste a link or text message"
          placeholder="e.g. You won ₱500,000! Claim at…"
          multiline
          value={text}
          onChangeText={(v) => {
            setText(v);
            setResult(null);
          }}
          style={{ minHeight: 100, textAlignVertical: 'top' }}
          autoCapitalize="none"
        />
        <Btn label="Check it" onPress={() => scan()} />
      </Card>

      {result && (
        <>
          <RiskIndicator level={result.level} reasons={result.reasons} />
          {result.urls.map((u) => (
            <Card key={u.url}>
              <Text style={{ color: C.ink, fontWeight: '600' }} numberOfLines={1}>
                {u.url}
              </Text>
              <Btn label={u.result.level === 'green' ? 'Open link' : 'Open anyway…'} variant={u.result.level === 'green' ? 'teal' : 'ghost'} onPress={() => open(u.url, u.result.level)} />
            </Card>
          ))}
          {result.level !== 'green' && <Muted>Delete the message and don&apos;t reply. If you already tapped the link or shared a code, use Emergency freeze on your dashboard.</Muted>}
        </>
      )}

      <H2>Try a sample</H2>
      {SAMPLES.map((sample, i) => (
        <Chip
          key={i}
          label={sample.length > 48 ? sample.slice(0, 48) + '…' : sample}
          active={false}
          onPress={() => {
            setText(sample);
            scan(sample);
          }}
        />
      ))}
    </Screen>
  );
}
