import type { TextStyle } from 'react-native';

/**
 * M PLUS Rounded 1c font family mapping.
 * In React Native, fontWeight must be omitted when using custom fontFamily on Android.
 * Use these helpers instead of fontWeight for consistent cross-platform rendering.
 */
export const fonts = {
  regular: 'MPLUSRounded1c_400Regular',
  medium: 'MPLUSRounded1c_500Medium',
  bold: 'MPLUSRounded1c_700Bold',
  extraBold: 'MPLUSRounded1c_800ExtraBold',
} as const;

/** Shorthand style objects for common font weights */
export const fontStyle = {
  regular: { fontFamily: fonts.regular } satisfies TextStyle,
  medium: { fontFamily: fonts.medium } satisfies TextStyle,
  bold: { fontFamily: fonts.bold } satisfies TextStyle,
  extraBold: { fontFamily: fonts.extraBold } satisfies TextStyle,
} as const;
