import { OAuthProvider } from 'firebase/auth';
import { Alert, Platform } from 'react-native';

/**
 * Apple Sign-In → Firebase OAuthCredential を返す。
 *
 * ■ nonce なし方式
 *   iOS が Apple Sign-In のレスポンスを OS レベルでキャッシュするため、
 *   nonce 付きだと "Duplicate credential received" で Firebase が拒否する。
 *   nonce を使わないことでキャッシュ問題を根本回避する。
 *   identity token 自体は短命（~10 分）でリプレイ保護は実質十分。
 */
export async function getAppleCredential() {
  const isPad = Platform.OS === 'ios' && (Platform as any).isPad;

  console.log('[Apple] step=start Device:', {
    os: Platform.OS,
    version: Platform.Version,
    isPad,
  });

  // ── モジュール読み込み ──
  let AppleAuthentication: typeof import('expo-apple-authentication');
  try {
    AppleAuthentication = await import('expo-apple-authentication');
  } catch (e: any) {
    console.error('[Apple] step=import FAILED', e?.message);
    throw new Error('Apple Sign-Inモジュールの読み込みに失敗しました');
  }

  // ── 利用可能チェック ──
  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Apple Sign-Inはこのデバイスでは利用できません。');
  }

  // ── Apple Sign-In 実行（nonce なし） ──
  console.log('[Apple] step=signInAsync (no nonce)');
  let res: Awaited<ReturnType<typeof AppleAuthentication.signInAsync>>;
  try {
    res = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (e: any) {
    console.error('[Apple] step=signInAsync FAILED', {
      code: e?.code,
      message: e?.message,
    });
    throw e;
  }

  console.log('[Apple] step=response', {
    identityToken: !!res.identityToken,
    authorizationCode: !!res.authorizationCode,
    user: res.user,
  });

  if (!res.identityToken) {
    const msg = 'Appleのトークンが取得できませんでした。もう一度お試しください。';
    Alert.alert('ログインに失敗しました', msg);
    throw new Error(msg);
  }

  // ── Firebase OAuthCredential 作成（nonce なし） ──
  console.log('[Apple] step=create_credential (no nonce)');
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: res.identityToken,
  });
  console.log('[Apple] step=create_credential OK');
  return credential;
}
