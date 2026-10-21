import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { C, Card, Empty, Muted, Screen, formatDate } from '@/components/wallet-ui';
import { useWallet } from '@/lib/wallet-store';

const ICON = { info: 'ℹ️', success: '✅', warning: '⚠️', security: '🛡️' } as const;

export default function NotificationsScreen() {
  const { notifications, markAllRead } = useWallet();
  // Show unread dots while the screen is open; mark everything read when leaving.
  useEffect(() => () => {
    markAllRead();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen>
      {notifications.length === 0 ? (
        <Empty text="You're all caught up." />
      ) : (
        notifications.map((n) => (
          <Card key={n.id} style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={{ fontSize: 20 }}>{ICON[n.kind]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.ink, fontWeight: n.read ? '400' : '700' }}>{n.message}</Text>
              <Muted>{formatDate(n.timestamp)}</Muted>
            </View>
            {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.teal, marginTop: 6 }} />}
          </Card>
        ))
      )}
    </Screen>
  );
}
