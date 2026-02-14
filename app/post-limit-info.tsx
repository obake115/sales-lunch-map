import { ScrollView, Text, View } from 'react-native';

import { t } from '@/src/i18n';

const UI = {
  card: {
    borderWidth: 1,
    borderColor: '#E7E2D5',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFEF8',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
        <View style={UI.card}>
          <Text style={UI.title}>{t('postLimitInfo.section1Title')}</Text>
          <Text style={UI.body}>{t('postLimitInfo.section1Body')}</Text>
        </View>
        <View style={UI.card}>
          <Text style={UI.title}>{t('postLimitInfo.section2Title')}</Text>
          <Text style={UI.body}>{t('postLimitInfo.section2Body')}</Text>
        </View>
        <View style={UI.card}>
          <Text style={UI.title}>{t('postLimitInfo.section3Title')}</Text>
          <Text style={UI.body}>{t('postLimitInfo.section3Body')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
