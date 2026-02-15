import { Modal, Pressable, Text, View } from 'react-native';

import { t } from '@/src/i18n';
import { NeuCard } from '@/src/ui/NeuCard';

const UI = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  } as const,
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#E9E4DA',
    borderRadius: 20,
    padding: 18,
  } as const,
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  } as const,
  sub: {
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 12,
  } as const,
  badge: {
    alignSelf: 'center',
    backgroundColor: '#FDE68A',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 10,
  } as const,
  badgeText: {
    fontWeight: '800',
    color: '#92400E',
  } as const,
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  } as const,
  statLabel: {
    color: '#6B7280',
  } as const,
  statValue: {
    fontWeight: '800',
    color: '#111827',
  } as const,
  primaryBtn: {
    marginTop: 12,
    backgroundColor: '#4F78FF',
    paddingVertical: 12,
    borderRadius: 28,
    alignItems: 'center',
  } as const,
};

type Props = {
  visible: boolean;
  streak: number;
  totalDays: number;
  onClose: () => void;
};

export function LoginBonusModal({ visible, streak, totalDays, onClose }: Props) {
  const nextStreakTarget = 7;
  const remaining = Math.max(0, nextStreakTarget - streak);
  const showNext = remaining > 0;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={UI.overlay}>
        <NeuCard style={UI.card}>
          <Text style={UI.title}>{t('loginBonus.title')}</Text>
          <Text style={UI.sub}>{t('loginBonus.subtitle')}</Text>
          <View style={UI.badge}>
            <Text style={UI.badgeText}>{t('loginBonus.badge')}</Text>
          </View>
          <View style={UI.statRow}>
            <Text style={UI.statLabel}>{t('loginBonus.streakLabel')}</Text>
            <Text style={UI.statValue}>{t('profile.countDays', { count: streak })}</Text>
          </View>
          <View style={UI.statRow}>
            <Text style={UI.statLabel}>{t('loginBonus.totalLabel')}</Text>
            <Text style={UI.statValue}>{t('profile.countDays', { count: totalDays })}</Text>
          </View>
          {showNext && (
            <View style={UI.statRow}>
              <Text style={UI.statLabel}>{t('loginBonus.nextLabel')}</Text>
              <Text style={UI.statValue}>{t('loginBonus.remaining', { count: remaining })}</Text>
            </View>
          )}
          <Pressable onPress={onClose} style={UI.primaryBtn}>
            <Text style={{ color: 'white', fontWeight: '900' }}>{t('common.ok')}</Text>
          </Pressable>
        </NeuCard>
      </View>
    </Modal>
  );
}
