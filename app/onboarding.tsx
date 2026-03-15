import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';

import { t } from '@/src/i18n';
import { useThemeColors } from '@/src/state/ThemeContext';
import { setHasSeenOnboarding } from '@/src/storage';
import { JapanMapInteractive } from '@/src/ui/JapanMapInteractive';
import { fonts } from '@/src/ui/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_SLIDES = 5;

// ─── Slide 1: Welcome — map fills up ─────────────────
function SlideWelcome() {
  const colors = useThemeColors();
  const opacity = useSharedValue(0);
  const [animatedPref, setAnimatedPref] = useState<string | null>(null);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    const timer = setTimeout(() => setAnimatedPref('aichi'), 600);
    return () => clearTimeout(timer);
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const visitedPrefs = useMemo(
    () => new Set(['osaka', 'fukuoka', 'hokkaido', 'shimane', 'miyagi', ...(animatedPref ? [animatedPref] : [])]),
    [animatedPref],
  );

  const breathingPrefs = useMemo(
    () => (animatedPref ? new Set([animatedPref]) : undefined),
    [animatedPref],
  );

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideContent}>
        <Text style={[styles.title, { color: colors.text }]}>{t('onboarding.slides.welcome.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.subText }]}>{t('onboarding.slides.welcome.body')}</Text>
        <Animated.View style={[styles.mapContainer, animStyle]}>
          <JapanMapInteractive
            height={260}
            fillDefault="#F5F0E8"
            fillSelected={`${colors.accent}B3`}
            fillVisited="#E78FB3"
            selectedPref="tokyo"
            visitedPrefs={visitedPrefs}
            stroke={colors.border}
            strokeWidth={0.8}
            breathing={!!animatedPref}
            breathingPrefs={breathingPrefs}
          />
        </Animated.View>
        {/* Progress counter */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
          <Text style={{ fontSize: 32, fontFamily: fonts.extraBold, color: colors.accent }}>6</Text>
          <Text style={{ fontSize: 18, fontFamily: fonts.medium, color: colors.subText }}> / 47</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Slide 2: Record — FAB with 4 actions ────────────
function SlideRecord() {
  const colors = useThemeColors();

  const actions = [
    { emoji: '📍', label: t('home.actionMap'), color: '#E67E22' },
    { emoji: '🗾', label: t('home.actionTravel'), color: '#9B59B6' },
    { emoji: '👥', label: t('home.actionShared'), color: '#3498DB' },
    { emoji: '📸', label: t('home.actionAlbum'), color: '#2ECC71' },
  ];

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideContent}>
        <Text style={[styles.title, { color: colors.text }]}>{t('onboarding.slides.record.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.subText }]}>{t('onboarding.slides.record.body')}</Text>

        {/* FAB mockup */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{
            backgroundColor: colors.primary,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 28,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
          }}>
            <Text style={{ color: 'white', fontSize: 16 }}>+</Text>
            <Text style={{ color: 'white', fontFamily: fonts.extraBold, fontSize: 15 }}>
              {t('home.recordLunch')}
            </Text>
          </View>
        </View>

        {/* 4 action items */}
        <View style={{ width: '100%', gap: 10, paddingHorizontal: 8 }}>
          {actions.map((action, i) => {
            const ItemWrapper = ({ children }: { children: React.ReactNode }) => {
              const itemOpacity = useSharedValue(0);
              const itemTranslateY = useSharedValue(16);
              useEffect(() => {
                itemOpacity.value = withDelay(200 + i * 120, withTiming(1, { duration: 400 }));
                itemTranslateY.value = withDelay(200 + i * 120, withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }));
              }, [itemOpacity, itemTranslateY]);
              const animStyle = useAnimatedStyle(() => ({
                opacity: itemOpacity.value,
                transform: [{ translateY: itemTranslateY.value }],
              }));
              return <Animated.View style={animStyle}>{children}</Animated.View>;
            };

            return (
              <ItemWrapper key={action.label}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: colors.card,
                  borderRadius: 14,
                  padding: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 1, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                }}>
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: `${action.color}18`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 18 }}>{action.emoji}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontFamily: fonts.bold, color: colors.text }}>{action.label}</Text>
                </View>
              </ItemWrapper>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Slide 3: Food Badges ────────────────────────────
function SlideBadges() {
  const colors = useThemeColors();

  const badgeItems = [
    { name: '北海道', image: require('@/assets/badges/hokkaido_ramen.png'), earned: true },
    { name: '青森', image: require('@/assets/badges/aomori_apple.png'), earned: true },
    { name: '宮城', image: require('@/assets/badges/miyagi_beef_tongue.png'), earned: true },
    { name: '???', image: null, earned: false },
    { name: '???', image: null, earned: false },
    { name: '愛知', image: require('@/assets/badges/aichi_miso_katsu.png'), earned: true },
    { name: '???', image: null, earned: false },
    { name: '大阪', image: require('@/assets/badges/osaka_takoyaki.png'), earned: true },
  ];

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideContent}>
        <Text style={[styles.title, { color: colors.text }]}>{t('onboarding.slides.badges.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.subText }]}>{t('onboarding.slides.badges.body')}</Text>

        {/* Badge grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 8 }}>
          {badgeItems.map((item, i) => {
            const ItemWrapper = ({ children }: { children: React.ReactNode }) => {
              const scale = useSharedValue(0);
              useEffect(() => {
                scale.value = withDelay(200 + i * 100, withSpring(1, { damping: 10, stiffness: 150 }));
              }, [scale]);
              const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
              return <Animated.View style={animStyle}>{children}</Animated.View>;
            };

            return (
              <ItemWrapper key={`${item.name}-${i}`}>
                <View style={{
                  width: 72,
                  height: 88,
                  borderRadius: 14,
                  backgroundColor: item.earned ? 'transparent' : colors.chipBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {item.earned && item.image ? (
                    <Image source={item.image} style={{ width: 48, height: 48 }} resizeMode="contain" />
                  ) : (
                    <Text style={{ fontSize: 20, color: colors.subText }}>?</Text>
                  )}
                  <Text style={{
                    fontSize: 10,
                    fontFamily: fonts.bold,
                    color: item.earned ? colors.accentText : colors.subText,
                    marginTop: 4,
                  }}>{item.name}</Text>
                </View>
              </ItemWrapper>
            );
          })}
        </View>

        {/* Progress hint */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 20 }}>
          <Text style={{ fontSize: 28, fontFamily: fonts.extraBold, color: colors.accent }}>5</Text>
          <Text style={{ fontSize: 16, fontFamily: fonts.medium, color: colors.subText }}> / 47</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Slide 4: Shared Maps ────────────────────────────
function SlideShare() {
  const colors = useThemeColors();

  const members = ['🧑‍💼', '👩', '👨‍🍳'];

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideContent}>
        <Text style={[styles.title, { color: colors.text }]}>{t('onboarding.slides.share.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.subText }]}>{t('onboarding.slides.share.body')}</Text>

        {/* Shared map card mockup */}
        <View style={{
          width: '100%',
          backgroundColor: colors.card,
          borderRadius: 20,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          alignItems: 'center',
          gap: 16,
        }}>
          {/* Map name */}
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 16, fontFamily: fonts.extraBold, color: colors.text }}>
              営業チームのランチマップ
            </Text>
            <Text style={{ fontSize: 12, fontFamily: fonts.medium, color: colors.subText }}>
              コード: ABC123
            </Text>
          </View>

          {/* Members */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {members.map((emoji, i) => {
              const ItemWrapper = ({ children }: { children: React.ReactNode }) => {
                const scale = useSharedValue(0);
                useEffect(() => {
                  scale.value = withDelay(400 + i * 200, withSpring(1, { damping: 8, stiffness: 150 }));
                }, [scale]);
                const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
                return <Animated.View style={animStyle}>{children}</Animated.View>;
              };

              return (
                <ItemWrapper key={i}>
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: colors.chipBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                  </View>
                </ItemWrapper>
              );
            })}
          </View>

          {/* Store pins mockup */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            {['駅前ラーメン', 'カフェBeans', '定食やまと'].map((name, i) => (
              <View key={i} style={{
                backgroundColor: colors.chipBg,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 8,
                alignItems: 'center',
              }}>
                <Text style={{ fontSize: 14, marginBottom: 2 }}>📍</Text>
                <Text style={{ fontSize: 9, fontFamily: fonts.bold, color: colors.text }}>{name}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Slide 5: Free tier ──────────────────────────────
function SlideFree() {
  const colors = useThemeColors();
  const premiumOpacity = useSharedValue(0);

  useEffect(() => {
    premiumOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
  }, [premiumOpacity]);

  const premiumAnim = useAnimatedStyle(() => ({ opacity: premiumOpacity.value }));

  const features = [
    { icon: '📍', label: 'マップ登録' },
    { icon: '🗾', label: '旅のランチ' },
    { icon: '👥', label: '共有マップ' },
    { icon: '📸', label: 'アルバム' },
    { icon: '🏅', label: '名物バッジ' },
    { icon: '📊', label: '統計' },
  ];

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideContent}>
        <Text style={[styles.title, { color: colors.text }]}>{t('onboarding.slides.free.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.subText }]}>{t('onboarding.slides.free.body')}</Text>

        {/* Feature chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 20, paddingHorizontal: 8 }}>
          {features.map((f, i) => {
            const ChipWrapper = ({ children }: { children: React.ReactNode }) => {
              const chipOpacity = useSharedValue(0);
              useEffect(() => {
                chipOpacity.value = withDelay(200 + i * 100, withTiming(1, { duration: 400 }));
              }, [chipOpacity]);
              const animStyle = useAnimatedStyle(() => ({ opacity: chipOpacity.value }));
              return <Animated.View style={animStyle}>{children}</Animated.View>;
            };

            return (
              <ChipWrapper key={f.label}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: colors.card,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 20,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                }}>
                  <Text style={{ fontSize: 16 }}>{f.icon}</Text>
                  <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.text }}>{f.label}</Text>
                </View>
              </ChipWrapper>
            );
          })}
        </View>

        {/* Free note */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 16,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
        }}>
          <Text style={{ fontSize: 13, fontFamily: fonts.medium, color: colors.subText, textAlign: 'center', lineHeight: 20 }}>
            {t('onboarding.slides.free.freeNote')}
          </Text>
          <Animated.View style={[{ marginTop: 10 }, premiumAnim]}>
            <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.accent, textAlign: 'center' }}>
              {t('onboarding.slides.free.premium')}
            </Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

// ─── Main ────────────────────────────────────────────
export default function OnboardingScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [pageIndex, setPageIndex] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);

  const dots = useMemo(
    () =>
      Array.from({ length: TOTAL_SLIDES }, (_, i) => (
        <View
          key={`dot-${i}`}
          style={[
            styles.dot,
            {
              backgroundColor: i === pageIndex ? colors.accent : `${colors.text}2E`,
              width: i === pageIndex ? 20 : 7,
            },
          ]}
        />
      )),
    [pageIndex, colors],
  );

  const finishOnboarding = async () => {
    await setHasSeenOnboarding(true);
    router.replace('/');
  };

  const isLast = pageIndex === TOTAL_SLIDES - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 60 }} />
        <View style={{ flex: 1 }} />
        <Pressable onPress={finishOnboarding} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.skipText, { color: colors.subText }]}>{t('common.skip')}</Text>
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
        <SlideWelcome />
        <SlideRecord />
        <SlideBadges />
        <SlideShare />
        <SlideFree />
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>{dots}</View>

      {/* Bottom buttons */}
      <View style={styles.bottomArea}>
        {isLast && (
          <Text style={[styles.planChangeHint, { color: colors.subText }]}>{t('onboarding.slides.free.planChangeHint')}</Text>
        )}
        <View style={styles.bottomButtons}>
          {pageIndex > 0 ? (
            <Pressable
              onPress={() => {
                const prev = Math.max(0, pageIndex - 1);
                scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * prev, animated: true });
                setPageIndex(prev);
              }}
              style={[styles.backBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
            >
              <Text style={[styles.backBtnText, { color: colors.subText }]}>{t('common.back')}</Text>
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
              const next = Math.min(TOTAL_SLIDES - 1, pageIndex + 1);
              scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * next, animated: true });
              setPageIndex(next);
            }}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary },
              isLast && styles.primaryBtnLast,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={[styles.primaryBtnText, { color: colors.card }]}>
              {isLast ? t('onboarding.start') : t('common.next')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 28,
  },
  slideContent: {
    flex: 1,
    paddingTop: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.extraBold,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.medium,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  mapContainer: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
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
  bottomArea: {
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 34,
  },
  planChangeHint: {
    fontSize: 12,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginBottom: 8,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  backBtn: {
    flex: 1,
    height: 52,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  backBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  primaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  primaryBtnLast: {
    height: 60,
    borderRadius: 30,
  },
  primaryBtnText: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
  },
});
