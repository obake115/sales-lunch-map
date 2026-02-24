import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { t } from '@/src/i18n';
import { useStores } from '@/src/state/StoresContext';
import { useThemeColors } from '@/src/state/ThemeContext';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

const UI = {
  card: {
    borderRadius: 20,
    padding: 14,
  } as const,
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  } as const,
} as const;

function getMonthKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getWeekdayIndex(ts: number) {
  return new Date(ts).getDay(); // 0=Sun
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StatsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { stores } = useStores();

  const totalStores = stores.length;
  const favorites = stores.filter((s) => s.isFavorite).length;
  const withPhoto = stores.filter((s) => s.photoUri || (s.photoUris?.length ?? 0) > 0).length;
  const withReminder = stores.filter((s) => s.remindEnabled).length;

  // Monthly registration counts (last 6 months)
  const monthlyData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of stores) {
      const key = getMonthKey(s.createdAt);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const now = new Date();
    const months: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ label: `${d.getMonth() + 1}${t('stats.monthSuffix')}`, count: counts[key] ?? 0 });
    }
    return months;
  }, [stores]);

  const maxMonthly = Math.max(...monthlyData.map((m) => m.count), 1);

  // Weekday distribution
  const weekdayData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const s of stores) {
      counts[getWeekdayIndex(s.createdAt)] += 1;
    }
    return counts;
  }, [stores]);

  const maxWeekday = Math.max(...weekdayData, 1);

  // Tag distribution
  const tagData = useMemo(() => {
    const mood: Record<string, number> = {};
    const scene: Record<string, number> = {};
    for (const s of stores) {
      for (const tag of s.moodTags ?? []) mood[tag] = (mood[tag] ?? 0) + 1;
      for (const tag of s.sceneTags ?? []) scene[tag] = (scene[tag] ?? 0) + 1;
    }
    return { mood, scene };
  }, [stores]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Pressable onPress={() => router.back()} style={[UI.backBtn, { backgroundColor: colors.card, shadowColor: colors.shadowDark }]}>
            <Text style={{ fontFamily: fonts.extraBold, color: colors.text }}>‹</Text>
          </Pressable>
          <Text style={{ flex: 1, textAlign: 'center', fontFamily: fonts.extraBold, fontSize: 16, color: colors.text }}>
            {t('stats.title')}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Summary cards */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { label: t('stats.totalStores'), value: totalStores },
            { label: t('stats.favorites'), value: favorites },
            { label: t('stats.withPhoto'), value: withPhoto },
            { label: t('stats.withReminder'), value: withReminder },
          ].map((item) => (
            <NeuCard key={item.label} style={[UI.card, { flex: 1, backgroundColor: colors.card, alignItems: 'center' }]}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 22, color: '#F59E0B' }}>{item.value}</Text>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 10, color: colors.subText, marginTop: 2 }}>{item.label}</Text>
            </NeuCard>
          ))}
        </View>

        {/* Monthly chart */}
        <NeuCard style={[UI.card, { backgroundColor: colors.card }]}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 14, color: colors.text, marginBottom: 10 }}>
            {t('stats.monthlyTitle')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end', height: 100 }}>
            {monthlyData.map((m) => (
              <View key={m.label} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.extraBold, fontSize: 10, color: '#F59E0B', marginBottom: 2 }}>
                  {m.count > 0 ? m.count : ''}
                </Text>
                <View
                  style={{
                    width: '80%',
                    height: Math.max((m.count / maxMonthly) * 70, 2),
                    backgroundColor: '#F59E0B',
                    borderRadius: 4,
                  }}
                />
                <Text style={{ fontFamily: fonts.extraBold, fontSize: 10, color: colors.subText, marginTop: 4 }}>
                  {m.label}
                </Text>
              </View>
            ))}
          </View>
        </NeuCard>

        {/* Weekday chart */}
        <NeuCard style={[UI.card, { backgroundColor: colors.card }]}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 14, color: colors.text, marginBottom: 10 }}>
            {t('stats.weekdayTitle')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 80 }}>
            {weekdayData.map((count, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.extraBold, fontSize: 10, color: '#4F78FF', marginBottom: 2 }}>
                  {count > 0 ? count : ''}
                </Text>
                <View
                  style={{
                    width: '80%',
                    height: Math.max((count / maxWeekday) * 50, 2),
                    backgroundColor: '#4F78FF',
                    borderRadius: 4,
                  }}
                />
                <Text style={{ fontFamily: fonts.extraBold, fontSize: 10, color: colors.subText, marginTop: 4 }}>
                  {WEEKDAY_LABELS[i]}
                </Text>
              </View>
            ))}
          </View>
        </NeuCard>

        {/* Tag distribution */}
        <NeuCard style={[UI.card, { backgroundColor: colors.card }]}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 14, color: colors.text, marginBottom: 10 }}>
            {t('stats.tagTitle')}
          </Text>
          {Object.entries({ ...tagData.mood, ...tagData.scene }).length === 0 ? (
            <Text style={{ color: colors.subText }}>{t('stats.noTags')}</Text>
          ) : (
            <View style={{ gap: 6 }}>
              {Object.entries({ ...tagData.mood, ...tagData.scene })
                .sort(([, a], [, b]) => b - a)
                .map(([tag, count]) => (
                  <View key={tag} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontFamily: fonts.extraBold, fontSize: 12, color: colors.text, width: 80 }} numberOfLines={1}>
                      {tag}
                    </Text>
                    <View style={{ flex: 1, height: 14, backgroundColor: colors.inputBg, borderRadius: 7 }}>
                      <View
                        style={{
                          width: `${Math.min((count / totalStores) * 100, 100)}%`,
                          height: 14,
                          backgroundColor: '#F59E0B',
                          borderRadius: 7,
                        }}
                      />
                    </View>
                    <Text style={{ fontFamily: fonts.extraBold, fontSize: 12, color: colors.subText, width: 24, textAlign: 'right' }}>
                      {count}
                    </Text>
                  </View>
                ))}
            </View>
          )}
        </NeuCard>
      </ScrollView>

      <BottomAdBanner />
    </View>
  );
}
