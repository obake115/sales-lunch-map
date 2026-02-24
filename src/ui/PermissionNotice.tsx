import { useEffect, useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import { fonts } from '@/src/ui/fonts';
import { t } from '@/src/i18n';
import { getPermissionState, requestAllNeededPermissions, type PermissionState } from '../permissions';
import { NeuCard } from './NeuCard';

const UI = {
  card: {
    backgroundColor: '#E9E4DA',
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
  } as const,
  primaryBtn: {
    marginTop: 10,
    backgroundColor: '#4F78FF',
    paddingVertical: 12,
    borderRadius: 28,
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
    <NeuCard style={UI.card}>
      <Text style={{ fontFamily: fonts.extraBold, marginBottom: 6 }}>{t('permissionNotice.title')}</Text>
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
        <Text style={{ color: 'white', fontFamily: fonts.extraBold }}>{t('permissionNotice.allow')}</Text>
      </Pressable>
    </NeuCard>
  );
}

