import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { t } from './i18n';
import { setPostLimitPurchased } from './storage';

type PurchaseOutcome = {
  success: boolean;
  cancelled?: boolean;
  message?: string;
};

export type PlanPackage = {
  identifier: string;
  packageType: string;
  priceString: string;
  product: { title: string; description: string; price: number; currencyCode: string };
  /** The raw RevenueCat package object for purchasing */
  _raw: any;
};

let configured = false;

function getPurchasesModule() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-purchases');
    return mod?.default ?? mod;
  } catch {
    return null;
  }
}

function getApiKey(): string | null {
  const key =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVCAT_API_KEY_IOS
      : Platform.OS === 'android'
        ? process.env.EXPO_PUBLIC_REVCAT_API_KEY_ANDROID
        : undefined;
  return key && key.trim().length > 0 ? key.trim() : null;
}

/** API キー末尾4桁（診断用。個人情報は含まない） */
function maskApiKey(key: string | null): string {
  if (!key || key.length < 4) return 'null';
  return '...' + key.slice(-4);
}

function getEntitlementId(): string {
  const raw = process.env.EXPO_PUBLIC_REVCAT_ENTITLEMENT_ID;
  return raw && raw.trim().length > 0 ? raw.trim() : 'unlimited_posts';
}

function getOfferingId(): string | null {
  const raw = process.env.EXPO_PUBLIC_REVCAT_OFFERING_ID;
  return raw && raw.trim().length > 0 ? raw.trim() : null;
}

async function ensureConfigured(): Promise<boolean> {
  if (Constants.appOwnership === 'expo') return false;
  const Purchases = getPurchasesModule();
  if (!Purchases) {
    console.warn('[RC] module not available');
    return false;
  }
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[RC] no API key');
    return false;
  }
  if (!configured) {
    console.log('[RC] configure: key=%s, platform=%s, __DEV__=%s, appOwnership=%s',
      maskApiKey(apiKey), Platform.OS, __DEV__, Constants.appOwnership);
    try {
      Purchases.configure({ apiKey });
      configured = true;
      console.log('[RC] configure OK');

      // configure 直後に offerings をプリフェッチ（初回取りこぼし対策）
      try {
        const offerings = await Purchases.getOfferings();
        const cur = offerings?.current;
        console.log('[RC] pre-fetch: currentId=%s, pkgCount=%d, allKeys=[%s]',
          cur?.identifier ?? 'null',
          cur?.availablePackages?.length ?? 0,
          offerings?.all ? Object.keys(offerings.all).join(', ') : '');
        if (cur?.availablePackages?.length) {
          console.log('[RC] pre-fetch packages:', cur.availablePackages.map((p: any) => ({
            pkgId: p.identifier,
            productId: p.product?.identifier,
            price: p.product?.priceString,
          })));
        }
      } catch (e: any) {
        console.warn('[RC] pre-fetch offerings failed:', e?.message);
      }

      // CustomerInfo の environment を出力（sandbox/production 判定）
      try {
        const info = await Purchases.getCustomerInfo();
        console.log('[RC] customerInfo: environment=%s, entitlements=%s',
          info?.entitlements?.verification ?? 'unknown',
          JSON.stringify(Object.keys(info?.entitlements?.active ?? {})));
      } catch (e: any) {
        console.warn('[RC] getCustomerInfo failed:', e?.message);
      }
    } catch (e) {
      console.error('[RC] configure failed:', e);
      return false;
    }
  }
  return true;
}

export async function syncPurchasedState(): Promise<boolean> {
  const ok = await ensureConfigured();
  if (!ok) return false;
  const Purchases = getPurchasesModule();
  if (!Purchases) return false;
  const entitlementId = getEntitlementId();
  const info = await Purchases.getCustomerInfo();
  const active = !!info?.entitlements?.active?.[entitlementId];
  if (active) {
    await setPostLimitPurchased(true);
  }
  return active;
}

