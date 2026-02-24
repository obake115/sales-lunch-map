import { OAuthProvider } from 'firebase/auth';
import { Alert, Platform } from 'react-native';

/**
 * Apple Sign-In → Firebase OAuthCredential を返す。
 *
 * ■ 方針（2024-02 App Review 対応）
 *   - nonce は使わない（SHA256 フォールバックの不一致リスクを排除）
 *   - identityToken が取れない場合は Alert + throw
 *   - authorizationCode があれば accessToken として渡す
 *   - 全ステップでログを出力（本番でも必ず）
 */
export async function getAppleCredential() {
  const isPad = Platform.OS === 'ios' && (Platform as any).isPad;

  // ── Step 1: デバイス情報ログ ──
  console.log('[Apple] step=start Device:', {
    os: Platform.OS,
    version: Platform.Version,
    isPad,
    model: (Platform as any).constants?.Model ?? 'unknown',
    interfaceIdiom: (Platform as any).constants?.interfaceIdiom ?? 'unknown',
  });

  // ── Step 2: モジュール読み込み ──
  let AppleAuthentication: typeof import('expo-apple-authentication');
  try {
    AppleAuthentication = await import('expo-apple-authentication');
  } catch (e: any) {
    console.error('[Apple] step=import FAILED', e?.message);
    throw new Error('Apple Sign-Inモジュールの読み込みに失敗しました');
  }

  // ── Step 3: 利用可能チェック ──
  console.log('[Apple] step=check_availability');
  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    console.error('[Apple] step=check_availability FAILED');
    throw new Error('Apple Sign-Inはこのデバイスでは利用できません。');
  }

  // ── Step 4: Apple Sign-In 実行（nonceなし＝最もシンプルな構成） ──
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
    if (
      e?.code === 'ERR_REQUEST_CANCELED' ||
      e?.code === 'ERR_CANCELED' ||
      e?.message?.includes('canceled') ||
      e?.message?.includes('cancelled')
    ) {
      throw e; // キャンセルはそのまま rethrow
    }
    throw e; // その他のエラーもそのまま（呼び出し元で処理）
  }

  // ── Step 5: Apple レスポンス検証ログ（必須） ──
  console.log('[Apple] step=response', {
    identityToken: !!res.identityToken,
    authorizationCode: !!res.authorizationCode,
    user: res.user,
    fullName: res.fullName,
    email: res.email,
    platform: Platform.OS,
  });

  if (!res.identityToken) {
    const msg = 'Appleのトークンが取得できませんでした。もう一度お試しください。';
    console.error('[Apple] step=response FAILED: identityToken is null');
    Alert.alert('ログインに失敗しました', msg);
    throw new Error(msg);
  }

  // ── Step 6: Firebase OAuthCredential 作成 ──
  console.log('[Apple] step=create_credential');
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: res.identityToken,
    ...(res.authorizationCode ? { accessToken: res.authorizationCode } : {}),
  });
  console.log('[Apple] step=create_credential OK');
  return credential;
}
