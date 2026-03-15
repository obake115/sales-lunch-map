import { Picker } from '@react-native-picker/picker';
import { Modal, Pressable, Text, View } from 'react-native';

import { fonts } from '@/src/ui/fonts';
import { t } from '@/src/i18n';
import { useThemeColors } from '@/src/state/ThemeContext';

const OPTIONS = [100, 200, 300, 400, 500] as const;

const UI = {
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  } as const,
  sheet: {
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
  } as const,
  actionText: {
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
  const colors = useThemeColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={UI.overlay} onPress={onClose}>
        <Pressable style={[UI.sheet, { backgroundColor: colors.card }]} onPress={() => undefined}>
          <View style={UI.sheetHeader}>
            <Text style={[UI.title, { color: colors.text }]}>{t('radiusPicker.title')}</Text>
            <Pressable onPress={onClose}>
              <Text style={[UI.actionText, { color: colors.primary }]}>{t('radiusPicker.done')}</Text>
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
