import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Btn, Card, Input, Muted, Screen } from '@/components/wallet-ui';
import { useWallet } from '@/lib/wallet-store';

export default function RegisterScreen() {
  const { register } = useWallet();
  const [f, setF] = useState({ name: '', username: '', password: '', confirm: '', mpin: '' });
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  const submit = () => {
    const username = f.username.trim().toLowerCase();
    if (!f.name.trim() || !username) return Alert.alert('Missing details', 'Enter your full name and a username.');
    if (!/^[a-z0-9_.]{3,20}$/.test(username)) return Alert.alert('Invalid username', 'Use 3–20 letters, numbers, dots or underscores.');
    if (f.password.length < 6) return Alert.alert('Password too short', 'Use at least 6 characters.');
    if (f.password !== f.confirm) return Alert.alert('Passwords do not match', 'Re-enter the same password in both fields.');
    if (!/^\d{6}$/.test(f.mpin)) return Alert.alert('Invalid MPIN', 'Your MPIN must be exactly 6 digits.');
    const res = register({ name: f.name, username, password: f.password, mpin: f.mpin });
    if (!res.ok) return Alert.alert('Could not create account', res.error);
    Alert.alert('Account created', 'You can now log in.');
    router.back();
  };

  return (
    <Screen>
      <Card>
        <Input label="Full name" placeholder="Juan Dela Cruz" value={f.name} onChangeText={set('name')} />
        <Input label="Username" placeholder="juandc" autoCapitalize="none" autoCorrect={false} value={f.username} onChangeText={set('username')} />
        <Input label="Password" placeholder="6+ characters" secureTextEntry value={f.password} onChangeText={set('password')} />
        <Input label="Confirm password" secureTextEntry value={f.confirm} onChangeText={set('confirm')} />
        <Input label="MPIN" placeholder="6 digits" secureTextEntry keyboardType="number-pad" maxLength={6} value={f.mpin} onChangeText={set('mpin')} />
        <Btn label="Create account" onPress={submit} />
      </Card>
      <Muted>Your MPIN approves logins and payments. Never share it — CiCo staff will never ask for it.</Muted>
    </Screen>
  );
}
