import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { logBadgeEarned, logThemeChanged } from '@/src/analytics';
import { getAchievedBadges, getNextBadge } from '@/src/domain/badges';
import { t } from '@/src/i18n';
import { useStores } from '@/src/state/StoresContext';
import { useThemeColors, useThemeMode } from '@/src/state/ThemeContext';
import {
    getLoginBonusState,
    getNearbyShownCount,
    getProfileAvatarUri,
    getProfileName,
    getSelectedBadgeId,
    setProfileName,
    setProfileAvatarUri,
    setSelectedBadgeId,
    type LoginBonusState,
} from '@/src/storage';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

const UI = {
  headerTitle: {
    fontSize: 22,
    fontFamily: fonts.extraBold,
    letterSpacing: 0.2,
  } as const,
  card: {
    borderRadius: 20,
    padding: 14,
  } as const,
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  } as const,
  statLabel: {
    fontFamily: fonts.bold,
  } as const,
  statValue: {
    fontFamily: fonts.extraBold,
  } as const,
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.extraBold,
    marginBottom: 8,
  } as const,
  styleSub: {} as const,
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  } as const,
  themeBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  } as const,
  themeBtnText: {
    fontFamily: fonts.extraBold,
  } as const,
  profileAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  } as const,
  profileAvatarText: {
    fontFamily: fonts.extraBold,
  } as const,
  profileAvatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
  } as const,
  profileAvatarHint: {
    textAlign: 'center',
    marginBottom: 8,
  } as const,
  profileStats: {
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
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  } as const,
  profileBadgeText: {
    fontFamily: fonts.extraBold,
  } as const,
  profileSaveBtn: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  } as const,
  profileSaveText: {
    fontFamily: fonts.bold,
  } as const,
  nameInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  } as const,
  nameHint: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 12,
  } as const,
} as const;

function requirementText(
  badge: ReturnType<typeof getNextBadge>,
  stats: { storesCount: number; favoritesCount: number; nearbyShownCount: number; totalLoginDays: number; loginStreak: number }
) {
  if (!badge) return t('profile.badges.allAchieved');
  if (badge.minStores)
    return t('profile.badges.needStores', { count: Math.max(0, badge.minStores - stats.storesCount), label: badge.label });
  if (badge.minFavorites)
    return t('profile.badges.needFavorites', { count: Math.max(0, badge.minFavorites - stats.favoritesCount), label: badge.label });
  if (badge.minNearbyShown)
    return t('profile.badges.needNearby', { count: Math.max(0, badge.minNearbyShown - stats.nearbyShownCount), label: badge.label });
  if (badge.minLoginDays)
    return t('profile.badges.needLoginDays', { count: Math.max(0, badge.minLoginDays - stats.totalLoginDays), label: badge.label });
  if (badge.minStreak)
    return t('profile.badges.needStreak', { count: Math.max(0, badge.minStreak - stats.loginStreak), label: badge.label });
  return t('profile.badges.next', { label: badge.label });
}

function getWeekDayLabels(): string[] {
  return [
    t('profile.weekdayMon'),
    t('profile.weekdayTue'),
    t('profile.weekdayWed'),
    t('profile.weekdayThu'),
    t('profile.weekdayFri'),
    t('profile.weekdaySat'),
    t('profile.weekdaySun'),
  ];
}