/** Fetch available packages from the current offering. */
export async function getAvailablePackages(): Promise<PlanPackage[]> {
  const ok = await ensureConfigured();
  if (!ok) return [];
  const Purchases = getPurchasesModule();
  if (!Purchases) return [];

  try {
    const offerings = await Purchases.getOfferings();

    // ── 診断ログ ──
    const offeringId = getOfferingId();
    console.log('[RC] getOfferings:', {
      hasOfferings: !!offerings,
      currentId: offerings?.current?.identifier ?? 'null',
      currentPkgCount: offerings?.current?.availablePackages?.length ?? 0,
      allKeys: offerings?.all ? Object.keys(offerings.all) : [],
      requestedOfferingId: offeringId ?? '(use current)',
    });

    if (!offerings) {
      console.warn('[RC] getOfferings returned null/undefined');
      return [];
    }

    // Offering 解決: 指定 ID → 存在しなければ current にフォールバック
    let offering = offeringId ? offerings.all?.[offeringId] : null;
    if (offeringId && !offering) {
      console.warn('[RC] offeringId=%s not found, falling back to current', offeringId);
      offering = offerings.current;
    }
    if (!offering) {
      offering = offerings.current;
    }
    if (!offering) {
      console.warn('[RC] No offering available (current is null)');
      return [];
    }

    const pkgs: any[] = offering.availablePackages ?? [];
    console.log('[RC] resolved offering=%s, packages(%d):', offering.identifier, pkgs.length,
      pkgs.map((p: any) => ({
        pkgId: p.identifier,
        productId: p.product?.identifier,
        price: p.product?.priceString,
        type: p.packageType,
      })));

    if (pkgs.length === 0) {
      console.warn('[RC] offering=%s has 0 availablePackages', offering.identifier);
      return [];
    }
    return pkgs.map((pkg: any) => ({
      identifier: pkg.identifier ?? '',
      packageType: pkg.packageType ?? '',
      priceString: pkg.product?.priceString ?? '',
      product: {
        title: pkg.product?.title ?? '',
        description: pkg.product?.description ?? '',
        price: pkg.product?.price ?? 0,
        currencyCode: pkg.product?.currencyCode ?? '',
      },
      _raw: pkg,
    }));
  } catch (e) {
    console.error('[RC] getAvailablePackages error:', e);
    return [];
  }
}

/** Purchase a specific package by its raw reference. */
export async function purchasePackage(pkg: PlanPackage): Promise<PurchaseOutcome> {
  console.log('[RC] purchasePackage:', {
    identifier: pkg.identifier,
    hasRaw: !!pkg._raw,
    rawId: pkg._raw?.identifier,
    productId: pkg._raw?.product?.identifier,
  });

  if (!pkg._raw) {
    console.error('[RC] purchasePackage: _raw is null');
    return { success: false, message: t('purchases.packageInvalid') };
  }

  const ok = await ensureConfigured();
  if (!ok) {
    return { success: false, message: t('purchases.configMissing') };
  }
  const Purchases = getPurchasesModule();
  if (!Purchases) return { success: false, message: t('purchases.unavailable') };

  // 購入前に最新 offerings で package の存在を再検証
  try {
    const offerings = await Purchases.getOfferings();
    const offeringId = getOfferingId();
    let offering = offeringId ? offerings?.all?.[offeringId] : null;
    if (!offering) offering = offerings?.current;
    const available = (offering?.availablePackages ?? []) as any[];
    const match = available.find((p: any) => p.identifier === pkg._raw.identifier);
    console.log('[RC] pre-purchase verify: target=%s, found=%s, available=[%s]',
      pkg._raw.identifier, !!match, available.map((p: any) => p.identifier).join(', '));
    if (!match) {
      console.error('[RC] package not in current offerings — aborting purchase');
      return { success: false, message: t('purchases.packageInvalid') };
    }
  } catch (e: any) {
    console.warn('[RC] pre-purchase verify failed, proceeding:', e?.message);
  }

  try {
    await Purchases.purchasePackage(pkg._raw);
    const active = await syncPurchasedState();
    return active ? { success: true } : { success: false, message: t('purchases.verifyFailed') };
  } catch (error: any) {
    console.error('[RC] purchasePackage error:', {
      code: error?.code,
      message: error?.message,
      userCancelled: error?.userCancelled,
      underlyingErrorMessage: error?.underlyingErrorMessage,
    });
    if (error?.userCancelled) {
      return { success: false, cancelled: true };
    }
    return { success: false, message: t('purchases.failed') };
  }
}

/** Purchase food badge collection (non-consumable) from the "food_badge" offering. */
export async function purchaseFoodBadgeCollection(): Promise<PurchaseOutcome> {
  const ok = await ensureConfigured();
  if (!ok) return { success: false, message: t('purchases.configMissing') };
  const Purchases = getPurchasesModule();
  if (!Purchases) return { success: false, message: t('purchases.unavailable') };

  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings?.all?.['food_badge'] ?? null;
    if (!offering) {
      console.warn('[RC] food_badge offering not found');
      return { success: false, message: t('purchases.packageMissing') };
    }
    const pkg = offering.availablePackages?.[0];
    if (!pkg) {
      console.warn('[RC] food_badge offering has 0 packages');
      return { success: false, message: t('purchases.packageMissing') };
    }
    console.log('[RC] purchaseFoodBadge: productId=%s, price=%s',
      pkg.product?.identifier, pkg.product?.priceString);
    await Purchases.purchasePackage(pkg);
    return { success: true };
  } catch (error: any) {
    if (error?.userCancelled) return { success: false, cancelled: true };
    console.error('[RC] purchaseFoodBadge error:', error?.message);
    return { success: false, message: t('purchases.failed') };
  }
}

