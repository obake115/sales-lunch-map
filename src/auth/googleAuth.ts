import { GoogleAuthProvider } from 'firebase/auth';
import { Alert } from 'react-native';

let configured = false;

export async function getGoogleCredential() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  console.log('[AUTH][GOOGLE] step=check_config', {
    webClientId: webClientId ? `${webClientId.slice(0, 12)}...` : '(empty)',
    iosClientId: iosClientId ? `${iosClientId.slice(0, 12)}...` : '(empty)',
  });

  if (!webClientId && !iosClientId) {
    const msg =
      'Googleログインの設定が未完了です。\n\n' +
      'Firebase Console → Authentication → Sign-in method → Google を有効にし、' +
      '.env に EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID と EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID を設定してください。';
    console.error('[AUTH][GOOGLE] step=check_config FAILED: both client IDs are empty');
    Alert.alert('設定が未完了', msg);
    throw new Error('Google Sign-In is not configured');
  }

  console.log('[AUTH][GOOGLE] step=import_sdk');
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');

  if (!configured) {
    console.log('[AUTH][GOOGLE] step=configure', { webClientId: !!webClientId, iosClientId: !!iosClientId });
    GoogleSignin.configure({
      webClientId: webClientId || undefined,
      iosClientId: iosClientId || undefined,
    });
    configured = true;
  }

  console.log('[AUTH][GOOGLE] step=has_play_services');
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  } catch (e: any) {
    console.error('[AUTH][GOOGLE] step=has_play_services FAILED', e?.code, e?.message);
    throw e;
  }

  console.log('[AUTH][GOOGLE] step=sign_in');
  let response: any;
  try {
    response = await GoogleSignin.signIn();
  } catch (e: any) {
    console.error('[AUTH][GOOGLE] step=sign_in FAILED', e?.code, e?.message);
    throw e;
  }

  const idToken = response?.data?.idToken;
  console.log('[AUTH][GOOGLE] step=check_token', { hasToken: !!idToken });

  if (!idToken) {
    console.error('[AUTH][GOOGLE] step=check_token FAILED: no idToken in response');
    throw new Error('Google Sign-In failed: no ID token');
  }

  console.log('[AUTH][GOOGLE] step=create_credential');
  return GoogleAuthProvider.credential(idToken);
}
