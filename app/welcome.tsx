import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, Text, View } from 'react-native';

import { logLogin } from '@/src/analytics';
import { t } from '@/src/i18n';
import { restorePurchases } from '@/src/purchases';
import { useAuth } from '@/src/state/AuthContext';
import { useThemeColors } from '@/src/state/ThemeContext';
import { setHasSeenOnboarding, setHasSeenWelcome } from '@/src/storage';
import { checkCloudDataExists, downloadAllData } from '@/src/sync/firestoreSync';
import type { PhotoSyncProgress } from '@/src/sync/storageSync';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';
import type { User } from 'firebase/auth';

export default function WelcomeScreen() {
  const router = useRouter();
  const { signInWithApple, signInWithGoogle, signInAsGuest, error } = useAuth();
  const colors = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const prevError = useRef<string | null>(null);

  // error state が変化したら Alert で表示（Firebase エラーコード含む）
  useEffect(() => {
    if (error && error !== prevError.current) {
      Alert.alert(t('auth.loginFailed'), error);
    }
    prevError.current = error;
  }, [error]);

  const handleProgress = (p: PhotoSyncProgress) => {
    setRestoreStatus(t('auth.restoringPhotos', { current: p.current, total: p.total }));
  };

  const finish = async (user: User) => {
    await setHasSeenWelcome(true);
    // 既存アカウントにクラウドデータがあれば自動復元
    if (!user.isAnonymous) {
      try {
        // Firestore が応答しない場合に備え 10 秒でタイムアウト
        const hasCloud = await Promise.race([
          checkCloudDataExists(user.uid),
          new Promise<false>((resolve) => setTimeout(() => resolve(false), 10_000)),
        ]);
        if (hasCloud) {
          setRestoreStatus(t('auth.restoringData'));
          await downloadAllData(user.uid, handleProgress);
          // downloadAllData の clearAllLocalData でフラグが消えるので再設定
          await setHasSeenWelcome(true);
          await setHasSeenOnboarding(true);
          // IAP状態も復元
          await restorePurchases().catch(() => {});
          setRestoreStatus(null);
          router.replace('/');
          return;
        }
      } catch (e) {
        console.error('[Welcome] auto-restore failed:', e);
        setRestoreStatus(null);
        // 復元失敗時はdata-migrationへフォールバック
        router.replace('/data-migration');
        return;
      }
    }
    router.replace('/onboarding');
  };

  const handleApple = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const user = await signInWithApple();
      if (user) {
        logLogin({ method: 'apple' });
        await finish(user);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        logLogin({ method: 'google' });
        await finish(user);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGuest = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const user = await signInAsGuest();
      if (user) {
        logLogin({ method: 'guest' });
        await finish(user);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 24, fontFamily: fonts.extraBold, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
        {t('auth.welcomeTitle')}
      </Text>
      <Text style={{ color: colors.subText, textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
        {t('auth.welcomeSubtitle')}
      </Text>

      <NeuCard style={{ padding: 24, gap: 12 }}>
        {busy && (
          <View style={{ alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <ActivityIndicator />
            {restoreStatus && (
              <Text style={{ color: colors.subText, fontSize: 13, fontFamily: fonts.bold, textAlign: 'center' }}>
                {restoreStatus}
              </Text>
            )}
          </View>
        )}

        {Platform.OS === 'ios' && (
          <Pressable
            onPress={handleApple}
            disabled={busy}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: '#000000',
              borderRadius: 28,
              paddingVertical: 14,
              opacity: busy ? 0.5 : 1,
            }}>
            <FontAwesome name="apple" size={20} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 16 }}>
              {t('auth.continueWithApple')}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleGoogle}
          disabled={busy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: colors.card,
            borderRadius: 28,
            paddingVertical: 14,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: busy ? 0.5 : 1,
          }}>
          <FontAwesome name="google" size={18} color="#4285F4" />
          <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 16 }}>
            {t('auth.continueWithGoogle')}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleGuest}
          disabled={busy}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 28,
            paddingVertical: 14,
            opacity: busy ? 0.5 : 1,
          }}>
          <Text style={{ color: colors.subText, fontFamily: fonts.bold, fontSize: 16 }}>
            {t('auth.continueAsGuest')}
          </Text>
        </Pressable>
      </NeuCard>

      <Text style={{ color: colors.subText, textAlign: 'center', marginTop: 20, fontSize: 12, lineHeight: 18 }}>
        {t('auth.guestHint')}
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, gap: 4 }}>
        <Pressable onPress={() => router.push('/privacy')} hitSlop={8}>
          <Text style={{ color: colors.subText, fontSize: 11, textDecorationLine: 'underline' }}>
            {t('settings.privacyPolicy')}
          </Text>
        </Pressable>
        <Text style={{ color: colors.border, fontSize: 11 }}>|</Text>
        <Pressable onPress={() => router.push('/terms')} hitSlop={8}>
          <Text style={{ color: colors.subText, fontSize: 11, textDecorationLine: 'underline' }}>
            {t('settings.termsOfService')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