function WeeklyActivityChart({ stores, colors }: { stores: { createdAt?: number }[]; colors: ReturnType<typeof useThemeColors> }) {
  const data = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today.getTime() - mondayOffset * 86400000);

    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const s of stores) {
      if (!s.createdAt) continue;
      const d = new Date(s.createdAt);
      const storeDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diff = Math.floor((storeDay.getTime() - monday.getTime()) / 86400000);
      if (diff >= 0 && diff < 7) counts[diff]++;
    }
    return counts;
  }, [stores]);

  const weekTotal = data.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...data, 1);
  const labels = getWeekDayLabels();
  const BAR_MAX_HEIGHT = 60;

  return (
    <View>
      <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.text, marginBottom: 8 }}>
        {t('profile.activitySummary', { count: weekTotal })}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: BAR_MAX_HEIGHT + 20 }}>
        {data.map((count, i) => {
          const barHeight = Math.max(count > 0 ? (count / maxCount) * BAR_MAX_HEIGHT : 2, 2);
          return (
            <View key={i} style={{ alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: 16,
                  height: barHeight,
                  borderRadius: 4,
                  backgroundColor: count > 0 ? colors.primary : colors.chipBg,
                }}
              />
              <Text style={{ fontSize: 10, color: colors.subText, marginTop: 4 }}>{labels[i]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { stores, loading } = useStores();
  const { themeMode, setThemeMode } = useThemeMode();
  const colors = useThemeColors();
  const [loginState, setLoginState] = useState<LoginBonusState | null>(null);
  const [nearbyShownCount, setNearbyShownCount] = useState(0);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [profileName, setProfileNameState] = useState('');
  const [selectedBadgeId, setSelectedBadgeIdState] = useState<string | null>(null);

  const initials = profileName.trim() ? profileName.trim().slice(0, 2) : '👤';

  useEffect(() => {
    let mounted = true;
    if (loading) return;
    (async () => {
      const [bonus, nearbyShown] = await Promise.all([getLoginBonusState(), getNearbyShownCount()]);
      if (!mounted) return;
      setLoginState(bonus);
      setNearbyShownCount(nearbyShown);
    })();
    return () => { mounted = false; };
  }, [loading, stores.length]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const uri = await getProfileAvatarUri();
      if (mounted) setAvatarUri(uri);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const name = await getProfileName();
      if (mounted) setProfileNameState(name);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const storedId = await getSelectedBadgeId();
      if (mounted) setSelectedBadgeIdState(storedId);
    })();
    return () => { mounted = false; };
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
  const selectedBadge = useMemo(() => {
    if (!selectedBadgeId) return null;
    return getAchievedBadges(stats).find((badge) => badge.id === selectedBadgeId) ?? null;
  }, [selectedBadgeId, stats]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={{ marginBottom: 14 }}>
          <Text style={[UI.headerTitle, { color: colors.text }]}>{t('profile.title')}</Text>
        </View>

        <NeuCard style={{ ...UI.card, marginBottom: 16, backgroundColor: colors.card }}>
          <Pressable
            onPress={async () => {
              const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!permission.granted) {
                Alert.alert(t('profile.photoPermissionTitle'), t('profile.photoPermissionBody'));
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.8,
              });
              if (result.canceled) return;
              const uri = result.assets?.[0]?.uri;
              if (!uri) return;
              setAvatarUri(uri);
              await setProfileAvatarUri(uri);
            }}
            style={[UI.profileAvatar, { backgroundColor: colors.accentBg }]}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={UI.profileAvatarImage} />
            ) : (
              <Text style={[UI.profileAvatarText, { color: colors.accentText }]}>{initials}</Text>
            )}
          </Pressable>
          <Text style={[UI.profileAvatarHint, { color: colors.subText }]}>{t('profile.changePhoto')}</Text>
          <TextInput
            value={profileName}
            onChangeText={setProfileNameState}
            placeholder={t('profile.namePlaceholder')}
            style={[UI.nameInput, { backgroundColor: colors.inputBg, shadowColor: colors.shadowDark, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, color: colors.text }]}
          />
          <Text style={[UI.nameHint, { color: colors.subText }]}>{t('profile.nameHint')}</Text>

          <View style={UI.profileStats}>
            <View style={UI.profileStatRow}>
              <Text style={[UI.statLabel, { color: colors.subText }]}>{t('profile.stats.helpful')}</Text>
              <Text style={[UI.statValue, { color: colors.text }]}>{t('profile.countTimes', { count: nearbyShownCount })}</Text>
            </View>
            <View style={UI.profileStatRow}>
              <Text style={[UI.statLabel, { color: colors.subText }]}>{t('profile.stats.registered')}</Text>
              <Text style={[UI.statValue, { color: colors.text }]}>{t('profile.countItems', { count: stores.length })}</Text>
            </View>
            <View style={UI.profileStatRow}>
              <Text style={[UI.statLabel, { color: colors.subText }]}>{t('profile.stats.favorite')}</Text>
              <Text style={[UI.statValue, { color: colors.text }]}>{t('profile.countItems', { count: stats.favoritesCount })}</Text>
            </View>
          </View>

          <Pressable
            onPress={() => {
              const choices = getAchievedBadges(stats);
              if (choices.length === 0) {
                Alert.alert(t('profile.badges.noneTitle'), t('profile.badges.noneBody'));
                return;
              }
              Alert.alert(
                t('profile.badges.selectTitle'),
                '',
                [
                  ...choices.map((badge) => ({
                    text: badge.label,
                    onPress: async () => {
                      setSelectedBadgeIdState(badge.id);
                      await setSelectedBadgeId(badge.id);
                      logBadgeEarned({ badge_id: badge.id });
                    },
                  })),
                  {
                    text: t('profile.badges.clear'),
                    style: 'destructive',
                    onPress: async () => {
                      setSelectedBadgeIdState(null);
                      await setSelectedBadgeId(null);
                    },
                  },
                  { text: t('common.cancel'), style: 'cancel' },
                ],
                { cancelable: true }
              );
            }}
            style={[UI.profileBadge, { backgroundColor: colors.accentBg }]}>
            <Text style={[UI.profileBadgeText, { color: colors.accentText }]}>
              👑 {selectedBadge?.label ?? (achievedBadges[0]?.label ?? t('profile.badges.selectTitle'))}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setProfileName(profileName);
              Alert.alert(t('profile.saved'));
            }}
            style={[UI.profileSaveBtn, { backgroundColor: colors.card, shadowColor: colors.shadowDark }]}>
            <Text style={[UI.profileSaveText, { color: colors.text }]}>{t('common.save')}</Text>
          </Pressable>
        </NeuCard>

        <NeuCard style={{ ...UI.card, marginBottom: 16, backgroundColor: colors.card }}>
          <Text style={[UI.sectionTitle, { color: colors.text }]}>{t('profile.themeTitle')}</Text>
          <Text style={[UI.styleSub, { color: colors.subText }]}>{t('profile.themeSub')}</Text>
          <View style={UI.themeRow}>
            <Pressable
              onPress={() => { setThemeMode('warm'); logThemeChanged({ theme: 'warm' }); }}
              style={{ ...UI.themeBtn, backgroundColor: themeMode === 'warm' ? colors.accentBg : colors.chipBg, shadowColor: colors.shadowDark, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 }}>
              <Text style={[UI.themeBtnText, { color: themeMode === 'warm' ? colors.accentText : colors.text }]}>{t('profile.themeWarm')}</Text>
            </Pressable>
            <Pressable
              onPress={() => { setThemeMode('navy'); logThemeChanged({ theme: 'navy' }); }}
              style={{ ...UI.themeBtn, backgroundColor: themeMode === 'navy' ? colors.accentBg : colors.chipBg, shadowColor: colors.shadowDark, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 }}>
              <Text style={[UI.themeBtnText, { color: themeMode === 'navy' ? colors.accentText : colors.text }]}>{t('profile.themeNavy')}</Text>
            </Pressable>
          </View>
        </NeuCard>

        <NeuCard style={{ ...UI.card, marginBottom: 16, backgroundColor: colors.card }}>
          <Text style={[UI.sectionTitle, { color: colors.text }]}>{t('profile.statusTitle')}</Text>
          <View style={UI.statRow}>
            <Text style={[UI.statLabel, { color: colors.subText }]}>{t('profile.statusStores')}</Text>
            <Text style={[UI.statValue, { color: colors.text }]}>{t('profile.countItems', { count: stores.length })}</Text>
          </View>
          <View style={UI.statRow}>
            <Text style={[UI.statLabel, { color: colors.subText }]}>{t('profile.statusFavorites')}</Text>
            <Text style={[UI.statValue, { color: colors.text }]}>{t('profile.countItems', { count: stats.favoritesCount })}</Text>
          </View>
          <View style={UI.statRow}>
            <Text style={[UI.statLabel, { color: colors.subText }]}>{t('profile.statusTotalLogin')}</Text>
            <Text style={[UI.statValue, { color: colors.text }]}>{t('profile.countDays', { count: loginState?.totalDays ?? 0 })}</Text>
          </View>
          <View style={UI.statRow}>
            <Text style={[UI.statLabel, { color: colors.subText }]}>{t('profile.statusStreak')}</Text>
            <Text style={[UI.statValue, { color: colors.text }]}>{t('profile.countDays', { count: loginState?.streak ?? 0 })}</Text>
          </View>
          <View style={UI.statRow}>
            <Text style={[UI.statLabel, { color: colors.subText }]}>{t('profile.statusNearby')}</Text>
            <Text style={[UI.statValue, { color: colors.text }]}>{t('profile.countTimes', { count: nearbyShownCount })}</Text>
          </View>
        </NeuCard>

        <NeuCard style={{ ...UI.card, marginBottom: 16, backgroundColor: colors.card }}>
          <Text style={[UI.sectionTitle, { color: colors.text }]}>{t('profile.activityTitle')}</Text>
          <WeeklyActivityChart stores={stores} colors={colors} />
        </NeuCard>

        <NeuCard style={{ ...UI.card, backgroundColor: colors.card }}>
          <Text style={[UI.sectionTitle, { color: colors.text }]}>{t('profile.badges.title')}</Text>
          {achievedBadges.length === 0 ? (
            <Text style={{ color: colors.subText }}>{t('profile.badges.empty')}</Text>
          ) : (
            achievedBadges.map((badge) => (
              <View key={badge.id} style={{ alignSelf: 'flex-start', backgroundColor: colors.accentBg, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 }}>
                <Text style={{ fontFamily: fonts.extraBold, color: colors.accentText }}>{badge.label}</Text>
              </View>
            ))
          )}
          <Text style={{ color: colors.subText }}>{requirementText(nextBadge, stats)}</Text>
        </NeuCard>
      </ScrollView>

      <BottomAdBanner />
    </View>
  );
}
