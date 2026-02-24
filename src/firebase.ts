import { getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import { t } from './i18n';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

function ensureFirebaseConfig() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error(t('firebase.missingConfig'));
  }
}

export const firebaseApp = (() => {
  ensureFirebaseConfig();
  if (getApps().length > 0) return getApps()[0]!;
  return initializeApp(firebaseConfig);
})();

function getReactNativePersistenceSafe() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('firebase/auth/react-native');
    const getReactNativePersistence = mod?.getReactNativePersistence;
    return AsyncStorage && getReactNativePersistence ? getReactNativePersistence(AsyncStorage) : null;
  } catch {
    return null;
  }
}

export const firebaseAuth = (() => {
  try {
    const persistence = getReactNativePersistenceSafe();
    return persistence ? initializeAuth(firebaseApp, { persistence }) : getAuth(firebaseApp);
  } catch {
    return getAuth(firebaseApp);
  }
})();
export const firebaseDb = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);
