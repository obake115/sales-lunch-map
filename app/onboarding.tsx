import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import { t } from '@/src/i18n';
import { setHasSeenOnboarding } from '@/src/storage';
import { JapanMapInteractive } from '@/src/ui/JapanMapInteractive';
import { fonts } from '@/src/ui/fonts';

// ─── Colors (match app warm theme — くすみローズ) ──
const ACCENT_PINK = '#D8849F';
const ACCENT_PINK_SOFT = 'rgba(216, 132, 159, 0.18)';
const COLORS = {
  background: '#E9E4DA',
  card: '#FAF7F2',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  accentPink: ACCENT_PINK,
  accentPinkSoft: ACCENT_PINK_SOFT,
  mapSelected: 'rgba(216, 132, 159, 0.70)',
  mapVisited: 'rgba(216, 132, 159, 0.40)',
  primaryBtn: '#4F6FAF',
  border: '#D5D0C6',
  dotActive: ACCENT_PINK,
  dotInactive: 'rgba(31, 42, 55, 0.18)',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Sub-components ─────────────────────────────────

/** Mini memory card — dummy photo card for visual decoration */
function MiniMemoryCard({ title, color, delay: animDelay }: { title: string; color: string; delay?: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withDelay(animDelay ?? 0, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(animDelay ?? 0, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
  }, [opacity, translateY, animDelay]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[miniCardStyles.container, animStyle]}>
      <View style={[miniCardStyles.photo, { backgroundColor: color }]} />
      <Text style={miniCardStyles.title} numberOfLines={1}>{title}</Text>
      <View style={miniCardStyles.tagRow}>
        <View style={[miniCardStyles.tag, { backgroundColor: COLORS.accentPinkSoft }]} />
        <View style={[miniCardStyles.tag, { backgroundColor: '#E5E7EB' }]} />
      </View>
    </Animated.View>
  );
}

const miniCardStyles = StyleSheet.create({
  container: {
    width: 110,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  photo: {
    width: '100%',
    height: 60,
    borderRadius: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 4,
  },
  tag: {
    width: 24,
    height: 6,
    borderRadius: 3,
  },
});

/** Counter pill — shows 0/10 count */
function CounterPill() {
  const scale = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withDelay(300, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }));
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[counterStyles.pill, animStyle]}>
      <Text style={counterStyles.count}>0</Text>
      <Text style={counterStyles.separator}>/</Text>
      <Text style={counterStyles.total}>10</Text>
    </Animated.View>
  );
}

const counterStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  count: {
    fontSize: 28,
    fontFamily: fonts.extraBold,
    color: COLORS.accentPink,
  },
  separator: {
    fontSize: 20,
    fontFamily: fonts.medium,
    color: COLORS.textSecondary,
    marginHorizontal: 2,
  },
  total: {
    fontSize: 20,
    fontFamily: fonts.medium,
    color: COLORS.textSecondary,
  },
});

/** Card stack — visual stack of empty cards */
function CardStack() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(500, withTiming(1, { duration: 600 }));
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[stackStyles.wrapper, animStyle]}>
      {/* Background cards */}
      <View style={[stackStyles.card, stackStyles.card3]} />
      <View style={[stackStyles.card, stackStyles.card2]} />
      {/* Front card with +1 badge */}
      <View style={[stackStyles.card, stackStyles.card1]}>
        <View style={stackStyles.photoPlaceholder} />
        <View style={stackStyles.linePlaceholder} />
        <View style={stackStyles.lineShort} />
      </View>
      {/* +1 badge */}
      <View style={stackStyles.badge}>
        <Text style={stackStyles.badgeText}>+1</Text>
      </View>
    </Animated.View>
  );
}

const CARD_W = 120;
const CARD_H = 140;

const stackStyles = StyleSheet.create({
  wrapper: {
    width: CARD_W + 24,
    height: CARD_H + 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  card1: {
    zIndex: 3,
  },
  card2: {
    zIndex: 2,
    transform: [{ rotate: '3deg' }, { translateX: 6 }, { translateY: 4 }],
    opacity: 0.7,
  },
  card3: {
    zIndex: 1,
    transform: [{ rotate: '-2deg' }, { translateX: -4 }, { translateY: 8 }],
    opacity: 0.4,
  },
  photoPlaceholder: {
    width: '100%',
    height: 60,
    backgroundColor: COLORS.accentPinkSoft,
    borderRadius: 8,
    marginBottom: 8,
  },
  linePlaceholder: {
    width: '75%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 6,
  },
  lineShort: {
    width: '50%',
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    zIndex: 10,
    backgroundColor: COLORS.accentPink,
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.extraBold,
    color: '#FFFFFF',
  },
});

/** Mini record card (Slide 2) — shows photo/memo/tag icons */
function MiniRecordCard() {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(400, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }));
  }, [opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[recordStyles.container, animStyle]}>
      <View style={recordStyles.row}>
        <View style={[recordStyles.iconCircle, { backgroundColor: COLORS.accentPinkSoft }]}>
          <Text style={recordStyles.iconText}>📷</Text>
        </View>
        <View style={[recordStyles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
          <Text style={recordStyles.iconText}>📝</Text>
        </View>
        <View style={[recordStyles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
          <Text style={recordStyles.iconText}>🏷</Text>
        </View>
      </View>
      <View style={recordStyles.line} />
    </Animated.View>
  );
}

const recordStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
    width: 160,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
  },
  line: {
    width: '80%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
  },
});

