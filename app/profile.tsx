import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { getAchievedBadges, getNextBadge } from '@/src/domain/badges';
import { useStores } from '@/src/state/StoresContext';
import { useThemeMode } from '@/src/state/ThemeContext';
import {
    getLoginBonusState,
    getNearbyShownCount,
    getProfileAvatarUri,
    getSelectedBadgeId,
    setProfileAvatarUri,
    setSelectedBadgeId,
    type LoginBonusState,
} from '@/src/storage';
import { BottomAdBanner } from '@/src/ui/AdBanner';

const UI = {
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.2,
  } as const,
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
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  } as const,
  statLabel: {
    color: '#6B7280',
    fontWeight: '600',
  } as const,
  statValue: {
    color: '#111827',
    fontWeight: '900',
  } as const,
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDE68A',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  } as const,
  badgeText: {
    fontWeight: '800',
    color: '#92400E',
  } as const,
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  } as const,
  styleText: {
    fontWeight: '800',
    color: '#111827',
  } as const,
  styleSub: {
    color: '#6B7280',
  } as const,
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  } as const,
  themeBtn: {
    borderWidth: 1,
    borderColor: '#E7E2D5',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  } as const,
  themeBtnActive: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  } as const,
  themeBtnText: {
    fontWeight: '800',
    color: '#111827',
  } as const,
  profileAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  } as const,
  profileAvatarText: {
    fontWeight: '800',
    color: '#92400E',
  } as const,
  profileAvatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
  } as const,
  profileAvatarHint: {
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 8,
  } as const,
  profileName: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 16,
    color: '#111827',
  } as const,
  profileSubtitle: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 10,
  } as const,
  profileStats: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    marginTop: 8,
    paddingTop: 10,
    gap: 6,
  } as const,
  profileStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  } as const,
  profileBadge: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    backgroundColor: '#FDF4FF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  } as const,
  profileBadgeText: {
    color: '#7C3AED',
    fontWeight: '800',
  } as const,
  profileSaveBtn: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    alignItems: 'center',
  } as const,
  profileSaveText: {
    color: '#111827',
    fontWeight: '700',
  } as const,
} as const;

function requirementText(
  badge: ReturnType<typeof getNextBadge>,
  stats: { storesCount: number; favoritesCount: number; nearbyShownCount: number; totalLoginDays: number; loginStreak: number }
) {
  if (!badge) return '全ての称号を達成しました！';
  if (badge.minStores) return `あと${Math.max(0, badge.minStores - stats.storesCount)}店舗登録で「${badge.label}」`;
  if (badge.minFavorites) return `あと${Math.max(0, badge.minFavorites - stats.favoritesCount)}件で「${badge.label}」`;
  if (badge.minNearbyShown)
    return `あと${Math.max(0, badge.minNearbyShown - stats.nearbyShownCount)}回で「${badge.label}」`;
  if (badge.minLoginDays)
    return `あと${Math.max(0, badge.minLoginDays - stats.totalLoginDays)}日ログインで「${badge.label}」`;
  if (badge.minStreak) return `連続${Math.max(0, badge.minStreak - stats.loginStreak)}日ログインで「${badge.label}」`;
  return `次の称号: ${badge.label}`;
}

function usageStyle(stats: { storesCount: number; favoritesCount: number; nearbyShownCount: number }) {
  if (stats.favoritesCount >= 5) {
    return { title: 'こだわり派', description: '次回候補をしっかり決めるタイプ' };
  }
  if (stats.storesCount >= 10) {
    return { title: '開拓派', description: '新しいランチ候補をどんどん増やすタイプ' };
  }
  if (stats.nearbyShownCount >= 5) {
    return { title: '近場派', description: '近くの候補をまず試したいタイプ' };
  }
  return { title: '気まま派', description: 'その日の気分で選ぶタイプ' };
}

