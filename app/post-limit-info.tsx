import { ScrollView, Text, View } from 'react-native';

import { t } from '@/src/i18n';
import { NeuCard } from '@/src/ui/NeuCard';

const UI = {
  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#E9E4DA',
  } as const,
  title: {
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 8,
    color: '#111827',
  } as const,
  body: {
    color: '#6B7280',
    lineHeight: 20,
  } as const,
} as const;

export default function PostLimitInfoScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}>
        <NeuCard style={UI.card}>
          <Text style={UI.title}>{t('postLimitInfo.section1Title')}</Text>
          <Text style={UI.body}>{t('postLimitInfo.section1Body')}</Text>
        </NeuCard>
        <NeuCard style={UI.card}>
          <Text style={UI.title}>{t('postLimitInfo.section2Title')}</Text>
          <Text style={UI.body}>{t('postLimitInfo.section2Body')}</Text>
        </NeuCard>
        <NeuCard style={UI.card}>
          <Text style={UI.title}>{t('postLimitInfo.section3Title')}</Text>
          <Text style={UI.body}>{t('postLimitInfo.section3Body')}</Text>
        </NeuCard>
      </ScrollView>
    </View>
  );
}
