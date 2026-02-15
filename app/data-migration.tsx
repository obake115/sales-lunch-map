import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { t } from '@/src/i18n';
import { restorePurchases } from '@/src/purchases';
import { useAuth } from '@/src/state/AuthContext';
import { getStoreCount } from '@/src/storage';
import { downloadAllData, getCloudDataCounts, uploadAllData } from '@/src/sync/firestoreSync';
import { useThemeColors } from '@/src/state/ThemeContext';
import { NeuCard } from '@/src/ui/NeuCard';

export default function DataMigrationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [localCount, setLocalCount] = useState<number | null>(null);
  const [cloudCount, setCloudCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const local = await getStoreCount();
        setLocalCount(local);
      } catch {}
      if (user) {
        try {
          const cloud = await getCloudDataCounts(user.uid);
          setCloudCount(cloud.places);
        } catch {}
      }
    })();
  }, [user]);

  const handleUpload = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await uploadAllData(user.uid);
      Alert.alert('', t('migration.success'), [
        { text: t('common.ok'), onPress: () => router.replace('/') },
      ]);
    } catch {
      Alert.alert('', t('migration.failed'));
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await downloadAllData(user.uid);
      await restorePurchases();
      Alert.alert('', t('migration.success'), [
        { text: t('common.ok'), onPress: () => router.replace('/') },
      ]);
    } catch {
      Alert.alert('', t('migration.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 8 }}>
        {t('migration.title')}
      </Text>
      <Text style={{ color: colors.subText, textAlign: 'center', marginBottom: 12, lineHeight: 20 }}>
        {t('migration.body')}
      </Text>

      {(localCount !== null || cloudCount !== null) && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 28 }}>
          {localCount !== null && (
            <Text style={{ color: colors.subText, fontSize: 13, fontWeight: '600' }}>
              {t('migration.localCount', { count: localCount })}
            </Text>
          )}
          {cloudCount !== null && (
            <Text style={{ color: colors.subText, fontSize: 13, fontWeight: '600' }}>
              {t('migration.cloudCount', { count: cloudCount })}
            </Text>
          )}
        </View>
      )}

      {busy && <ActivityIndicator style={{ marginBottom: 12 }} />}

      <NeuCard style={{ padding: 20, gap: 16 }}>
        <Pressable
          onPress={handleUpload}
          disabled={busy}
          style={{
            backgroundColor: '#FFA726',
            borderRadius: 24,
            paddingVertical: 14,
            alignItems: 'center',
            opacity: busy ? 0.5 : 1,
          }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
            {t('migration.uploadChoice')}
          </Text>
          <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 2 }}>
            {t('migration.uploadHint')}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleRestore}
          disabled={busy}
          style={{
            backgroundColor: colors.chipBg,
            borderRadius: 24,
            paddingVertical: 14,
            alignItems: 'center',
            opacity: busy ? 0.5 : 1,
          }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
            {t('migration.restoreChoice')}
          </Text>
        </Pressable>
      </NeuCard>
    </View>
  );
}
