import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { getAchievedBadges, getNextBadge } from '@/src/domain/badges';
import { useStores } from '@/src/state/StoresContext';
import { useThemeMode } from '@/src/state/ThemeContext';
import { getLoginBonusState, getNearbyShownCount, type LoginBonusState } from '@/src/storage';
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

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={{ marginBottom: 14 }}>
          <Text style={UI.headerTitle}>プロフィール</Text>
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
