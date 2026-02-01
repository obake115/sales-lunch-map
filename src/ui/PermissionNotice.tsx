import { useEffect, useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import Constants from 'expo-constants';
import { getPermissionState, requestAllNeededPermissions, type PermissionState } from '../permissions';

const UI = {
  card: {
    borderWidth: 1,
    borderColor: '#E7E2D5',
    backgroundColor: '#FFFEF8',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  } as const,
  primaryBtn: {
    marginTop: 10,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  } as const,
} as const;

export function PermissionNotice() {
  const [state, setState] = useState<PermissionState | null>(null);

  useEffect(() => {
    getPermissionState().then(setState);
  }, []);

  if (!state) return null;

  const isExpoGo = Constants.appOwnership === 'expo';
  const missingLocation = isExpoGo ? !state.locationForegroundGranted : !state.locationBackgroundGranted;
  const missingNotifications = !state.notificationsGranted;
  if (!missingLocation && !missingNotifications) return null;

  const lines: string[] = [];
  if (missingLocation) {
    lines.push(
      isExpoGo
        ? '位置情報（使用中の許可）がないため、現在地取得ができません。'
        : '位置情報（常に許可）がないため、近づいた通知が動きません。'
    );
    if (isExpoGo) {
      lines.push('※「近づいた通知（バックグラウンド）」はDevelopment Buildで有効になります。');
    }
  }
  if (missingNotifications) lines.push('通知が許可されていないため、リマインドを表示できません。');

  return (
    <View style={UI.card}>
      <Text style={{ fontWeight: '900', marginBottom: 6 }}>権限が必要です</Text>
      {lines.map((t) => (
        <Text key={t} style={{ color: '#374151', marginBottom: 4 }}>
          {t}
        </Text>
      ))}
      <Pressable
        onPress={async () => {
          const next = await requestAllNeededPermissions();
          setState(next);
        }}
        style={UI.primaryBtn}>
        <Text style={{ color: 'white', fontWeight: '900' }}>許可する</Text>
      </Pressable>
    </View>
  );
}

