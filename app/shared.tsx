import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult, scanFromURLAsync } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { t } from '@/src/i18n';
import { createMap, joinMap, listenMyMaps, type SharedMap } from '@/src/sharedMaps';
import { useAuth } from '@/src/state/AuthContext';
import { BottomAdBanner } from '@/src/ui/AdBanner';

const UI = {
  card: {
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FFFEF8',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  } as const,
  heroCard: {
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#FFFEF8',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  } as const,
  heroImage: {
    width: '100%',
    height: 150,
    borderRadius: 14,
  } as const,
  input: {
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  } as const,
  primaryBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '900',
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
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
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
  const { user, loading, retrySignIn } = useAuth();
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
    const currentUser = user ?? (await retrySignIn());
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
          <Pressable onPress={() => router.back()} style={UI.backBtn}>
            <Text style={{ fontWeight: '900' }}>‹</Text>
          </Pressable>
          <Text style={UI.headerTitle}>{t('shared.title')}</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={UI.headerSub}>{t('shared.subtitle')}</Text>

        <View style={UI.heroCard}>
          <Image source={require('@/assets/images/shared-hero.png')} style={UI.heroImage} />
          <Text style={{ fontWeight: '900', fontSize: 16, marginTop: 12 }}>{t('shared.heroTitle')}</Text>
          <Text style={{ color: '#6B7280', marginTop: 6 }}>{t('shared.heroBody')}</Text>
          {loading ? (
            <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color="#F59E0B" />
              <Text style={{ color: '#6B7280' }}>{t('shared.preparing')}</Text>
            </View>
          ) : null}
          {canRetryAuth ? (
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: '#6B7280' }}>{t('shared.prepareFailed')}</Text>
              <Pressable
                onPress={() => retrySignIn()}
                style={{
                  marginTop: 8,
                  ...UI.secondaryBtn,
                  paddingVertical: 10,
                  borderColor: '#E5E5E5',
                }}>
                <Text style={{ color: '#111827', fontWeight: '900' }}>{t('shared.retryPrepare')}</Text>
              </Pressable>
            </View>
          ) : null}
          {authReady ? (
            <Pressable
              disabled={!canUseShared}
              onPress={async () => {
                if (!canUseShared) return;
                setBusy(true);
                const currentUser = user ?? (await retrySignIn());
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
              <Text style={{ color: 'white', fontWeight: '900' }}>{t('shared.createButton')}</Text>
            </Pressable>
          ) : null}
        </View>

        {authReady ? (
          <>
            <View style={UI.infoRow}>
              <View style={UI.infoDot}>
                <Text style={{ fontWeight: '900', fontSize: 12 }}>i</Text>
              </View>
              <Text style={UI.infoText}>{t('shared.infoOnlyInvite')}</Text>
            </View>

            <View style={{ height: 16 }} />

            <View style={UI.card}>
              <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 8 }}>{t('shared.joinByCode')}</Text>
              <TextInput
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase())}
                {...INPUT_PROPS}
                autoCapitalize="characters"
                placeholder={t('shared.codePlaceholder')}
                style={UI.input}
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
                  paddingVertical: 10,
                  borderColor: '#E5E5E5',
                }}>
                <Text style={{ color: '#111827', fontWeight: '900' }}>{t('shared.joinByQr')}</Text>
              </Pressable>
              <Pressable
                disabled={!canUseShared}
                onPress={async () => {
                  if (!canUseShared) return;
                  setBusy(true);
                  const currentUser = user ?? (await retrySignIn());
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
                  paddingVertical: 12,
                  borderColor: canUseShared ? '#E5E5E5' : '#E5E7EB',
                }}>
                <Text style={{ color: '#111827', fontWeight: '900' }}>{t('shared.joinButton')}</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        <View style={{ gap: 8, marginTop: 12 }}>
          <Text style={{ fontWeight: '900' }}>{t('shared.myMaps')}</Text>
          {!loading && maps.length === 0 && <Text style={{ color: '#6B7280' }}>{t('shared.empty')}</Text>}
          {maps.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push({ pathname: '/shared/[id]', params: { id: item.id } })}
              style={UI.card}>
              <Text style={{ fontWeight: '900', fontSize: 16 }} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={{ color: '#6B7280', marginTop: 4 }}>
                {t('shared.inviteCodeLabel')} {item.code}
              </Text>
              <Text style={{ color: '#6B7280', marginTop: 2 }}>
                {t('shared.membersLabel', { count: item.memberIds.length })}
              </Text>
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
          <View
            style={{
              width: '100%',
              borderRadius: 18,
              backgroundColor: '#FFFEF8',
              padding: 16,
              borderWidth: 1,
              borderColor: '#E7E2D5',
            }}>
            <Text style={{ fontWeight: '900', fontSize: 16, textAlign: 'center', marginBottom: 10 }}>
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
                  <Text style={{ color: 'white', fontWeight: '900' }}>{t('shared.scanWithCamera')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleLibraryScan}
                  style={{ ...UI.secondaryBtn, paddingVertical: 10, borderColor: '#E5E5E5' }}>
                  <Text style={{ color: '#111827', fontWeight: '900' }}>{t('shared.scanWithPhoto')}</Text>
                </Pressable>
              </View>
            ) : !cameraPermission?.granted ? (
              <View style={{ gap: 8, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280', textAlign: 'center' }}>
                  {t('shared.cameraPermission')}
                </Text>
                <Pressable
                  onPress={() => requestCameraPermission()}
                  style={{ ...UI.primaryBtn, backgroundColor: '#F59E0B', paddingVertical: 10, paddingHorizontal: 16 }}>
                  <Text style={{ color: 'white', fontWeight: '900' }}>{t('shared.allowCamera')}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ width: '100%', height: 280, borderRadius: 12, overflow: 'hidden' }}>
                <CameraView
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
              <Text style={{ color: '#2563EB', fontWeight: '800' }}>{t('common.close')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