export default function ProfileScreen() {
  const { stores, loading } = useStores();
  const { themeMode, setThemeMode } = useThemeMode();
  const [loginState, setLoginState] = useState<LoginBonusState | null>(null);
  const [nearbyShownCount, setNearbyShownCount] = useState(0);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [selectedBadgeId, setSelectedBadgeIdState] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (loading) return;
    (async () => {
      const [bonus, nearbyShown] = await Promise.all([getLoginBonusState(), getNearbyShownCount()]);
      if (!mounted) return;
      setLoginState(bonus);
      setNearbyShownCount(nearbyShown);
    })();
    return () => {
      mounted = false;
    };
  }, [loading, stores.length]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const uri = await getProfileAvatarUri();
      if (mounted) setAvatarUri(uri);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const storedId = await getSelectedBadgeId();
      if (mounted) setSelectedBadgeIdState(storedId);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(
    () => ({
      storesCount: stores.length,
      favoritesCount: stores.filter((s) => s.isFavorite).length,
      nearbyShownCount,
      totalLoginDays: loginState?.totalDays ?? 0,
      loginStreak: loginState?.streak ?? 0,
    }),
    [stores, loginState?.totalDays, loginState?.streak, nearbyShownCount]
  );

  const achievedBadges = getAchievedBadges(stats).slice(0, 3);
  const nextBadge = getNextBadge(stats);
  const style = usageStyle(stats);
  const selectedBadge = useMemo(() => {
    if (!selectedBadgeId) return null;
    return getAchievedBadges(stats).find((badge) => badge.id === selectedBadgeId) ?? null;
  }, [selectedBadgeId, stats]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={{ marginBottom: 14 }}>
          <Text style={UI.headerTitle}>プロフィール</Text>
        </View>

        <View style={{ ...UI.card, marginBottom: 16 }}>
          <Pressable
            onPress={async () => {
              const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!permission.granted) {
                Alert.alert('写真へのアクセスが必要です', 'プロフィール写真を変更するために許可してください。');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (result.canceled) return;
              const uri = result.assets?.[0]?.uri;
              if (!uri) return;
              setAvatarUri(uri);
              await setProfileAvatarUri(uri);
            }}
            style={UI.profileAvatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={UI.profileAvatarImage} />
            ) : (
              <Text style={UI.profileAvatarText}>T.K.</Text>
            )}
          </Pressable>
          <Text style={UI.profileAvatarHint}>写真を変更</Text>
          <Text style={UI.profileName}>T.K.</Text>

          <View style={UI.profileStats}>
            <View style={UI.profileStatRow}>
              <Text style={UI.statLabel}>参考になった</Text>
              <Text style={UI.statValue}>{nearbyShownCount}回</Text>
            </View>
            <View style={UI.profileStatRow}>
              <Text style={UI.statLabel}>登録したお店</Text>
              <Text style={UI.statValue}>{stores.length}件</Text>
            </View>
            <View style={UI.profileStatRow}>
              <Text style={UI.statLabel}>次回候補</Text>
              <Text style={UI.statValue}>{stats.favoritesCount}件</Text>
            </View>
          </View>

          <Pressable
            onPress={() => {
              const choices = getAchievedBadges(stats);
              if (choices.length === 0) {
                Alert.alert('称号がありません', '条件を満たすと称号を選択できます。');
                return;
              }
              Alert.alert(
                '称号を選択',
                '',
                [
                  ...choices.map((badge) => ({
                    text: badge.label,
                    onPress: async () => {
                      setSelectedBadgeIdState(badge.id);
                      await setSelectedBadgeId(badge.id);
                    },
                  })),
                  {
                    text: '選択解除',
                    style: 'destructive',
                    onPress: async () => {
                      setSelectedBadgeIdState(null);
                      await setSelectedBadgeId(null);
                    },
                  },
                  { text: 'キャンセル', style: 'cancel' },
                ],
                { cancelable: true }
              );
            }}
            style={UI.profileBadge}>
            <Text style={UI.profileBadgeText}>
              ⭐ {selectedBadge?.label ?? (achievedBadges[0]?.label ?? '称号を選択')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert('保存しました');
            }}
            style={UI.profileSaveBtn}>
            <Text style={UI.profileSaveText}>保存</Text>
          </Pressable>
        </View>

        <View style={{ ...UI.card, marginBottom: 16 }}>
          <Text style={UI.sectionTitle}>テーマ</Text>
          <Text style={UI.styleSub}>暖色 / ネイビーを切り替えできます</Text>
          <View style={UI.themeRow}>
            <Pressable
              onPress={() => setThemeMode('warm')}
              style={{ ...UI.themeBtn, ...(themeMode === 'warm' ? UI.themeBtnActive : null) }}>
              <Text style={UI.themeBtnText}>暖色</Text>
            </Pressable>
            <Pressable
              onPress={() => setThemeMode('navy')}
              style={{ ...UI.themeBtn, ...(themeMode === 'navy' ? UI.themeBtnActive : null) }}>
              <Text style={UI.themeBtnText}>ネイビー</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ ...UI.card, marginBottom: 16 }}>
          <Text style={UI.sectionTitle}>ステータス</Text>
          <View style={UI.statRow}>
            <Text style={UI.statLabel}>登録店舗数</Text>
            <Text style={UI.statValue}>{stores.length}件</Text>
          </View>
          <View style={UI.statRow}>
            <Text style={UI.statLabel}>次回候補数</Text>
            <Text style={UI.statValue}>{stats.favoritesCount}件</Text>
          </View>
          <View style={UI.statRow}>
            <Text style={UI.statLabel}>累計ログイン</Text>
            <Text style={UI.statValue}>{loginState?.totalDays ?? 0}日</Text>
          </View>
          <View style={UI.statRow}>
            <Text style={UI.statLabel}>連続ログイン</Text>
            <Text style={UI.statValue}>{loginState?.streak ?? 0}日</Text>
          </View>
          <View style={UI.statRow}>
            <Text style={UI.statLabel}>徒歩圏内表示</Text>
            <Text style={UI.statValue}>{nearbyShownCount}回</Text>
          </View>
        </View>

        <View style={UI.card}>
          <Text style={UI.sectionTitle}>称号</Text>
          {achievedBadges.length === 0 ? (
            <Text style={{ color: '#6B7280' }}>まだ称号がありません。</Text>
          ) : (
            achievedBadges.map((badge) => (
              <View key={badge.id} style={UI.badgePill}>
                <Text style={UI.badgeText}>{badge.label}</Text>
              </View>
            ))
          )}
          <Text style={{ color: '#6B7280' }}>{requirementText(nextBadge, stats)}</Text>
        </View>

        <View style={UI.card}>
          <Text style={UI.sectionTitle}>利用スタイル</Text>
          <Text style={UI.styleText}>{style.title}</Text>
          <Text style={UI.styleSub}>{style.description}</Text>
        </View>
      </ScrollView>

      <BottomAdBanner />
    </View>
  );
}
