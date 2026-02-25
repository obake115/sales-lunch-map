import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult, scanFromURLAsync } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { logSharedMapCreated, logSharedMapJoined } from '@/src/analytics';
import { t } from '@/src/i18n';
import { createMap, joinMap, listenMyMaps, type SharedMap } from '@/src/sharedMaps';
import { useAuth } from '@/src/state/AuthContext';
import { useThemeColors } from '@/src/state/ThemeContext';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

const UI = {
  card: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#E9E4DA',
  } as const,
  heroCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#E9E4DA',
  } as const,
  heroImage: {
    width: '100%',
    height: 150,
    borderRadius: 14,
  } as const,
  input: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#E9E4DA',
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  primaryBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  secondaryBtn: {
    backgroundColor: '#E9E4DA',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  } as const,
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E9E4DA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: '#111827',
  } as const,
  headerSub: {
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 12,
  } as const,
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  } as const,
  infoDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E9E4DA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
  } as const,
  infoText: {
    color: '#6B7280',
    flex: 1,
  } as const,
} as const;

const INPUT_PROPS = {
  autoCorrect: false,
  spellCheck: false,
  autoCapitalize: 'none' as const,
  autoComplete: 'off' as const,
  keyboardType: 'default' as const,
  blurOnSubmit: false,
};

