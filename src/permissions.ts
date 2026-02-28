import * as Location from 'expo-location';

import { canUseNotifications } from './notificationGuard';

export type PermissionState = {
  locationForegroundGranted: boolean;
  notificationsGranted: boolean;
};

function getNotificationsModule() {
  if (!canUseNotifications()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications');
  } catch {
    return null;
  }
}

export async function getPermissionState(): Promise<PermissionState> {
  const fg = await Location.getForegroundPermissionsAsync();
  let notificationsGranted = false;
  const Noti = getNotificationsModule();
  if (Noti) {
    try {
      const noti = await Noti.getPermissionsAsync();
      notificationsGranted = noti.granted;
    } catch (e) {
      console.warn('[Permissions] getPermissionsAsync failed:', e);
    }
  }
  return {
    locationForegroundGranted: fg.granted,
    notificationsGranted,
  };
}

export async function requestAllNeededPermissions(): Promise<PermissionState> {
  const fg = await Location.requestForegroundPermissionsAsync();
  let notificationsGranted = false;
  const Noti = getNotificationsModule();
  if (Noti) {
    try {
      const noti = await Noti.requestPermissionsAsync();
      notificationsGranted = noti.granted;
    } catch (e) {
      console.warn('[Permissions] requestPermissionsAsync failed:', e);
    }
  }
  return {
    locationForegroundGranted: fg.granted,
    notificationsGranted,
  };
}
