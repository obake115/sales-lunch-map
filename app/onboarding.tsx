import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { t } from '@/src/i18n';
import { setHasSeenOnboarding } from '@/src/storage';

export default function OnboardingScreen() {
  const router = useRouter();
  const width = Dimensions.get('window').width;
  const [pageIndex, setPageIndex] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const slides = useMemo(
    () => [
      {
        title: t('onboarding.slides.welcome.title'),
        body: t('onboarding.slides.welcome.body'),
        helper: null,
        image: require('@/assets/images/onboarding-1.png'),
      },
      {
        title: t('onboarding.slides.easy.title'),
        body: t('onboarding.slides.easy.body'),
        helper: null,
        image: require('@/assets/images/onboarding-2.png'),
      },
      {
        title: t('onboarding.slides.free.title'),
        body: t('onboarding.slides.free.body'),
        helper: t('onboarding.slides.free.helper'),
        image: require('@/assets/images/onboarding-3.png'),
      },
    ],
    []
  );
  const total = slides.length;

  const dots = useMemo(
    () =>
      slides.map((_, index) => (
        <View
          key={`dot-${index}`}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: index === pageIndex ? '#FFA726' : '#E5E7EB',
          }}
        />
      )),
    [pageIndex]
  );

  const finishOnboarding = async () => {
    await setHasSeenOnboarding(true);
    router.replace('/');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FBF3E8' }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <View style={{ width: 60 }} />
        <Text style={{ fontWeight: '900', color: '#1F2937' }}>{t('onboarding.header')}</Text>
        <Pressable onPress={finishOnboarding}>
          <Text style={{ color: '#6B7280', fontWeight: '700' }}>{t('common.skip')}</Text>
        </Pressable>
      </View>
      <ScrollView
        ref={(ref) => {
          scrollRef.current = ref;
        }}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          setPageIndex(next);
        }}>
        {slides.map((slide) => (
          <View key={slide.title} style={{ width, paddingHorizontal: 24, paddingTop: 10 }}>
            <View
              style={{
                borderRadius: 18,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#E7E2D5',
                padding: 20,
                minHeight: 380,
                justifyContent: 'center',
                gap: 16,
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#1F2937', textAlign: 'center' }}>
                {slide.title}
              </Text>
              <Text style={{ color: '#6B7280', textAlign: 'center', lineHeight: 22 }}>{slide.body}</Text>
              {slide.helper ? (
                <Text style={{ color: '#6B7280', textAlign: 'center', fontSize: 12 }}>{slide.helper}</Text>
              ) : null}
              <View
                style={{
                  height: 170,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#F1E5D7',
                  backgroundColor: '#FFF7ED',
                  overflow: 'hidden',
                }}>
                <Image source={slide.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 12 }}>{dots}</View>
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 10,
          paddingBottom: 18,
          flexDirection: 'row',
          gap: 10,
        }}>
        {pageIndex > 0 ? (
          <Pressable
            onPress={() => {
              const prevIndex = Math.max(0, pageIndex - 1);
              scrollRef.current?.scrollTo({ x: width * prevIndex, animated: true });
              setPageIndex(prevIndex);
            }}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              backgroundColor: '#FFFFFF',
            }}>
            <Text style={{ color: '#6B7280', fontWeight: '800' }}>{t('common.back')}</Text>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable
          onPress={() => {
            if (pageIndex === total - 1) {
              finishOnboarding();
              return;
            }
            const nextIndex = Math.min(total - 1, pageIndex + 1);
            scrollRef.current?.scrollTo({ x: width * nextIndex, animated: true });
            setPageIndex(nextIndex);
          }}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFA726',
          }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>
            {pageIndex === total - 1 ? t('onboarding.start') : t('common.next')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
