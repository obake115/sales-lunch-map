# 近づいたら買い物メモ（MVP）

## 起動

```bash
cd geo-memo-reminder-app
npm run start
```

## 権限

- 位置情報: **常に許可（バックグラウンド）**が必要です（店舗に近づいた通知のため）
- 通知: ローカル通知の許可が必要です

アプリ内の「許可する」ボタンでまとめて要求します。

## 通知条件（実装）

- 店舗の半径 **200m** に入ったとき
- 店舗が **ON** のとき
- その店舗にメモが **1件以上**あるとき
- 同一店舗は **12時間**クールタイム（`lastNotifiedAt` で管理）

## 広告（AdMob Banner）

一覧/メモ画面の下部に固定表示（店舗追加画面には表示しません）。

### テスト↔本番 切替

Expo の環境変数で切替します。

- `EXPO_PUBLIC_ADMOB_MODE`: `test` / `prod`
- `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS`: iOS本番バナーの広告ユニットID（推奨）
- `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID`: Android本番バナーの広告ユニットID（推奨）
- `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID`: 共通ID（片方だけ作る場合の簡易用）

例:

```bash
set EXPO_PUBLIC_ADMOB_MODE=test
npm run start
```

## 重要（Expo Go について）

`react-native-google-mobile-ads` とバックグラウンドのジオフェンス(Task)は、**Expo Go では動作しない/制限される**ことがあります。
動作確認は **Development Build / EAS Build** を推奨します。