export default function SharedMapsScreen() {
  const router = useRouter();
  const { code: deepLinkCode } = useLocalSearchParams<{ code?: string }>();
  const { user, loading, signInAsGuest } = useAuth();
  const colors = useThemeColors();
  const [maps, setMaps] = useState<SharedMap[]>([]);
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [qrMode, setQrMode] = useState<'choice' | 'camera'>('choice');
  const [scanned, setScanned] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);
  const authReady = !!user && !loading;
  const canUseShared = authReady && !busy;
  const canRetryAuth = !loading && !user;

  const parseInviteCode = (value: string) => {
    const match = value.toUpperCase().match(/[A-Z0-9]{6}/);
    return match ? match[0] : null;
  };

  const joinByCode = async (code: string) => {
    if (!code) return;
    setBusy(true);
    const currentUser = user ?? (await signInAsGuest());
    if (!currentUser) {
      setBusy(false);
      return;
    }
    try {
      const id = await withTimeout(
        joinMap(currentUser.uid, code),
        8000,
        t('shared.joinTimeout')
      );
      logSharedMapJoined({ method: 'code' });
      setJoinCode('');
      setQrVisible(false);
      setQrMode('choice');
      router.push({ pathname: '/shared/[id]', params: { id } });
    } catch (e: any) {
      Alert.alert(t('shared.joinFailedTitle'), e?.message ?? t('shared.tryLater'));
    } finally {
      setScanned(false);
      setBusy(false);
    }
  };

  const handleLibraryScan = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) {
        Alert.alert(t('shared.scanFailedTitle'), t('shared.scanImageMissing'));
        return;
      }
      const barcodes = await scanFromURLAsync(uri, ['qr']);
      const code = barcodes.length > 0 ? parseInviteCode(barcodes[0].data) : null;
      if (!code) {
        Alert.alert(t('shared.scanFailedTitle'), t('shared.scanCodeMissing'));
        return;
      }
      setJoinCode(code);
      await joinByCode(code);
    } catch {
      Alert.alert(t('shared.scanFailedTitle'), t('common.tryAgain'));
    }
  };

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), ms);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    if (!user) return;
    const unsub = listenMyMaps(user.uid, setMaps);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!deepLinkCode || deepLinkHandled) return;
    const parsed = parseInviteCode(String(deepLinkCode));
    if (!parsed) {
      setDeepLinkHandled(true);
      return;
    }
    if (!authReady) return;
    setDeepLinkHandled(true);
    setJoinCode(parsed);
    joinByCode(parsed);
  }, [deepLinkCode, deepLinkHandled, authReady]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        <View style={UI.headerRow}>
          <Text style={[UI.headerTitle, { color: colors.text }]}>{t('shared.title')}</Text>
        </View>
        <Text style={[UI.headerSub, { color: colors.subText }]}>{t('shared.subtitle')}</Text>

        <NeuCard style={[UI.heroCard, { backgroundColor: colors.card }]}>
          <Image source={require('@/assets/images/shared-hero.png')} style={UI.heroImage} />
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, marginTop: 12, color: colors.text }}>{t('shared.heroTitle')}</Text>
          <Text style={{ color: colors.subText, marginTop: 6 }}>{t('shared.heroBody')}</Text>
          {loading ? (
            <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color="#F59E0B" />
              <Text style={{ color: colors.subText }}>{t('shared.preparing')}</Text>
            </View>
          ) : null}
          {canRetryAuth ? (
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: colors.subText }}>{t('shared.prepareFailed')}</Text>
              <Pressable
                onPress={() => signInAsGuest()}
                style={{
                  marginTop: 8,
                  ...UI.secondaryBtn,
                  backgroundColor: colors.card,
                  shadowColor: colors.shadowDark,
                  paddingVertical: 10,
                }}>
                <Text style={{ color: colors.text, fontFamily: fonts.extraBold }}>{t('shared.retryPrepare')}</Text>
              </Pressable>
            </View>
          ) : null}
          {authReady ? (
            <Pressable
              disabled={!canUseShared}
              onPress={async () => {
                if (!canUseShared) return;
                setBusy(true);
                const currentUser = user ?? (await signInAsGuest());
                if (!currentUser) {
                  setBusy(false);
                  return;
                }
                try {
                  const id = await withTimeout(
                    createMap(currentUser.uid, createName),
                    8000,
                    t('shared.createTimeout')
                  );
                  logSharedMapCreated();
                  setCreateName('');
                  router.push({ pathname: '/shared/[id]', params: { id, showInvite: '1' } });
                } catch (e: any) {
                  Alert.alert(t('shared.createFailedTitle'), e?.message ?? t('shared.tryLater'));
                } finally {
                  setBusy(false);
                }
              }}
              style={{
                marginTop: 12,
                ...UI.primaryBtn,
                backgroundColor: canUseShared ? UI.primaryBtn.backgroundColor : '#F8C27A',
              }}>
              <Text style={{ color: 'white', fontFamily: fonts.extraBold }}>{t('shared.createButton')}</Text>
            </Pressable>
          ) : null}
        </NeuCard>

        {authReady ? (
          <>
            <View style={UI.infoRow}>
              <View style={[UI.infoDot, { backgroundColor: colors.card, shadowColor: colors.shadowDark }]}>
                <Text style={{ fontFamily: fonts.extraBold, fontSize: 12, color: colors.text }}>i</Text>
              </View>
              <Text style={[UI.infoText, { color: colors.subText }]}>{t('shared.infoOnlyInvite')}</Text>
            </View>

            <View style={{ height: 16 }} />

            <NeuCard style={[UI.card, { backgroundColor: colors.card }]}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, marginBottom: 8, color: colors.text }}>{t('shared.joinByCode')}</Text>
              <TextInput
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase())}
                {...INPUT_PROPS}
                autoCapitalize="characters"
                placeholder={t('shared.codePlaceholder')}
                style={[UI.input, { backgroundColor: colors.inputBg, shadowColor: colors.shadowDark }]}
              />
              <Pressable
                onPress={() => {
                  setScanned(false);
                  setQrVisible(true);
                  setQrMode('choice');
                }}
                style={{
                  marginTop: 10,
                  ...UI.secondaryBtn,
                  backgroundColor: colors.card,
                  shadowColor: colors.shadowDark,
                  paddingVertical: 10,
                }}>
                <Text style={{ color: colors.text, fontFamily: fonts.extraBold }}>{t('shared.joinByQr')}</Text>
              </Pressable>
              <Pressable
                disabled={!canUseShared}
                onPress={async () => {
                  if (!canUseShared) return;
                  setBusy(true);
                  const currentUser = user ?? (await signInAsGuest());
                  if (!currentUser) {
                    setBusy(false);
                    return;
                  }
                  try {
                    const id = await withTimeout(
                      joinMap(currentUser.uid, joinCode),
                      8000,
                      t('shared.joinTimeout')
                    );
                    logSharedMapJoined({ method: 'manual_code' });
                    setJoinCode('');
                    router.push({ pathname: '/shared/[id]', params: { id } });
                  } catch (e: any) {
                    Alert.alert(t('shared.joinFailedTitle'), e?.message ?? t('shared.tryLater'));
                  } finally {
                    setBusy(false);
                  }
                }}
                style={{
                  marginTop: 10,
                  ...UI.secondaryBtn,
                  backgroundColor: colors.card,
                  shadowColor: colors.shadowDark,
                  paddingVertical: 12,
                }}>
                <Text style={{ color: colors.text, fontFamily: fonts.extraBold }}>{t('shared.joinButton')}</Text>
              </Pressable>
            </NeuCard>
          </>
        ) : null}

        <View style={{ gap: 8, marginTop: 12 }}>
          <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>{t('shared.myMaps')}</Text>
          {!loading && maps.length === 0 && <Text style={{ color: colors.subText }}>{t('shared.empty')}</Text>}
          {maps.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push({ pathname: '/shared/[id]', params: { id: item.id } })}>
              <NeuCard style={[UI.card, { backgroundColor: colors.card }]}>
                <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, color: colors.text }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ color: colors.subText, marginTop: 4 }}>
                  {t('shared.inviteCodeLabel')} {item.code}
                </Text>
                <Text style={{ color: colors.subText, marginTop: 2 }}>
                  {t('shared.membersLabel', { count: item.memberIds.length })}
                </Text>
              </NeuCard>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <BottomAdBanner />

      <Modal visible={qrVisible} transparent animationType="fade" onRequestClose={() => setQrVisible(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}>
          <NeuCard
            style={{
              width: '100%',
              borderRadius: 20,
              backgroundColor: colors.card,
              padding: 16,
            }}>
            <Text style={{ fontFamily: fonts.extraBold, fontSize: 16, textAlign: 'center', marginBottom: 10, color: colors.text }}>
              {t('shared.scanTitle')}
            </Text>

            {qrMode === 'choice' ? (
              <View style={{ gap: 10 }}>
                <Pressable
                  onPress={() => {
                    setQrMode('camera');
                    setScanned(false);
                    if (!cameraPermission?.granted) {
                      requestCameraPermission();
                    }
                  }}
                  style={{ ...UI.primaryBtn, backgroundColor: '#F59E0B', paddingVertical: 10 }}>
                  <Text style={{ color: 'white', fontFamily: fonts.extraBold }}>{t('shared.scanWithCamera')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleLibraryScan}
                  style={{ ...UI.secondaryBtn, backgroundColor: colors.card, shadowColor: colors.shadowDark, paddingVertical: 10 }}>
                  <Text style={{ color: colors.text, fontFamily: fonts.extraBold }}>{t('shared.scanWithPhoto')}</Text>
                </Pressable>
              </View>
            ) : !cameraPermission?.granted ? (
              <View style={{ gap: 8, alignItems: 'center' }}>
                <Text style={{ color: colors.subText, textAlign: 'center' }}>
                  {t('shared.cameraPermission')}
                </Text>
                <Pressable
                  onPress={() => requestCameraPermission()}
                  style={{ ...UI.primaryBtn, backgroundColor: '#F59E0B', paddingVertical: 10, paddingHorizontal: 16 }}>
                  <Text style={{ color: 'white', fontFamily: fonts.extraBold }}>{t('shared.allowCamera')}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ width: '100%', height: 280, borderRadius: 12, overflow: 'hidden' }}>
                <CameraView
                  facing="back"
                  style={{ flex: 1 }}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={(result: BarcodeScanningResult) => {
                    if (scanned) return;
                    setScanned(true);
                    const code = parseInviteCode(result.data);
                    if (!code) {
                      Alert.alert(t('shared.scanFailedTitle'), t('shared.scanCodeMissing'));
                      setScanned(false);
                      return;
                    }
                    setJoinCode(code);
                    joinByCode(code);
                  }}
                />
              </View>
            )}

            <Pressable onPress={() => setQrVisible(false)} style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={{ color: '#4F78FF', fontFamily: fonts.extraBold }}>{t('common.close')}</Text>
            </Pressable>
          </NeuCard>
        </View>
      </Modal>
    </View>
  );
}
