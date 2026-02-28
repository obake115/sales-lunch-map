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

/**
 * Firebase Auth を AsyncStorage 永続化つきで初期化する。
 *
 * Metro は firebase/auth を RN ビルド (dist/rn) に解決するため、
 * ランタイムでは getReactNativePersistence が利用可能。
 * TSC のブラウザ型定義には含まれないため require() で取得する。
 */
function buildPersistence() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getReactNativePersistence } = require('firebase/auth');
    if (typeof getReactNativePersistence === 'function' && AsyncStorage) {
      return getReactNativePersistence(AsyncStorage);
    }
  } catch {
    // fallback
  }
  return null;
}

export const firebaseAuth = (() => {
  try {
    const persistence = buildPersistence();
    if (persistence) {
      return initializeAuth(firebaseApp, { persistence });
    }
  } catch {
    // initializeAuth は再呼び出し不可（Hot Reload時など）
  }
  return getAuth(firebaseApp);
})();
export const firebaseDb = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);
