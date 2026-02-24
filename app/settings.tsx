import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { logAccountLinked } from '@/src/analytics';
import { t } from '@/src/i18n';
import { restorePurchases } from '@/src/purchases';
import { useAuth, type LinkResult } from '@/src/state/AuthContext';
import { useThemeMode } from '@/src/state/ThemeContext';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

export default function SettingsScreen() {
  const router = useRouter();
  const { authMethod, user, linkAccount, signOut, deleteAccount } = useAuth();
  const { themeMode } = useThemeMode();
  const [busy, setBusy] = useState(false);
  const isDark = themeMode === 'navy';
  const textColor = isDark ? '#FFFFFF' : '#1F2937';
  const subColor = isDark ? '#94A3B8' : '#6B7280';

  const handleLink = async (provider: 'apple' | 'google') => {
    if (busy) return;
    setBusy(true);
    try {
      const result: LinkResult = await linkAccount(provider);
      if (result.success) {
        logAccountLinked({ method: provider });
        if (result.uidChanged) {
          router.push('/data-migration');
        } else {
          Alert.alert('', t('auth.linkSuccess'));
        }
      } else if (result.error) {
        Alert.alert('', result.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(t('auth.logout'), t('auth.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await signOut();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('auth.deleteAccount'), t('auth.deleteAccountConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.deleteAccount'),
        style: 'destructive',
        onPress: () => {
          Alert.alert(t('auth.deleteAccount'), t('auth.deleteAccountFinal'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('auth.deleteAccount'),
              style: 'destructive',
              onPress: async () => {
                setBusy(true);
                try {
                  await deleteAccount();
                  Alert.alert('', t('auth.deleteAccountSuccess'));
                } catch {
                  Alert.alert('', t('auth.deleteAccountFailed'));
                } finally {
                  setBusy(false);
                }
              },
            },
          ]);
        },
      },
    ]);
  };

  const handleRestore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await restorePurchases();
      if (result.success) {
        Alert.alert('', t('settings.restoreSuccess'));
      } else {
        Alert.alert('', result.message ?? t('settings.restoreNone'));
      }
    } finally {
      setBusy(false);
    }
  };

  const email = user?.providerData?.[0]?.email;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 16 }}>
      {busy && <ActivityIndicator style={{ marginBottom: 4 }} />}

      {/* Account section */}
      <NeuCard style={{ padding: 20, gap: 12 }}>
        <Text style={{ fontSize: 16, fontFamily: fonts.extraBold, color: textColor }}>
          {t('auth.accountTitle')}
        </Text>

        {authMethod === 'anonymous' ? (
          <>
            <Text style={{ color: subColor, fontFamily: fonts.bold }}>
              {t('auth.statusGuest')}
            </Text>
            <Text style={{ color: subColor, fontSize: 13, lineHeight: 18 }}>
              {t('auth.loginHint')}
            </Text>

            {Platform.OS === 'ios' && (
              <Pressable
                onPress={() => handleLink('apple')}
                disabled={busy}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: '#000000',
                  borderRadius: 24,
                  paddingVertical: 12,
                  opacity: busy ? 0.5 : 1,
                }}>
                <FontAwesome name="apple" size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontFamily: fonts.bold }}>
                  {t('auth.linkApple')}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => handleLink('google')}
              disabled={busy}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: '#FFFFFF',
                borderRadius: 24,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: '#D1D5DB',
                opacity: busy ? 0.5 : 1,
              }}>
              <FontAwesome name="google" size={16} color="#4285F4" />
              <Text style={{ color: '#1F2937', fontFamily: fonts.bold }}>
                {t('auth.linkGoogle')}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ color: subColor, fontFamily: fonts.bold }}>
              {authMethod === 'apple' ? t('auth.statusApple') : t('auth.statusGoogle')}
            </Text>
            {email ? (
              <Text style={{ color: subColor, fontSize: 13 }}>{email}</Text>
            ) : null}
            <Pressable
              onPress={handleSignOut}
              disabled={busy}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 24,
                paddingVertical: 12,
                backgroundColor: isDark ? '#1E293B' : '#F3F4F6',
                opacity: busy ? 0.5 : 1,
              }}>
              <Text style={{ color: '#EF4444', fontFamily: fonts.bold }}>
                {t('auth.logout')}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleDeleteAccount}
              disabled={busy}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 24,
                paddingVertical: 12,
                opacity: busy ? 0.5 : 1,
              }}>
              <Text style={{ color: '#EF4444', fontFamily: fonts.bold, fontSize: 13 }}>
                {t('auth.deleteAccount')}
              </Text>
            </Pressable>
          </>
        )}
      </NeuCard>

      {/* Data backup (logged-in users only) */}
      {authMethod !== 'anonymous' && (
        <NeuCard style={{ padding: 20, gap: 12 }}>
          <Pressable
            onPress={() => router.push('/data-migration')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 8,
            }}>
            <View>
              <Text style={{ color: textColor, fontFamily: fonts.bold }}>
                {t('settings.backupTitle')}
              </Text>
              <Text style={{ color: subColor, fontSize: 12 }}>
                {t('settings.backupManage')}
              </Text>
            </View>
            <FontAwesome name="angle-right" size={18} color={subColor} />
          </Pressable>
        </NeuCard>
      )}

      {/* Restore purchases */}
      <NeuCard style={{ padding: 20, gap: 12 }}>
        <Pressable
          onPress={handleRestore}
          disabled={busy}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 24,
            paddingVertical: 12,
            backgroundColor: isDark ? '#1E293B' : '#F3F4F6',
            opacity: busy ? 0.5 : 1,
          }}>
          <Text style={{ color: textColor, fontFamily: fonts.bold }}>
            {t('settings.restorePurchases')}
          </Text>
        </Pressable>
      </NeuCard>

      {/* Other settings */}
      <NeuCard style={{ padding: 20, gap: 12 }}>
        <Pressable
          onPress={() => router.push('/guide')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 8,
          }}>
          <View>
            <Text style={{ color: textColor, fontFamily: fonts.bold }}>
              {t('profile.settingsHowTo')}
            </Text>
            <Text style={{ color: subColor, fontSize: 12 }}>
              {t('profile.settingsGuide')}
            </Text>
          </View>
          <FontAwesome name="angle-right" size={18} color={subColor} />
        </Pressable>

        <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#D5D0C6' }} />

        <Pressable
          onPress={() => router.push({ pathname: '/onboarding', params: { mode: 'preview' } })}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 8,
          }}>
          <View>
            <Text style={{ color: textColor, fontFamily: fonts.bold }}>
              {t('profile.settingsOnboarding')}
            </Text>
            <Text style={{ color: subColor, fontSize: 12 }}>
              {t('profile.settingsHowToSub')}
            </Text>
          </View>
          <FontAwesome name="angle-right" size={18} color={subColor} />
        </Pressable>

        <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#D5D0C6' }} />

        <Pressable
          onPress={() => router.push('/post-limit-info')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 8,
          }}>
          <View>
            <Text style={{ color: textColor, fontFamily: fonts.bold }}>
              {t('profile.settingsPostLimit')}
            </Text>
            <Text style={{ color: subColor, fontSize: 12 }}>
              {t('profile.settingsPostLimitSub')}
            </Text>
          </View>
          <FontAwesome name="angle-right" size={18} color={subColor} />
        </Pressable>
      </NeuCard>

      {/* Legal */}
      <NeuCard style={{ padding: 20, gap: 12 }}>
        <Pressable
          onPress={() => router.push('/privacy')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 8,
          }}>
          <Text style={{ color: textColor, fontFamily: fonts.bold }}>
            {t('settings.privacyPolicy')}
          </Text>
          <FontAwesome name="angle-right" size={18} color={subColor} />
        </Pressable>

        <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#D5D0C6' }} />

        <Pressable
          onPress={() => router.push('/terms')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 8,
          }}>
          <Text style={{ color: textColor, fontFamily: fonts.bold }}>
            {t('settings.termsOfService')}
          </Text>
          <FontAwesome name="angle-right" size={18} color={subColor} />
        </Pressable>
      </NeuCard>
    </ScrollView>
  );
}
