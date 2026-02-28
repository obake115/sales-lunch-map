import React from 'react';
import { Platform, UIManager, View, type ViewStyle } from 'react-native';
import Constants from 'expo-constants';

/**
 * LinearGradient の安全ラッパー。
 *
 * require('expo-linear-gradient') は JS モジュールが存在すれば成功するが、
 * ネイティブビューマネージャ (ExpoLinearGradient) がビルドに含まれて
 * いなければ描画時に "Unimplemented component" になる。
 *
 * → UIManager でネイティブ側の存在を確認してからのみ使用する。
 */

let Gradient: React.ComponentType<any> | null = null;

function isNativeViewAvailable(viewName: string): boolean {
  try {
    const config = UIManager.getViewManagerConfig?.(viewName);
    return !!config;
  } catch {
    return false;
  }
}

if (Constants.appOwnership !== 'expo') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-linear-gradient');
    // JS モジュールが存在しても、ネイティブ側が無ければ使えない
    if (mod?.LinearGradient && isNativeViewAvailable('ExpoLinearGradient')) {
      Gradient = mod.LinearGradient;
    }
  } catch {
    // expo-linear-gradient 未インストール
  }
}

type GradientBoxProps = {
  colors: string[];
  style?: ViewStyle;
  children?: React.ReactNode;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
};

let _logged = false;

export function GradientBox({ colors, style, children, ...rest }: GradientBoxProps) {
  if (__DEV__ && !_logged) {
    _logged = true;
    const mode = Gradient ? 'gradient' : 'fallback';
    console.log(`[GradientBox] mode=${mode}, appOwnership=${Constants.appOwnership}, platform=${Platform.OS}`);
  }

  if (Gradient) {
    return (
      <Gradient colors={colors} style={style} {...rest}>
        {children}
      </Gradient>
    );
  }

  return (
    <View style={[style, { backgroundColor: colors[0] ?? '#4F46E5' }]}>
      {children}
    </View>
  );
}
