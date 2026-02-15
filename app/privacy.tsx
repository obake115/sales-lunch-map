import { ScrollView, Text } from 'react-native';

import { useThemeColors } from '@/src/state/ThemeContext';

const PRIVACY_POLICY = `
プライバシーポリシー

最終更新日: 2026年2月15日

本アプリ「ランチマップ」（以下「本アプリ」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。本プライバシーポリシーは、本アプリが収集、使用、共有する情報について説明します。

1. 収集する情報

(a) アカウント情報
Apple ID またはGoogle アカウントでログインした場合、認証に必要な情報（メールアドレス等）を取得します。

(b) 位置情報
本アプリは、ランチ候補の登録・近くの店舗通知のために位置情報を利用します。位置情報の利用は端末の設定で制御できます。

(c) ユーザーが入力したデータ
店舗名、メモ、写真、評価などユーザーが任意で入力した情報を保存します。

(d) 利用状況データ
Firebase Analytics を通じて、匿名化された利用状況データ（画面閲覧、機能利用等）を収集します。

2. 情報の利用目的

- サービスの提供・改善
- データのバックアップ・復元
- 近くの店舗の通知
- 利用状況の分析

3. 情報の共有

ユーザーが「みんなで共有」を有効にした店舗情報は、他のユーザーに公開されます。それ以外の個人データを第三者に販売・共有することはありません。

4. データの保存

ローカルデータは端末内のSQLiteデータベースに保存されます。ログインユーザーのデータはFirebase Firestoreにバックアップされます。

5. データの削除

設定画面の「アカウントを削除」から、すべてのデータ（ローカル・クラウド）を削除できます。

6. 広告

本アプリは Google AdMob を利用した広告を表示する場合があります。AdMob は広告配信のためにデバイス情報を利用することがあります。

7. お子様のプライバシー

本アプリは13歳未満のお子様を対象としていません。

8. 変更について

本ポリシーは予告なく変更される場合があります。重要な変更がある場合は、アプリ内でお知らせします。

9. お問い合わせ

ご質問がある場合は、App Store のアプリページからお問い合わせください。
`.trim();

export default function PrivacyScreen() {
  const colors = useThemeColors();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>
        {PRIVACY_POLICY}
      </Text>
    </ScrollView>
  );
}
