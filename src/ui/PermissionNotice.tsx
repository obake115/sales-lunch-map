import { useEffect, useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import { t } from '@/src/i18n';
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

  const missingLocation = !state.locationForegroundGranted;
  const missingNotifications = !state.notificationsGranted;
  if (!missingLocation && !missingNotifications) return null;

  const lines: string[] = [];
  if (missingLocation) {
    lines.push(t('permissionNotice.locationMissing'));
  }
  if (missingNotifications) lines.push(t('permissionNotice.notificationsMissing'));

  return (
    <View style={UI.card}>
      <Text style={{ fontWeight: '900', marginBottom: 6 }}>{t('permissionNotice.title')}</Text>
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
        <Text style={{ color: 'white', fontWeight: '900' }}>{t('permissionNotice.allow')}</Text>
      </Pressable>
    </View>
  );
}

