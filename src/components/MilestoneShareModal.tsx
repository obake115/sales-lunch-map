import { useRef } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { t } from '@/src/i18n';
import { captureAndShare } from '@/src/shareCardCapture';
import { useThemeColors } from '@/src/state/ThemeContext';
import { fonts } from '@/src/ui/fonts';
import { NeuCard } from '@/src/ui/NeuCard';

export type MilestoneType = 'newPref' | 'tenPrefs' | 'fiftyStores' | 'badge';

type Props = {
  visible: boolean;
  milestoneType: MilestoneType;
  prefName?: string;
  visitedCount: number;
  storeCount: number;
  onClose: () => void;
};

function getMilestoneEmoji(type: MilestoneType): string {
  switch (type) {
    case 'newPref': return '🗾';
    case 'tenPrefs': return '🎉';
    case 'fiftyStores': return '🏆';
    case 'badge': return '🍽';
  }
}

export function MilestoneShareModal({
  visible,
  milestoneType,
  prefName,
  visitedCount,
  storeCount,
  onClose,
}: Props) {
  const colors = useThemeColors();
  const cardRef = useRef<View>(null);
  const percent = Math.round((visitedCount / 47) * 100);

  const titleKey = `milestone.${milestoneType}Title` as const;
  const bodyKey = `milestone.${milestoneType}Body` as const;

  const shareText = `${t('milestone.shareText', { count: visitedCount, percent })} #LunchMap\nhttps://apps.apple.com/jp/app/%E3%83%A9%E3%83%B3%E3%83%81%E3%83%9E%E3%83%83%E3%83%97-lunchmap/id6758890590`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <View ref={cardRef} collapsable={false}>
          <NeuCard style={{
            width: 300,
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 24,
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>
              {getMilestoneEmoji(milestoneType)}
            </Text>

            <Text style={{
              fontSize: 18,
              fontFamily: fonts.extraBold,
              color: colors.text,
              textAlign: 'center',
              marginBottom: 6,
            }}>
              {t(titleKey, { prefName, count: visitedCount, storeCount })}
            </Text>

            <Text style={{
              fontSize: 14,
              fontFamily: fonts.medium,
              color: colors.subText,
              textAlign: 'center',
              marginBottom: 16,
            }}>
              {t(bodyKey, { count: visitedCount, percent, storeCount })}
            </Text>

            <View style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              marginBottom: 6,
            }}>
              <Text style={{
                fontSize: 36,
                fontFamily: fonts.extraBold,
                color: colors.accent,
              }}>{visitedCount}</Text>
              <Text style={{
                fontSize: 14,
                fontFamily: fonts.bold,
                color: colors.subText,
                marginLeft: 2,
              }}> / 47</Text>
              <Text style={{
                fontSize: 14,
                fontFamily: fonts.bold,
                color: colors.accent,
                marginLeft: 8,
              }}>{percent}%</Text>
            </View>

            <Text style={{
              fontSize: 11,
              fontFamily: fonts.bold,
              color: colors.subText,
              marginBottom: 4,
            }}>#LunchMap</Text>
          </NeuCard>
        </View>

        <View style={{ width: 300, marginTop: 12, gap: 10 }}>
          <Pressable
            onPress={() => captureAndShare(cardRef.current, shareText)}
            style={{
              width: '100%',
              backgroundColor: colors.pink,
              paddingVertical: 12,
              borderRadius: 28,
              alignItems: 'center',
            }}>
            <Text style={{ color: 'white', fontFamily: fonts.extraBold }}>
              📸 {t('milestone.share')}
            </Text>
          </Pressable>

          <Pressable onPress={onClose} style={{
            width: '100%',
            backgroundColor: colors.primary,
            paddingVertical: 12,
            borderRadius: 28,
            alignItems: 'center',
          }}>
            <Text style={{ color: 'white', fontFamily: fonts.extraBold }}>
              {t('common.ok')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
