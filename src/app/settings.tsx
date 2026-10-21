// Security settings: biometric login (FR-01) and the screen-sharing demo switch.
import * as LocalAuthentication from 'expo-local-authentication';
import { useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';

import { C, Card, H2, Muted, Screen } from '@/components/wallet-ui';
import { isSimulatedScreenSharing, setSimulatedScreenSharing } from '@/lib/security-layer';
import { useMe, useWallet } from '@/lib/wallet-store';

export default function SettingsScreen() {
  const me = useMe();
  const { setBiometric } = useWallet();
  const [sharing, setSharing] = useState(isSimulatedScreenSharing());

  const toggleBiometric = async (on: boolean) => {
    if (!on) return setBiometric(false);
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = hasHardware && (await LocalAuthentication.isEnrolledAsync());
    if (!enrolled) return Alert.alert('Biometrics not set up', 'Add a fingerprint or Face ID in your phone settings first.');
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm to enable biometric login' });
    if (r.success) setBiometric(true);
  };

  const toggleSharing = (on: boolean) => {
    setSimulatedScreenSharing(on);
    setSharing(on);
  };

  return (
    <Screen>
      <Card>
        <Row title="Fingerprint / Face ID login" value={me.biometricEnabled} onChange={toggleBiometric} />
        <Muted>Log in with biometrics instead of typing your MPIN. Your MPIN still works as a fallback.</Muted>
      </Card>

      <H2>Demo</H2>
      <Card>
        <Row title="Simulate screen sharing" value={sharing} onChange={toggleSharing} />
        <Muted>
          Phones don&apos;t let apps see when another app is sharing the screen, so this switch stands in for the detector. Turn it on, then send money to see the
          masked OTP flow. The OTP screen always blocks screenshots and recordings.
        </Muted>
      </Card>
    </Screen>
  );
}

function Row({ title, value, onChange }: { title: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text style={{ color: C.ink, fontWeight: '600', fontSize: 16, flex: 1 }}>{title}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.teal }} />
    </View>
  );
}
