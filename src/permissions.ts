import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export type PermissionState = {
  locationForegroundGranted: boolean;
  notificationsGranted: boolean;
};

export async function getPermissionState(): Promise<PermissionState> {
  const fg = await Location.getForegroundPermissionsAsync();
  const noti = await Notifications.getPermissionsAsync();
  return {
    locationForegroundGranted: fg.granted,
    notificationsGranted: noti.granted,
  };
}

export async function requestAllNeededPermissions(): Promise<PermissionState> {
  const fg = await Location.requestForegroundPermissionsAsync();
  const noti = await Notifications.requestPermissionsAsync();
  return {
    locationForegroundGranted: fg.granted,
    notificationsGranted: noti.granted,
  };
}

