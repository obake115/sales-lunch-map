import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';

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
  input: {
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  } as const,
  primaryBtn: {
    backgroundColor: '#2563EB',
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
} as const;

export default function SharedMapsScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [maps, setMaps] = useState<SharedMap[]>([]);
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = listenMyMaps(user.uid, setMaps);
    return () => unsub();
  }, [user]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, paddingBottom: 110, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ flex: 1, ...UI.secondaryBtn, paddingVertical: 12 }}>
            <Text style={{ fontWeight: '800', color: '#111827' }}>戻る</Text>
          </Pressable>
        </View>

        <View style={UI.card}>
          <Text style={{ fontWeight: '900', fontSize: 16, marginBottom: 8 }}>共同マップを作成</Text>
          <TextInput
            value={createName}
            onChangeText={setCreateName}
            placeholder="例：渋谷チーム"
            style={UI.input}
          />
          <Pressable
            disabled={busy || loading}
            onPress={async () => {
              if (!user) return;
              try {
                setBusy(true);
                const id = await createMap(user.uid, createName);
                setCreateName('');
                router.push({ pathname: '/shared/[id]', params: { id } });
              } catch (e: any) {
                Alert.alert('作成できませんでした', e?.message ?? 'しばらくしてから再度お試しください。');
              } finally {
                setBusy(false);
              }
            }}
            style={{
              marginTop: 10,
              ...UI.primaryBtn,
              backgroundColor: busy || loading ? '#9BB8FF' : UI.primaryBtn.backgroundColor,
            }}>
            <Text style={{ color: 'white', fontWeight: '900' }}>作成</Text>
          </Pressable>
        </View>

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
            disabled={busy || loading}
            onPress={async () => {
              if (!user) return;
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
              ...UI.primaryBtn,
              backgroundColor: busy || loading ? '#9BB8FF' : UI.primaryBtn.backgroundColor,
            }}>
            <Text style={{ color: 'white', fontWeight: '900' }}>参加</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, gap: 8 }}>
          <Text style={{ fontWeight: '900' }}>参加中の共同マップ</Text>
          {!loading && maps.length === 0 && <Text style={{ color: '#6B7280' }}>まだ参加していません。</Text>}
          <FlatList
            data={maps}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push({ pathname: '/shared/[id]', params: { id: item.id } })}
                style={UI.card}>
                <Text style={{ fontWeight: '900', fontSize: 16 }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ color: '#6B7280', marginTop: 4 }}>招待コード: {item.code}</Text>
                <Text style={{ color: '#6B7280', marginTop: 2 }}>参加者: {item.memberIds.length}人</Text>
              </Pressable>
            )}
          />
        </View>
      </View>

      <BottomAdBanner />
    </View>
  );
}
