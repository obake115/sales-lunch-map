import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * expo-notifications をロードしても安全な環境かを返す。
 *
 * - Expo Go (appOwnership === 'expo') → false
 * - iOS で実機でない (isDevice が falsy) → false
 *   ※ Dev Client on Simulator では isDevice が undefined|false
 * - 上記以外（実機 / Android）→ true
 */
export function canUseNotifications(): boolean {
  if (Constants.appOwnership === 'expo') return false;
  if (Platform.OS === 'ios' && !Constants.isDevice) return false;
  return true;
}
