# Apple Sign-In 設定チェックリスト

## Apple Developer 側

- [ ] App ID (`jp.kawashun.saleslunchmap`) で **Sign in with Apple** が有効
- [ ] Services ID (`com.kawashun.lunchmap.signin`) が存在（Firebase用）
- [ ] Services ID の Return URL: `https://<firebase-project-id>.firebaseapp.com/__/auth/handler`
- [ ] Sign in with Apple の Key ID: `49DVNJM8QG` — 有効期限内
- [ ] Team ID: `7VMBUAPN7B`

## Firebase 側

- [ ] Authentication → Sign-in method → **Apple** が有効
- [ ] Apple プロバイダに **Services ID** が設定済み: `com.kawashun.lunchmap.signin`
- [ ] Apple プロバイダに **Team ID** が設定済み: `7VMBUAPN7B`
- [ ] Apple プロバイダに **Key ID** (`49DVNJM8QG`) と **Private Key (P8)** が設定済み
- [ ] `authDomain` が正しい (`EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`)

### Firebase で確認すべきこと（失敗時）

1. **Firebase Console → Authentication → Users** を開く
2. Apple ログイン後に **apple.com** プロバイダのユーザーが作成されているか確認
3. 作成されていない場合 → `signInWithCredential` が失敗している
4. コンソールログの `[Apple/Firebase] sign-in failed` のエラーコードを確認:
   - `auth/invalid-credential` → nonce不一致 or トークン期限切れ
   - `auth/operation-not-allowed` → Firebase で Apple プロバイダが無効
   - `auth/user-disabled` → ユーザーが無効化されている
   - `auth/invalid-api-key` → Firebase API キーの問題

## Expo / app.json 側

- [ ] `ios.bundleIdentifier`: `jp.kawashun.saleslunchmap` — Apple Developer と一致
- [ ] `ios.usesAppleSignIn`: `true`
- [ ] plugins に `expo-apple-authentication` が含まれている
- [ ] plugins に `./plugins/withFixAppleAuthIPad` が含まれている（iPad対応パッチ v3）

## コード側

- [ ] `src/auth/appleAuth.ts` — OAuthProvider('apple.com') + nonce なし（シンプル構成）
- [ ] `src/state/AuthContext.tsx` — `signInWithCredential` で Firebase 認証
- [ ] エラーハンドリング: キャンセル検出、失敗時 **必ず** error code + message を Alert 表示
- [ ] ログ: `[Apple]` `[Firebase]` プレフィックスで各ステップ出力（Platform/OS情報付き）

## iPad 固有

- [ ] `plugins/withFixAppleAuthIPad.js` — `presentationAnchor` の5段階ウィンドウ取得（v3）
  1. `foregroundActive` scene の `keyWindow`
  2. `foregroundInactive` scene の `keyWindow`
  3. 任意の `connectedScenes` の `keyWindow` / `windows.first`
  4. 全 scene の `windows` から最初の1つ
  5. `UIWindow(frame: UIScreen.main.bounds)` 生成 + `makeKeyAndVisible()`
- [ ] Swift 側に `print("[AppleAuth] presentationAnchor window: ...")` ログ出力あり
- [ ] `supportsTablet: false` — iPhone互換モードで動作（iPad実機テスト必須）

## テスト手順

1. iPad 実機でアプリを完全削除 → TestFlight から再インストール
2. Welcome 画面 → 「Apple で続ける」→ Apple シート表示 → 完了
3. **成功の場合**: オンボーディングへ遷移 → アプリ再起動後もログイン維持
4. **失敗の場合**: Alert に Firebase エラーコード（例: `auth/invalid-credential`）が表示される
5. ネット切断状態 → エラー Alert 表示 → クラッシュしない
6. iPhone 実機でも同様にテスト → 既存動作が壊れていないこと
7. Firebase Console → Authentication → Users に apple.com ユーザーが作成されていること
