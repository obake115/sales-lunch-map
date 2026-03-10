import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, SafeAreaView, Text, View } from 'react-native';

import { t } from '@/src/i18n';
import { fonts } from '@/src/ui/fonts';
import { useThemeColors } from '@/src/state/ThemeContext';
import { NeuCard } from '@/src/ui/NeuCard';

export default function ShareTargetScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();

  const options = [
    { key: 'map', title: t('shareTarget.mapTitle'), desc: t('shareTarget.mapDesc'), route: '/store/new' },
    { key: 'travel', title: t('shareTarget.travelTitle'), desc: t('shareTarget.travelDesc'), route: '/travel/new' },
    { key: 'album', title: t('shareTarget.albumTitle'), desc: t('shareTarget.albumDesc'), route: '/reminders' },
  ] as const;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 20 }}>
        <Text style={{ fontSize: 18, fontFamily: fonts.bold, color: colors.text, marginBottom: 16 }}>
          {t('shareTarget.title')}
        </Text>

        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={{ width: 120, height: 120, borderRadius: 12, alignSelf: 'center', marginBottom: 20 }}
          />
        ) : null}

        {options.map((opt) => (
          <NeuCard key={opt.key} style={{ backgroundColor: colors.card, marginBottom: 12, borderRadius: 16, padding: 16 }}>
            <Pressable
              onPress={() => router.replace({ pathname: opt.route as any, params: { sharedPhotoUri: photoUri } })}
            >
              <Text style={{ fontSize: 15, fontFamily: fonts.bold, color: colors.text, marginBottom: 4 }}>{opt.title}</Text>
              <Text style={{ fontSize: 13, color: colors.subText }}>{opt.desc}</Text>
            </Pressable>
          </NeuCard>
        ))}
      </View>
    </SafeAreaView>
  );
}
