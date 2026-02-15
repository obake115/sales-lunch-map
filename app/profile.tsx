import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { getAchievedBadges, getNextBadge } from '@/src/domain/badges';
import { t } from '@/src/i18n';
import { useStores } from '@/src/state/StoresContext';
import { useThemeMode } from '@/src/state/ThemeContext';
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
import { NeuCard } from '@/src/ui/NeuCard';

const UI = {
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.2,
  } as const,
  card: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#E9E4DA',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
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
  styleSub: {
    color: '#6B7280',
  } as const,
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  } as const,
  themeBtn: {
    backgroundColor: '#E9E4DA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  themeBtnActive: {
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
    backgroundColor: '#E9E4DA',
    paddingVertical: 8,
    alignItems: 'center',
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  profileSaveText: {
    color: '#111827',
    fontWeight: '700',
  } as const,
  nameInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E9E4DA',
    marginTop: 8,
    shadowColor: '#C8C3B9',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
  nameHint: {
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
    fontSize: 12,
  } as const,
  settingRow: {
    paddingVertical: 10,
  } as const,
  settingLabel: {
    fontWeight: '800',
    color: '#111827',
  } as const,
  settingSub: {
    color: '#6B7280',
    marginTop: 4,
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

export default function ProfileScreen() {
  const router = useRouter();
  const { stores, loading } = useStores();
  const { themeMode, setThemeMode } = useThemeMode();
  const [loginState, setLoginState] = useState<LoginBonusState | null>(null);
  const [nearbyShownCount, setNearbyShownCount] = useState(0);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [profileName, setProfileNameState] = useState('');
  const [selectedBadgeId, setSelectedBadgeIdState] = useState<string | null>(null);

  const initials = profileName.trim() ? profileName.trim().slice(0, 2) : 'T.K.';

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
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={{ marginBottom: 14 }}>
          <Text style={UI.headerTitle}>{t('profile.title')}</Text>
        </View>

        <NeuCard style={{ ...UI.card, marginBottom: 16 }}>
          <Pressable
            onPress={async () => {
              const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!permission.granted) {
                Alert.alert(t('profile.photoPermissionTitle'), t('profile.photoPermissionBody'));
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
              <Text style={UI.profileAvatarText}>{initials}</Text>
            )}
          </Pressable>
          <Text style={UI.profileAvatarHint}>{t('profile.changePhoto')}</Text>
          <TextInput
            value={profileName}
            onChangeText={setProfileNameState}
            placeholder={t('profile.namePlaceholder')}
            style={UI.nameInput}
          />
          <Text style={UI.nameHint}>{t('profile.nameHint')}</Text>

          <View style={UI.profileStats}>
            <View style={UI.profileStatRow}>
              <Text style={UI.statLabel}>{t('profile.stats.helpful')}</Text>
              <Text style={UI.statValue}>{t('profile.countTimes', { count: nearbyShownCount })}</Text>
            </View>
            <View style={UI.profileStatRow}>
              <Text style={UI.statLabel}>{t('profile.stats.registered')}</Text>
              <Text style={UI.statValue}>{t('profile.countItems', { count: stores.length })}</Text>
            </View>
            <View style={UI.profileStatRow}>
              <Text style={UI.statLabel}>{t('profile.stats.favorite')}</Text>
              <Text style={UI.statValue}>{t('profile.countItems', { count: stats.favoritesCount })}</Text>
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
            style={UI.profileBadge}>
            <Text style={UI.profileBadgeText}>
              👑 {selectedBadge?.label ?? (achievedBadges[0]?.label ?? t('profile.badges.selectTitle'))}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setProfileName(profileName);
              Alert.alert(t('profile.saved'));
            }}
            style={UI.profileSaveBtn}>
            <Text style={UI.profileSaveText}>{t('common.save')}</Text>
          </Pressable>
        </NeuCard>

        <NeuCard style={{ ...UI.card, marginBottom: 16 }}>
          <Text style={UI.sectionTitle}>{t('profile.themeTitle')}</Text>
          <Text style={UI.styleSub}>{t('profile.themeSub')}</Text>
          <View style={UI.themeRow}>
            <Pressable
              onPress={() => setThemeMode('warm')}
              style={{ ...UI.themeBtn, ...(themeMode === 'warm' ? UI.themeBtnActive : null) }}>
              <Text style={UI.themeBtnText}>{t('profile.themeWarm')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setThemeMode('navy')}
              style={{ ...UI.themeBtn, ...(themeMode === 'navy' ? UI.themeBtnActive : null) }}>
              <Text style={UI.themeBtnText}>{t('profile.themeNavy')}</Text>
            </Pressable>
          </View>
        </NeuCard>

        <NeuCard style={{ ...UI.card, marginBottom: 16 }}>
          <Text style={UI.sectionTitle}>{t('profile.settingsTitle')}</Text>
          <Pressable
            onPress={() => router.push({ pathname: '/onboarding', params: { mode: 'preview' } })}
            style={{ paddingTop: 10 }}>
            <Text style={UI.settingLabel}>{t('profile.settingsHowTo')}</Text>
            <Text style={UI.settingSub}>{t('profile.settingsHowToSub')}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/post-limit-info')} style={UI.settingRow}>
            <Text style={UI.settingLabel}>{t('profile.settingsPostLimit')}</Text>
            <Text style={UI.settingSub}>{t('profile.settingsPostLimitSub')}</Text>
          </Pressable>
        </NeuCard>

        <NeuCard style={{ ...UI.card, marginBottom: 16 }}>
          <Text style={UI.sectionTitle}>{t('profile.statusTitle')}</Text>
          <View style={UI.statRow}>
            <Text style={UI.statLabel}>{t('profile.statusStores')}</Text>
            <Text style={UI.statValue}>{t('profile.countItems', { count: stores.length })}</Text>
          </View>
          <View style={UI.statRow}>
            <Text style={UI.statLabel}>{t('profile.statusFavorites')}</Text>
            <Text style={UI.statValue}>{t('profile.countItems', { count: stats.favoritesCount })}</Text>
          </View>
          <View style={UI.statRow}>
            <Text style={UI.statLabel}>{t('profile.statusTotalLogin')}</Text>
            <Text style={UI.statValue}>{t('profile.countDays', { count: loginState?.totalDays ?? 0 })}</Text>
          </View>
          <View style={UI.statRow}>
            <Text style={UI.statLabel}>{t('profile.statusStreak')}</Text>
            <Text style={UI.statValue}>{t('profile.countDays', { count: loginState?.streak ?? 0 })}</Text>
          </View>
          <View style={UI.statRow}>
            <Text style={UI.statLabel}>{t('profile.statusNearby')}</Text>
            <Text style={UI.statValue}>{t('profile.countTimes', { count: nearbyShownCount })}</Text>
          </View>
        </NeuCard>

        <NeuCard style={UI.card}>
          <Text style={UI.sectionTitle}>{t('profile.badges.title')}</Text>
          {achievedBadges.length === 0 ? (
            <Text style={{ color: '#6B7280' }}>{t('profile.badges.empty')}</Text>
          ) : (
            achievedBadges.map((badge) => (
              <View key={badge.id} style={UI.badgePill}>
                <Text style={UI.badgeText}>{badge.label}</Text>
              </View>
            ))
          )}
          <Text style={{ color: '#6B7280' }}>{requirementText(nextBadge, stats)}</Text>
        </NeuCard>
      </ScrollView>

      <BottomAdBanner />
    </View>
  );
}
