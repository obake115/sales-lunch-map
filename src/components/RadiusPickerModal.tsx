import { Picker } from '@react-native-picker/picker';
import { Modal, Pressable, Text, View } from 'react-native';

import { fonts } from '@/src/ui/fonts';
import { t } from '@/src/i18n';

const OPTIONS = [100, 200, 300, 400, 500] as const;

const UI = {
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  } as const,
  sheet: {
    backgroundColor: '#E9E4DA',
    paddingTop: 12,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  } as const,
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  } as const,
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: '#111827',
  } as const,
  actionText: {
    color: '#4F78FF',
    fontFamily: fonts.bold,
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
            <Text style={UI.title}>{t('radiusPicker.title')}</Text>
            <Pressable onPress={onClose}>
              <Text style={UI.actionText}>{t('radiusPicker.done')}</Text>
            </Pressable>
          </View>
          <Picker selectedValue={value} onValueChange={(next) => onChange(Number(next))}>
            {OPTIONS.map((option) => (
              <Picker.Item key={option} label={t('radiusPicker.optionLabel', { value: option })} value={option} />
            ))}
          </Picker>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
