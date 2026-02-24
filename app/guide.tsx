import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ScrollView, Text, View } from 'react-native';

import { t } from '@/src/i18n';
import { useThemeColors } from '@/src/state/ThemeContext';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

type GuideItem = {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  iconColor: string;
  titleKey: string;
  bodyKey: string;
};

const ITEMS: GuideItem[] = [
  { icon: 'map-marker', iconColor: '#EF4444', titleKey: 'guide.mapTitle', bodyKey: 'guide.mapBody' },
  { icon: 'search', iconColor: '#3B82F6', titleKey: 'guide.listTitle', bodyKey: 'guide.listBody' },
  { icon: 'users', iconColor: '#8B5CF6', titleKey: 'guide.sharedTitle', bodyKey: 'guide.sharedBody' },
  { icon: 'globe', iconColor: '#10B981', titleKey: 'guide.everyoneTitle', bodyKey: 'guide.everyoneBody' },
  { icon: 'camera', iconColor: '#F59E0B', titleKey: 'guide.albumTitle', bodyKey: 'guide.albumBody' },
  { icon: 'plane', iconColor: '#06B6D4', titleKey: 'guide.travelTitle', bodyKey: 'guide.travelBody' },
  { icon: 'bell', iconColor: '#F97316', titleKey: 'guide.remindTitle', bodyKey: 'guide.remindBody' },
  { icon: 'star', iconColor: '#EAB308', titleKey: 'guide.favoriteTitle', bodyKey: 'guide.favoriteBody' },
];

export default function GuideScreen() {
  const colors = useThemeColors();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }}>
      <Text style={{ fontSize: 14, color: colors.subText, fontFamily: fonts.regular, marginBottom: 4 }}>
        {t('guide.intro')}
      </Text>
      {ITEMS.map((item) => (
        <NeuCard key={item.titleKey} style={{ padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: `${item.iconColor}18`,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <FontAwesome name={item.icon} size={20} color={item.iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: fonts.bold, color: colors.text }}>
              {t(item.titleKey)}
            </Text>
            <Text style={{ fontSize: 13, color: colors.subText, fontFamily: fonts.regular, marginTop: 2, lineHeight: 18 }}>
              {t(item.bodyKey)}
            </Text>
          </View>
        </NeuCard>
      ))}
    </ScrollView>
  );
}
