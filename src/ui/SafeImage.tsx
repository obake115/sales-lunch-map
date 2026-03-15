import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useState } from 'react';
import {
  Image,
  ImageBackground,
  View,
  type ImageBackgroundProps,
  type ImageProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useThemeColors } from '../state/ThemeContext';

type SafeImageProps = Omit<ImageProps, 'source'> & {
  uri: string | undefined | null;
  placeholderStyle?: StyleProp<ViewStyle>;
};

function Placeholder({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.chipBg ?? '#D5D0C6',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      <FontAwesome name="image" size={22} color={colors.subText ?? '#999'} />
    </View>
  );
}

export function SafeImage({ uri, style, placeholderStyle, ...rest }: SafeImageProps) {
  const [errored, setErrored] = useState(false);

  if (!uri || errored) {
    return <Placeholder style={[style as StyleProp<ViewStyle>, placeholderStyle]} />;
  }

  return (
    <Image
      {...rest}
      source={{ uri }}
      style={style}
      onError={() => setErrored(true)}
    />
  );
}

type SafeImageBackgroundProps = Omit<ImageBackgroundProps, 'source'> & {
  uri: string | undefined | null;
  placeholderStyle?: StyleProp<ViewStyle>;
};

export function SafeImageBackground({
  uri,
  style,
  placeholderStyle,
  children,
  ...rest
}: SafeImageBackgroundProps) {
  const [errored, setErrored] = useState(false);

  if (!uri || errored) {
    return (
      <View style={[style as StyleProp<ViewStyle>, placeholderStyle]}>
        {children}
      </View>
    );
  }

  return (
    <ImageBackground
      {...rest}
      source={{ uri }}
      style={style}
      onError={() => setErrored(true)}>
      {children}
    </ImageBackground>
  );
}
