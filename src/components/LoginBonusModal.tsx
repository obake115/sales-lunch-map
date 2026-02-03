import { Modal, Pressable, Text, View } from 'react-native';

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
    backgroundColor: '#FFFEF8',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E7E2D5',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
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
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 14,
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
        <View style={UI.card}>
          <Text style={UI.title}>今日のログイン</Text>
          <Text style={UI.sub}>おかえりなさい！</Text>
          <View style={UI.badge}>
            <Text style={UI.badgeText}>+1 日</Text>
          </View>
          <View style={UI.statRow}>
            <Text style={UI.statLabel}>連続利用</Text>
            <Text style={UI.statValue}>{streak}日</Text>
          </View>
          <View style={UI.statRow}>
            <Text style={UI.statLabel}>累計ログイン</Text>
            <Text style={UI.statValue}>{totalDays}日</Text>
          </View>
          {showNext && (
            <View style={UI.statRow}>
              <Text style={UI.statLabel}>次の称号まで</Text>
              <Text style={UI.statValue}>あと{remaining}日</Text>
            </View>
          )}
          <Pressable onPress={onClose} style={UI.primaryBtn}>
            <Text style={{ color: 'white', fontWeight: '900' }}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
