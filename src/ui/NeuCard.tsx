import React from 'react';
import { Platform, View, type ViewStyle } from 'react-native';

type Props = {
  style?: ViewStyle;
  children: React.ReactNode;
};

export function NeuCard({ style, children }: Props) {
  if (Platform.OS === 'android') {
    return (
      <View
        style={[
          {
            backgroundColor: '#E9E4DA',
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
        shadowColor: '#FFFFFF',
        shadowOffset: { width: -4, height: -4 },
        shadowOpacity: 0.7,
        shadowRadius: 6,
      }}>
      <View
        style={[
          {
            backgroundColor: '#E9E4DA',
            borderRadius: 20,
            shadowColor: '#C8C3B9',
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
