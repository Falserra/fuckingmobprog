import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { C } from '@/components/wallet-ui';
import { WalletProvider, useWallet } from '@/lib/wallet-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <WalletProvider>
        <AnimatedSplashOverlay />
        <RootStack />
      </WalletProvider>
    </ThemeProvider>
  );
}

// Guards follow the Master File roles: signed-out → Login/Register,
// Customer → wallet screens, Administrator → admin console.
function RootStack() {
  const { me } = useWallet();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.bg },
        headerTintColor: C.ink,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: C.bg },
      }}>
      <Stack.Protected guard={!me}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ title: 'Create account' }} />
      </Stack.Protected>

      <Stack.Protected guard={me?.role === 'customer'}>
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="transact" options={{ title: 'Money movement' }} />
        <Stack.Screen name="receive" options={{ title: 'Receive money' }} />
        <Stack.Screen name="history" options={{ title: 'Transaction history' }} />
        <Stack.Screen name="subscriptions" options={{ title: 'Subscription Hub' }} />
        <Stack.Screen name="report" options={{ title: 'Report suspicious activity' }} />
        <Stack.Screen name="scan" options={{ title: 'Check a link or SMS' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="settings" options={{ title: 'Security settings' }} />
      </Stack.Protected>

      <Stack.Protected guard={me?.role === 'admin'}>
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
