import React, { useMemo } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';

type Props = {
  width?: number;
  height?: number;
  onPress?: (payload: { x: number; y: number; width: number; height: number }) => void;
  children?: React.ReactNode;
};

const MAP_SOURCE = require('@/assets/maps/japan_beige.png');

export function JapanMapStage({ width, height, onPress, children }: Props) {
  const { width: screenWidth } = useWindowDimensions();

  const { stageWidth, stageHeight } = useMemo(() => {
    const resolved = Image.resolveAssetSource(MAP_SOURCE);
    const ratio =
      resolved?.width && resolved?.height ? resolved.width / resolved.height : 1.4;
    const defaultWidth = Math.max(0, screenWidth - 32);
    let w = typeof width === 'number' ? width : defaultWidth;
    let h = typeof height === 'number' ? height : w / ratio;
    if (typeof height !== 'number') {
      const maxHeight = Math.min(360, defaultWidth * 0.9);
      if (h > maxHeight) {
        h = maxHeight;
        w = h * ratio;
      }
    }
    return { stageWidth: w, stageHeight: h };
  }, [height, screenWidth, width]);

  const handlePress = (event: GestureResponderEvent) => {
    if (!event || !onPress) return;
    const { locationX, locationY } = event.nativeEvent;
    onPress({ x: locationX, y: locationY, width: stageWidth, height: stageHeight });
  };

  return (
    <View style={[styles.stage, { width: stageWidth, height: stageHeight }]}>
      <Image source={MAP_SOURCE} style={styles.map} resizeMode="contain" />
      <Pressable style={styles.hitArea} onPress={handlePress}>
        <View style={styles.overlay}>{children}</View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    position: 'relative',
    alignSelf: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  hitArea: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});
