import React from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeColors } from '../state/ThemeContext';

type Props = {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export function NeuCard({ style, children }: Props) {
  const colors = useThemeColors();

  if (Platform.OS === 'android') {
    return (
      <View
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: 20,
            elevation: 6,
          },
          style,
        ]}>
        {children}
      </View>
    );
  }

  return (
    <View
      style={{
        shadowColor: colors.shadowLight,
        shadowOffset: { width: -4, height: -4 },
        shadowOpacity: 0.7,
        shadowRadius: 6,
      }}>
      <View
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: 20,
            shadowColor: colors.shadowDark,
            shadowOffset: { width: 4, height: 4 },
            shadowOpacity: 0.6,
            shadowRadius: 6,
          },
          style,
        ]}>
        {children}
      </View>
    </View>
  );
}
