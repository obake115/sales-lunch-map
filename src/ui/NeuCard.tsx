import React, { useCallback } from 'react';
import { Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useThemeColors } from '../state/ThemeContext';

type Props = {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
};

export function NeuCard({ style, children, onPress, disabled }: Props) {
  const colors = useThemeColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.97, { duration: 120 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 120 });
  }, [scale]);

  if (Platform.OS === 'android') {
    const card = (
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

    if (!onPress) return card;

    return (
      <Pressable onPress={onPress} disabled={disabled} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View style={animatedStyle}>{card}</Animated.View>
      </Pressable>
    );
  }

  const card = (
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

  if (!onPress) return card;

  return (
    <Pressable onPress={onPress} disabled={disabled} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={animatedStyle}>{card}</Animated.View>
    </Pressable>
  );
}
