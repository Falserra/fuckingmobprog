// Receive Money: share your CiCo username. Incoming transfers appear in history.
import { Share, Text, View } from 'react-native';

import { Btn, C, Card, Muted, Screen, VerifiedBadge } from '@/components/wallet-ui';
import { useMe } from '@/lib/wallet-store';

export default function ReceiveScreen() {
  const me = useMe();
  return (
    <Screen>
      <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
        <Muted>Ask the sender to pay this CiCo account</Muted>
        <Text style={{ fontSize: 30, fontWeight: '800', color: C.ink, marginTop: 10 }}>@{me.username}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <Text style={{ color: C.ink, fontWeight: '600' }}>{me.name}</Text>
          <VerifiedBadge verified={me.verified} />
        </View>
        <View style={{ alignSelf: 'stretch', marginTop: 20 }}>
          <Btn label="Share my details" onPress={() => Share.share({ message: `Send money to my CiCo wallet: @${me.username} (${me.name})` })} />
        </View>
      </Card>
      <Muted>
        Senders will see your name{me.verified ? ' and a verified badge' : ''} before confirming, so they know the money is going to the right person. You never need to share your MPIN or OTP to receive money.
      </Muted>
    </Screen>
  );
}
