// Login (Figure 3 / Figure 10): credentials → MPIN or biometric second factor → dashboard.
import * as LocalAuthentication from 'expo-local-authentication';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Btn, C, Card, H2, Input, Muted, Screen, s } from '@/components/wallet-ui';
import type { Account } from '@/lib/types';
import { useWallet } from '@/lib/wallet-store';

export default function LoginScreen() {
  const { validateCredentials, verifySecondFactor, login } = useWallet();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [found, setFound] = useState<Account | null>(null); // account awaiting second factor
  const [mpin, setMpin] = useState('');

  const submit = () => {
    const res = validateCredentials(username, password);
    if (!res.ok) return Alert.alert('Login failed', res.error);
    setFound(res.account);
    if (res.account.biometricEnabled) tryBiometric(res.account);
  };

  const verify = () => {
    if (!found) return;
    const res = verifySecondFactor(found, mpin);
    if (res.ok) login(found);
    else {
      setMpin('');
      Alert.alert('Authentication failed', res.error);
    }
  };

  async function tryBiometric(account: Account) {
    const available = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
    if (!available) return Alert.alert('Biometrics unavailable', 'Use your 6-digit MPIN instead.');
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Log in to CiCo', cancelLabel: 'Use MPIN', disableDeviceFallback: true });
    if (r.success) login(account);
  }

  return (
    <Screen bare>
      <View style={{ marginTop: 40 }}>
        <Text style={{ fontSize: 54, fontWeight: '800', color: C.ink, letterSpacing: -2 }}>CiCo</Text>
        <Text style={{ color: C.mute, marginBottom: 24, fontSize: 16 }}>Your wallet, watched over.</Text>

        {!found ? (
          <>
            <Card>
              <Input placeholder="Username" autoCapitalize="none" autoCorrect={false} value={username} onChangeText={setUsername} />
              <Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={submit} />
              <Btn label="Log in" onPress={submit} />
            </Card>
            <View style={{ alignItems: 'center', gap: 4, marginTop: 8 }}>
              <Muted>Don&apos;t have an account?</Muted>
              <Link href="/register" style={{ color: C.teal, fontWeight: '700', fontSize: 15, paddingVertical: 6 }}>
                Create account
              </Link>
            </View>
            <Card style={{ marginTop: 24, backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line }}>
              <Text style={s.label}>Demo accounts</Text>
              <Muted>Customer: cico / 1234 · MPIN 123456</Muted>
              <Muted>Recipient: juan / 1234 · MPIN 111111</Muted>
              <Muted>Admin: admin / admin123 · MPIN 000000</Muted>
            </Card>
          </>
        ) : (
          <Card>
            <H2>Hi {found.name.split(' ')[0]}, enter your MPIN</H2>
            <Input
              placeholder="6-digit MPIN"
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              value={mpin}
              onChangeText={setMpin}
              onSubmitEditing={verify}
              autoFocus
            />
            <Btn label="Verify" onPress={verify} disabled={mpin.length !== 6} />
            {found.biometricEnabled && <Btn label="Use fingerprint / Face ID" variant="teal" onPress={() => tryBiometric(found)} />}
            <Btn
              label="Back"
              variant="ghost"
              onPress={() => {
                setFound(null);
                setMpin('');
              }}
            />
          </Card>
        )}
      </View>
    </Screen>
  );
}
