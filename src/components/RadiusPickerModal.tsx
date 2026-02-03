import { Picker } from '@react-native-picker/picker';
import { Modal, Pressable, Text, View } from 'react-native';

const OPTIONS = [100, 200, 300, 400, 500] as const;

const UI = {
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  } as const,
  sheet: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  } as const,
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  } as const,
  title: {
    fontWeight: '800',
    fontSize: 16,
    color: '#111827',
  } as const,
  actionText: {
    color: '#2563EB',
    fontWeight: '700',
  } as const,
};

type Props = {
  visible: boolean;
  value: number;
  onChange: (value: number) => void;
  onClose: () => void;
};

export function RadiusPickerModal({ visible, value, onChange, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={UI.overlay} onPress={onClose}>
        <Pressable style={UI.sheet} onPress={() => undefined}>
          <View style={UI.sheetHeader}>
            <Text style={UI.title}>距離範囲を選択</Text>
            <Pressable onPress={onClose}>
              <Text style={UI.actionText}>完了</Text>
            </Pressable>
          </View>
          <Picker selectedValue={value} onValueChange={(next) => onChange(Number(next))}>
            {OPTIONS.map((option) => (
              <Picker.Item key={option} label={`${option}m`} value={option} />
            ))}
          </Picker>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