// ─── Slide 1: Welcome with map + mini cards ────────
function Slide1() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideContent}>
        <Text style={styles.title}>{t('onboarding.slides.welcome.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.slides.welcome.body')}</Text>
        <Animated.View style={[styles.mapContainer, animStyle]}>
          <JapanMapInteractive
            height={220}
            fillDefault="#F5F0E8"
            fillSelected={COLORS.mapSelected}
            fillVisited={COLORS.mapVisited}
            selectedPref="tokyo"
            visitedPrefs={new Set(['osaka', 'fukuoka', 'hokkaido'])}
            stroke={COLORS.border}
            strokeWidth={0.6}
          />
        </Animated.View>
        {/* Mini memory cards */}
        <View style={styles.miniCardsRow}>
          <MiniMemoryCard title="駅前の定食屋" color={COLORS.accentPinkSoft} delay={300} />
          <MiniMemoryCard title="隠れ家カレー" color="#FEF3C7" delay={500} />
        </View>
      </View>
    </View>
  );
}

// ─── Slide 2: Tap to record + pulse ────────────────
function Slide2() {
  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideContent}>
        <Text style={styles.title}>{t('onboarding.slides.easy.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.slides.easy.body')}</Text>
        <View style={styles.mapContainer}>
          <JapanMapInteractive
            height={220}
            fillDefault="#F5F0E8"
            fillSelected={COLORS.mapSelected}
            fillVisited={COLORS.mapVisited}
            selectedPref="osaka"
            visitedPrefs={new Set(['hokkaido', 'miyagi', 'tokyo', 'aichi', 'kyoto', 'fukuoka'])}
            stroke={COLORS.border}
            strokeWidth={0.6}
          />
        </View>
        {/* Mini record card */}
        <View style={styles.recordCardWrapper}>
          <MiniRecordCard />
        </View>
      </View>
    </View>
  );
}

// ─── Slide 3: Free tier with counter + card stack ──
function Slide3() {
  const premiumOpacity = useSharedValue(0);

  useEffect(() => {
    premiumOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
  }, [premiumOpacity]);

  const premiumAnim = useAnimatedStyle(() => ({ opacity: premiumOpacity.value }));

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideContent}>
        <Text style={styles.title}>{t('onboarding.slides.free.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.slides.free.body')}</Text>
        <View style={styles.slide3Visual}>
          <CounterPill />
          <View style={{ height: 24 }} />
          <CardStack />
          <Animated.View style={[styles.premiumHint, premiumAnim]}>
            <Text style={styles.premiumText}>{t('onboarding.slides.free.premium')}</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

// ─── Main ────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const [pageIndex, setPageIndex] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const total = 3;

  const dots = useMemo(
    () =>
      Array.from({ length: total }, (_, i) => (
        <View
          key={`dot-${i}`}
          style={[
            styles.dot,
            {
              backgroundColor: i === pageIndex ? COLORS.dotActive : COLORS.dotInactive,
              width: i === pageIndex ? 20 : 7,
            },
          ]}
        />
      )),
    [pageIndex],
  );

  const finishOnboarding = async () => {
    await setHasSeenOnboarding(true);
    router.replace('/');
  };

  const isLast = pageIndex === total - 1;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 60 }} />
        <View style={{ flex: 1 }} />
        <Pressable onPress={finishOnboarding} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.skipText}>{t('common.skip')}</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <ScrollView
        ref={(ref) => { scrollRef.current = ref; }}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setPageIndex(next);
        }}
      >
        <Slide1 />
        <Slide2 />
        <Slide3 />
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>{dots}</View>

      {/* Bottom buttons */}
      <View style={styles.bottomArea}>
        {pageIndex > 0 ? (
          <Pressable
            onPress={() => {
              const prev = Math.max(0, pageIndex - 1);
              scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * prev, animated: true });
              setPageIndex(prev);
            }}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>{t('common.back')}</Text>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable
          onPress={() => {
            if (isLast) {
              finishOnboarding();
              return;
            }
            const next = Math.min(total - 1, pageIndex + 1);
            scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * next, animated: true });
            setPageIndex(next);
          }}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={styles.primaryBtnText}>
            {isLast ? t('onboarding.start') : t('common.next')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipText: {
    color: COLORS.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 14,
  },

  // Slides
  slide: {
    flex: 1,
    paddingHorizontal: 28,
  },
  slideContent: {
    flex: 1,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.extraBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },

  // Map
  mapContainer: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  // Slide 1: mini cards row
  miniCardsRow: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
  },

  // Slide 2: record card
  recordCardWrapper: {
    alignItems: 'center',
    marginTop: 4,
  },

  // Slide 3: counter + cards
  slide3Visual: {
    alignItems: 'center',
    marginTop: 8,
  },
  premiumHint: {
    marginTop: 16,
  },
  premiumText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: COLORS.textSecondary,
  },

  // Dots (active is elongated)
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  dot: {
    height: 7,
    borderRadius: 3.5,
  },

  // Bottom
  bottomArea: {
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 34,
    flexDirection: 'row',
    gap: 12,
  },
  backBtn: {
    flex: 1,
    height: 52,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBtnText: {
    color: COLORS.textSecondary,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  primaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryBtn,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.extraBold,
    fontSize: 17,
  },
});
