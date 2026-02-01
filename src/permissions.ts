import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export type PermissionState = {
  locationForegroundGranted: boolean;
  locationBackgroundGranted: boolean;
  notificationsGranted: boolean;
};

export async function getPermissionState(): Promise<PermissionState> {
  const fg = await Location.getForegroundPermissionsAsync();
  // Expo Go では「常に許可（バックグラウンド）」が取れない/制限されるため、
  // 画面確認用に background を必須にしない
  const bg = Constants.appOwnership === 'expo' ? { granted: true } : await Location.getBackgroundPermissionsAsync();
  const noti = await Notifications.getPermissionsAsync();
  return {
    locationForegroundGranted: fg.granted,
    locationBackgroundGranted: bg.granted,
    notificationsGranted: noti.granted,
  };
}

export async function requestAllNeededPermissions(): Promise<PermissionState> {
  const fg = await Location.requestForegroundPermissionsAsync();
  const bg =
    Constants.appOwnership === 'expo'
      ? { granted: true }
      : await Location.requestBackgroundPermissionsAsync();
  const noti = await Notifications.requestPermissionsAsync();
  return {
    locationForegroundGranted: fg.granted,
    locationBackgroundGranted: bg.granted,
    notificationsGranted: noti.granted,
  };
}

