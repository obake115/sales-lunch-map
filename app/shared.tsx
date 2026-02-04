import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

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

export default function SharedMapsScreen() {
  const router = useRouter();
  const { user, loading, error, retrySignIn } = useAuth();
  const [maps, setMaps] = useState<SharedMap[]>([]);
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewInviteVisible, setPreviewInviteVisible] = useState(false);
  const [previewCode, setPreviewCode] = useState('');

  const makePreviewCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 6; i += 1) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  };

  useEffect(() => {
    if (!user) return;
    const unsub = listenMyMaps(user.uid, setMaps);
    return () => unsub();
  }, [user]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        <View style={UI.headerRow}>
          <Pressable onPress={() => router.back()} style={UI.backBtn}>
            <Text style={{ fontWeight: '900' }}>‹</Text>
          </Pressable>
          <Text style={UI.headerTitle}>共有マップ</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={UI.headerSub}>友達や大切な人とランチ候補を共有できます。</Text>

        <View style={UI.heroCard}>
          <Image source={require('@/assets/images/quick-shared.png')} style={UI.heroImage} />
          <Text style={{ fontWeight: '900', fontSize: 16, marginTop: 12 }}>チームと共有できるマップです</Text>
          <Text style={{ color: '#6B7280', marginTop: 6 }}>
            招待コードを使って、みんなとランチ候補を簡単にシェアできます
          </Text>
          {!user ? (
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: '#B91C1C', fontWeight: '800' }}>
                {error ?? 'ログインが必要です。'}
              </Text>
              <Pressable
                onPress={() => retrySignIn()}
                style={{
                  marginTop: 8,
                  ...UI.secondaryBtn,
                  paddingVertical: 10,
                  borderColor: '#E5E5E5',
                }}>
                <Text style={{ color: '#111827', fontWeight: '900' }}>ゲストで続ける</Text>
              </Pressable>
            </View>
          ) : null}
          <Pressable
            disabled={busy}
            onPress={async () => {
              if (!user) {
                const code = makePreviewCode();
                setPreviewCode(code);
                setPreviewInviteVisible(true);
                return;
              }
              try {
                setBusy(true);
                const id = await createMap(user.uid, createName);
                setCreateName('');
                router.push({ pathname: '/shared/[id]', params: { id, showInvite: '1' } });
              } catch (e: any) {
                Alert.alert('作成できませんでした', e?.message ?? 'しばらくしてから再度お試しください。');
              } finally {
                setBusy(false);
              }
            }}
            style={{
              marginTop: 12,
              ...UI.primaryBtn,
              backgroundColor: busy ? '#F8C27A' : UI.primaryBtn.backgroundColor,
            }}>
            <Text style={{ color: 'white', fontWeight: '900' }}>共有マップを作成</Text>
          </Pressable>
        </View>

        <View style={UI.infoRow}>
          <View style={UI.infoDot}>
            <Text style={{ fontWeight: '900', fontSize: 12 }}>i</Text>
          </View>
          <Text style={UI.infoText}>参加できるのは、招待コードを知っている人だけです。</Text>
        </View>

        <View style={{ height: 16 }} />

        <View style={UI.card}>
          <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 8 }}>招待コードで参加</Text>
          <TextInput
            value={joinCode}
            onChangeText={(t) => setJoinCode(t.toUpperCase())}
            autoCapitalize="characters"
            placeholder="例：AB12CD"
            style={UI.input}
          />
          <Pressable
            disabled={busy}
            onPress={async () => {
              if (!user) {
                Alert.alert('ログインが必要です', '参加するにはログインしてください。');
                return;
              }
              try {
                setBusy(true);
                const id = await joinMap(user.uid, joinCode);
                setJoinCode('');
                router.push({ pathname: '/shared/[id]', params: { id } });
              } catch (e: any) {
                Alert.alert('参加できませんでした', e?.message ?? 'しばらくしてから再度お試しください。');
              } finally {
                setBusy(false);
              }
            }}
            style={{
              marginTop: 10,
              ...UI.secondaryBtn,
              paddingVertical: 12,
              borderColor: '#E5E5E5',
            }}>
            <Text style={{ color: '#111827', fontWeight: '900' }}>参加する</Text>
          </Pressable>
        </View>

        <View style={{ gap: 8, marginTop: 12 }}>
          <Text style={{ fontWeight: '900' }}>参加中の共同マップ</Text>
          {!loading && maps.length === 0 && <Text style={{ color: '#6B7280' }}>まだ参加していません。</Text>}
          {maps.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push({ pathname: '/shared/[id]', params: { id: item.id } })}
              style={UI.card}>
              <Text style={{ fontWeight: '900', fontSize: 16 }} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={{ color: '#6B7280', marginTop: 4 }}>招待コード: {item.code}</Text>
              <Text style={{ color: '#6B7280', marginTop: 2 }}>参加者: {item.memberIds.length}人</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <BottomAdBanner />

      <Modal
        visible={previewInviteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewInviteVisible(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.25)',
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
            <Pressable onPress={() => setPreviewInviteVisible(false)} style={{ alignSelf: 'flex-end' }}>
              <Text style={{ fontWeight: '900', fontSize: 18 }}>×</Text>
            </Pressable>

            <Text style={{ fontWeight: '900', fontSize: 16, textAlign: 'center', marginTop: 4 }}>
              招待コードのプレビュー
            </Text>
            <Text style={{ color: '#6B7280', textAlign: 'center', marginTop: 6 }}>
              ログイン後に有効なコードを発行できます
            </Text>

            <View
              style={{
                marginTop: 14,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 14,
                backgroundColor: '#FFF7E6',
                alignItems: 'center',
              }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#B45309' }}>{previewCode || '------'}</Text>
            </View>

            <View style={{ alignItems: 'center', marginTop: 12 }}>
              {previewCode ? (
                <Image
                  source={{
                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      previewCode
                    )}`,
                  }}
                  style={{ width: 140, height: 140 }}
                />
              ) : null}
              <Text style={{ color: '#6B7280', marginTop: 8 }}>QRコードの見た目サンプルです</Text>
            </View>

            <Pressable
              onPress={() => retrySignIn()}
              style={{
                marginTop: 12,
                ...UI.primaryBtn,
                backgroundColor: '#F59E0B',
              }}>
              <Text style={{ color: 'white', fontWeight: '900' }}>ログインで作成する</Text>
            </Pressable>

            <Pressable onPress={() => setPreviewInviteVisible(false)} style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={{ color: '#2563EB', fontWeight: '800' }}>閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
