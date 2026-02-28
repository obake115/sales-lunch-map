import { I18n } from 'i18n-js';

import en from '../locales/en.json';
import ja from '../locales/ja.json';

const i18n = new I18n({ en, ja });

i18n.enableFallback = true;
i18n.defaultLocale = 'ja';

let deviceLocale = 'ja';
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Localization = require('expo-localization');
  const tag: string = Localization?.getLocales?.()[0]?.languageTag ?? 'ja';
  // 'ja-JP' → 'ja', 'en-US' → 'en' — locale ファイルのキーに合わせる
  const lang = tag.split('-')[0];
  deviceLocale = lang === 'ja' || lang === 'en' ? lang : 'ja';
} catch {
  deviceLocale = 'ja';
}
i18n.locale = deviceLocale;

export const t = (key: string, options?: Record<string, unknown>) =>
  i18n.t(key, options);

export default i18n;