/** Get the price string for the food badge collection offering. */
export async function getFoodBadgePrice(): Promise<string | null> {
  const ok = await ensureConfigured();
  if (!ok) return null;
  const Purchases = getPurchasesModule();
  if (!Purchases) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings?.all?.['food_badge'] ?? null;
    const pkg = offering?.availablePackages?.[0];
    return pkg?.product?.priceString ?? null;
  } catch {
    return null;
  }
}

// --- Map background individual purchases ---

const BG_OFFERING_MAP: Record<string, string> = {
  sakura: 'map_bg_sakura',
  seasonal: 'map_bg_seasonal',
  navy: 'map_bg_navy',
};

export async function purchaseMapBackground(bgId: string): Promise<PurchaseOutcome> {
  const offeringId = BG_OFFERING_MAP[bgId];
  if (!offeringId) return { success: false, message: 'Invalid background' };
  const ok = await ensureConfigured();
  if (!ok) return { success: false, message: t('purchases.configMissing') };
  const Purchases = getPurchasesModule();
  if (!Purchases) return { success: false, message: t('purchases.unavailable') };

  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings?.all?.[offeringId] ?? null;
    if (!offering) {
      console.warn(`[RC] ${offeringId} offering not found`);
      return { success: false, message: t('purchases.packageMissing') };
    }
    const pkg = offering.availablePackages?.[0];
    if (!pkg) return { success: false, message: t('purchases.packageMissing') };
    await Purchases.purchasePackage(pkg);
    return { success: true };
  } catch (error: any) {
    if (error?.userCancelled) return { success: false, cancelled: true };
    console.error(`[RC] purchaseMapBg(${bgId}) error:`, error?.message);
    return { success: false, message: t('purchases.failed') };
  }
}

export async function getMapBgPrice(bgId: string): Promise<string | null> {
  const offeringId = BG_OFFERING_MAP[bgId];
  if (!offeringId) return null;
  const ok = await ensureConfigured();
  if (!ok) return null;
  const Purchases = getPurchasesModule();
  if (!Purchases) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings?.all?.[offeringId] ?? null;
    const pkg = offering?.availablePackages?.[0];
    return pkg?.product?.priceString ?? null;
  } catch {
    return null;
  }
}

/** Legacy: purchase first available package (kept for backward compatibility). */
export async function purchaseUnlimited(): Promise<PurchaseOutcome> {
  const ok = await ensureConfigured();
  if (!ok) {
    return { success: false, message: t('purchases.configMissing') };
  }
  const Purchases = getPurchasesModule();
  if (!Purchases) return { success: false, message: t('purchases.unavailable') };

  try {
    const offerings = await Purchases.getOfferings();
    if (!offerings) {
      console.warn('[RC] purchaseUnlimited: offerings null');
      return { success: false, message: t('purchases.packageMissing') };
    }
    const offeringId = getOfferingId();
    let offering = offeringId ? offerings.all?.[offeringId] : null;
    if (!offering) offering = offerings.current;
    const pkg = offering?.availablePackages?.[0];
    if (!pkg) {
      return { success: false, message: t('purchases.packageMissing') };
    }
    await Purchases.purchasePackage(pkg);
    const active = await syncPurchasedState();
    return active ? { success: true } : { success: false, message: t('purchases.verifyFailed') };
  } catch (error: any) {
    if (error?.userCancelled) {
      return { success: false, cancelled: true };
    }
    console.error('[RC] purchaseUnlimited error:', error);
    return { success: false, message: t('purchases.failed') };
  }
}

export async function identifyUser(uid: string): Promise<void> {
  const ok = await ensureConfigured();
  if (!ok) return;
  const Purchases = getPurchasesModule();
  if (!Purchases) return;
  try {
    await Purchases.logIn(uid);
  } catch {
    // ignore
  }
}

export async function logOutPurchases(): Promise<void> {
  const ok = await ensureConfigured();
  if (!ok) return;
  const Purchases = getPurchasesModule();
  if (!Purchases) return;
  try {
    await Purchases.logOut();
  } catch {
    // ignore
  }
}

export async function restorePurchases(): Promise<PurchaseOutcome> {
  const ok = await ensureConfigured();
  if (!ok) {
    return { success: false, message: t('purchases.configMissing') };
  }
  const Purchases = getPurchasesModule();
  if (!Purchases) return { success: false, message: t('purchases.unavailable') };

  try {
    await Purchases.restorePurchases();
    const active = await syncPurchasedState();
    return active ? { success: true } : { success: false, message: t('purchases.restoreNone') };
  } catch {
    return { success: false, message: t('purchases.restoreFailed') };
  }
}
