import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native';

import { logLogin } from '@/src/analytics';
import { t } from '@/src/i18n';
import { useAuth } from '@/src/state/AuthContext';
import { setHasSeenWelcome } from '@/src/storage';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

export default function WelcomeScreen() {
  const router = useRouter();
  const { signInWithApple, signInWithGoogle, signInAsGuest, error } = useAuth();
  const [busy, setBusy] = useState(false);
  const prevError = useRef<string | null>(null);

  // error state が変化したら Alert で表示（Firebase エラーコード含む）
  useEffect(() => {
    if (error && error !== prevError.current) {
      Alert.alert(t('auth.loginFailed'), error);
    }
    prevError.current = error;
  }, [error]);

  const finish = async () => {
    await setHasSeenWelcome(true);
    router.replace('/onboarding');
  };

  const handleApple = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const user = await signInWithApple();
      if (user) {
        logLogin({ method: 'apple' });
        await finish();
      }
      // error は state 経由で次の render で Alert 表示（下の useEffect で処理）
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
        await finish();
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
        await finish();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#E9E4DA', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 24, fontFamily: fonts.extraBold, color: '#1F2937', textAlign: 'center', marginBottom: 8 }}>
        {t('auth.welcomeTitle')}
      </Text>
      <Text style={{ color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
        {t('auth.welcomeSubtitle')}
      </Text>

      <NeuCard style={{ padding: 24, gap: 12 }}>
        {busy && (
          <ActivityIndicator style={{ marginBottom: 4 }} />
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
            backgroundColor: '#FFFFFF',
            borderRadius: 28,
            paddingVertical: 14,
            borderWidth: 1,
            borderColor: '#D1D5DB',
            opacity: busy ? 0.5 : 1,
          }}>
          <FontAwesome name="google" size={18} color="#4285F4" />
          <Text style={{ color: '#1F2937', fontFamily: fonts.bold, fontSize: 16 }}>
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
          <Text style={{ color: '#6B7280', fontFamily: fonts.bold, fontSize: 16 }}>
            {t('auth.continueAsGuest')}
          </Text>
        </Pressable>
      </NeuCard>

      <Text style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 20, fontSize: 12, lineHeight: 18 }}>
        {t('auth.guestHint')}
      </Text>
    </View>
  );
}
