# 環境変数

このアプリは、Expo の `EXPO_PUBLIC_` 環境変数を使います。

## 使う変数

- `EXPO_PUBLIC_ADMOB_MODE`
  - `test` / `prod`
- `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID`
  - 本番のバナー広告ユニットID（共通。片方だけ作る場合の簡易用）
- `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_IOS`
  - iOS本番のバナー広告ユニットID（推奨）
- `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_ANDROID`
  - Android本番のバナー広告ユニットID（推奨）

## ローカルで指定（PowerShell例）

```powershell
cd "C:\Users\81808\Desktop\app\geo-memo-reminder-app"
$env:EXPO_PUBLIC_ADMOB_MODE="test"
npm run start
```

## EASで指定

EAS の「Environment variables」に同名で登録してください（`EXPO_PUBLIC_` なのでアプリ内から参照されます）。

