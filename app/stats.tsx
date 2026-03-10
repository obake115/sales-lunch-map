import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { t } from '@/src/i18n';
import type { TravelLunchEntry } from '@/src/models';
import { useStores } from '@/src/state/StoresContext';
import { useThemeColors } from '@/src/state/ThemeContext';
import { getTravelLunchEntries, toggleTravelLunchFavorite } from '@/src/storage';
import { BottomAdBanner } from '@/src/ui/AdBanner';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

const UI = {
  card: {
    borderRadius: 20,
    padding: 14,
  } as const,
} as const;

function getMonthKey(dateStr: string) {
  return dateStr.slice(0, 7); // YYYY-MM
}

function getDateKey(dateStr: string) {
  return dateStr.slice(0, 10); // YYYY-MM-DD
}

/* ── Calendar helpers ── */
function getCalendarWeeks(year: number, month: number, lunchDates: Set<string>): { date: string; hasLunch: boolean; day: number; inMonth: boolean }[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const weeks: { date: string; hasLunch: boolean; day: number; inMonth: boolean }[][] = [];
  let week: { date: string; hasLunch: boolean; day: number; inMonth: boolean }[] = [];

  // Pad start
  for (let i = 0; i < startDow; i++) {
    week.push({ date: '', hasLunch: false, day: 0, inMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    week.push({ date: dateStr, hasLunch: lunchDates.has(dateStr), day: d, inMonth: true });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) {
      week.push({ date: '', hasLunch: false, day: 0, inMonth: false });
    }
    weeks.push(week);
  }
  return weeks;
}

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export default function StatsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { stores } = useStores();

  const [entries, setEntries] = useState<TravelLunchEntry[]>([]);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getTravelLunchEntries().then(setEntries);
    }, [])
  );

  // ── Basic stats ──
  const totalLunches = entries.length;
  const totalStores = stores.length;
  const visitedPrefs = useMemo(() => new Set(entries.map((e) => e.prefectureId)).size, [entries]);
  const favoriteLunches = useMemo(() => entries.filter((e) => e.isFavorite), [entries]);

  // ── Genre ranking ──
  const genreRanking = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      if (e.genre) counts[e.genre] = (counts[e.genre] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [entries]);

  // ── Prefecture ranking ──
  const prefRanking = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      const label = t(`prefectures.${e.prefectureId}`);
      const name = label.startsWith('prefectures.') ? e.prefectureId : label;
      counts[name] = (counts[name] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [entries]);

  // ── Monthly lunch count (last 6 months) ──
  const monthlyData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      const key = getMonthKey(e.visitedAt);
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
  }, [entries]);

  const maxMonthly = Math.max(...monthlyData.map((m) => m.count), 1);

  // ── Calendar ──
  const lunchDates = useMemo(() => new Set(entries.map((e) => getDateKey(e.visitedAt))), [entries]);
  const calWeeks = useMemo(() => getCalendarWeeks(calMonth.year, calMonth.month, lunchDates), [calMonth, lunchDates]);
  const selectedEntries = useMemo(
    () => (selectedDate ? entries.filter((e) => getDateKey(e.visitedAt) === selectedDate) : []),
    [entries, selectedDate]
  );

  const handleToggleFavorite = async (entryId: string) => {
    await toggleTravelLunchFavorite(entryId);
    const updated = await getTravelLunchEntries();
    setEntries(updated);
  };

  const prevMonth = () => {
    setCalMonth((prev) => {
      const m = prev.month - 1;
      return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m };
    });
    setSelectedDate(null);
  };
  const nextMonth = () => {
    setCalMonth((prev) => {
      const m = prev.month + 1;
      return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m };
    });
    setSelectedDate(null);
  };

  const maxGenre = genreRanking.length > 0 ? genreRanking[0][1] : 1;
  const maxPref = prefRanking.length > 0 ? prefRanking[0][1] : 1;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}>

        {/* ── Summary cards ── */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { label: t('stats.totalLunches'), value: totalLunches, color: '#F59E0B' },
            { label: t('stats.totalStores'), value: totalStores, color: '#4F78FF' },
            { label: t('stats.visitedPrefs'), value: visitedPrefs, color: '#10B981' },
          ].map((item) => (
            <NeuCard key={item.label} style={[UI.card, { flex: 1, backgroundColor: colors.card, alignItems: 'center' }]}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 22, color: item.color }}>{item.value}</Text>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 10, color: colors.subText, marginTop: 2 }}>{item.label}</Text>
            </NeuCard>
          ))}
        </View>

        {/* ── Monthly chart ── */}
        <NeuCard style={[UI.card, { backgroundColor: colors.card }]}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 14, color: colors.text, marginBottom: 10 }}>
            {t('stats.monthlyLunchTitle')}
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

        {/* ── Calendar ── */}
        <NeuCard style={[UI.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Pressable onPress={prevMonth} style={{ padding: 8 }}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 18, color: colors.text }}>‹</Text>
            </Pressable>
            <Text style={{ fontFamily: fonts.extraBold, fontSize: 14, color: colors.text }}>
              {calMonth.year}{t('stats.calYear')}{calMonth.month + 1}{t('stats.calMonth')}
            </Text>
            <Pressable onPress={nextMonth} style={{ padding: 8 }}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 18, color: colors.text }}>›</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {DOW_LABELS.map((d) => (
              <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 10, color: colors.subText }}>{d}</Text>
              </View>
            ))}
          </View>
          {calWeeks.map((week, wi) => (
            <View key={wi} style={{ flexDirection: 'row', marginBottom: 2 }}>
              {week.map((cell, ci) => (
                <Pressable
                  key={ci}
                  onPress={() => cell.inMonth && setSelectedDate(cell.date === selectedDate ? null : cell.date)}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: cell.date === selectedDate ? '#4F78FF' : 'transparent',
                  }}>
                  {cell.inMonth ? (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{
                        fontFamily: fonts.bold,
                        fontSize: 12,
                        color: cell.date === selectedDate ? '#FFF' : colors.text,
                      }}>
                        {cell.day}
                      </Text>
                      {cell.hasLunch ? (
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B', marginTop: 1 }} />
                      ) : null}
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ))}

          {/* Selected date entries */}
          {selectedDate && selectedEntries.length > 0 ? (
            <View style={{ marginTop: 10, gap: 8 }}>
              <Text style={{ fontFamily: fonts.extraBold, fontSize: 12, color: colors.subText }}>{selectedDate}</Text>
              {selectedEntries.map((entry) => (
                <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {entry.imageUri ? (
                    <Image source={{ uri: entry.imageUri }} style={{ width: 40, height: 40, borderRadius: 8 }} />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.extraBold, fontSize: 13, color: colors.text }} numberOfLines={1}>
                      {entry.restaurantName}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.subText }}>{entry.genre}</Text>
                  </View>
                  <Pressable onPress={() => handleToggleFavorite(entry.id)} style={{ padding: 4 }}>
                    <Text style={{ fontSize: 18 }}>{entry.isFavorite ? '★' : '☆'}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : selectedDate ? (
            <Text style={{ marginTop: 10, color: colors.subText, textAlign: 'center', fontSize: 12 }}>
              {t('stats.noEntries')}
            </Text>
          ) : null}
        </NeuCard>

        {/* ── Genre ranking ── */}
        <NeuCard style={[UI.card, { backgroundColor: colors.card }]}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 14, color: colors.text, marginBottom: 10 }}>
            {t('stats.genreRanking')}
          </Text>
          {genreRanking.length === 0 ? (
            <Text style={{ color: colors.subText }}>{t('stats.noData')}</Text>
          ) : (
            <View style={{ gap: 6 }}>
              {genreRanking.map(([genre, count], i) => (
                <View key={genre} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: fonts.extraBold, fontSize: 14, color: i < 3 ? '#F59E0B' : colors.subText, width: 20 }}>
                    {i + 1}
                  </Text>
                  <Text style={{ fontFamily: fonts.extraBold, fontSize: 13, color: colors.text, width: 80 }} numberOfLines={1}>
                    {genre}
                  </Text>
                  <View style={{ flex: 1, height: 14, backgroundColor: colors.inputBg, borderRadius: 7 }}>
                    <View
                      style={{
                        width: `${Math.min((count / maxGenre) * 100, 100)}%`,
                        height: 14,
                        backgroundColor: '#F59E0B',
                        borderRadius: 7,
                      }}
                    />
                  </View>
                  <Text style={{ fontFamily: fonts.extraBold, fontSize: 12, color: colors.subText, width: 28, textAlign: 'right' }}>
                    {count}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </NeuCard>

        {/* ── Prefecture ranking ── */}
        <NeuCard style={[UI.card, { backgroundColor: colors.card }]}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 14, color: colors.text, marginBottom: 10 }}>
            {t('stats.prefRanking')}
          </Text>
          {prefRanking.length === 0 ? (
            <Text style={{ color: colors.subText }}>{t('stats.noData')}</Text>
          ) : (
            <View style={{ gap: 6 }}>
              {prefRanking.map(([pref, count], i) => (
                <View key={pref} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: fonts.extraBold, fontSize: 14, color: i < 3 ? '#10B981' : colors.subText, width: 20 }}>
                    {i + 1}
                  </Text>
                  <Text style={{ fontFamily: fonts.extraBold, fontSize: 13, color: colors.text, width: 80 }} numberOfLines={1}>
                    {pref}
                  </Text>
                  <View style={{ flex: 1, height: 14, backgroundColor: colors.inputBg, borderRadius: 7 }}>
                    <View
                      style={{
                        width: `${Math.min((count / maxPref) * 100, 100)}%`,
                        height: 14,
                        backgroundColor: '#10B981',
                        borderRadius: 7,
                      }}
                    />
                  </View>
                  <Text style={{ fontFamily: fonts.extraBold, fontSize: 12, color: colors.subText, width: 28, textAlign: 'right' }}>
                    {count}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </NeuCard>

        {/* ── Favorite lunches ── */}
        <NeuCard style={[UI.card, { backgroundColor: colors.card }]}>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 14, color: colors.text, marginBottom: 10 }}>
            {t('stats.favoriteLunches')} ({favoriteLunches.length})
          </Text>
          {favoriteLunches.length === 0 ? (
            <Text style={{ color: colors.subText }}>{t('stats.noFavorites')}</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {favoriteLunches.map((entry) => (
                <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {entry.imageUri ? (
                    <Image source={{ uri: entry.imageUri }} style={{ width: 50, height: 50, borderRadius: 10 }} />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.extraBold, fontSize: 13, color: colors.text }} numberOfLines={1}>
                      {entry.restaurantName}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.subText }}>
                      {entry.genre} · {entry.visitedAt}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#F59E0B' }}>
                      {'★'.repeat(entry.rating)}{'☆'.repeat(5 - entry.rating)}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleToggleFavorite(entry.id)} style={{ padding: 4 }}>
                    <Text style={{ fontSize: 20, color: '#F59E0B' }}>★</Text>
                  </Pressable>
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
