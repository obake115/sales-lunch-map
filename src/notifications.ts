import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseDb } from './firebase';
import { canUseNotifications } from './notificationGuard';

function getNotificationsModule() {
  if (!canUseNotifications()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications');
  } catch {
    return null;
  }
}

export function configureNotifications() {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('[Notifications] configureNotifications failed:', e);
  }
}

export async function ensureAndroidDefaultChannel() {
  if (Platform.OS !== 'android') return;
  const Notifications = getNotificationsModule();
  if (!Notifications) return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch (e) {
    console.warn('[Notifications] ensureAndroidDefaultChannel failed:', e);
  }
}

export async function registerPushToken(userId: string): Promise<string | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    // Save token to Firestore
    await setDoc(
      doc(firebaseDb, 'users', userId, 'pushTokens', token),
      {
        token,
        platform: Platform.OS,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return token;
  } catch (e) {
    console.warn('[Notifications] registerPushToken failed:', e);
    return null;
  }
}
