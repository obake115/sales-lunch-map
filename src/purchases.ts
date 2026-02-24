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
  if (!Purchases) return false;
  const apiKey = getApiKey();
  if (!apiKey) return false;
  if (!configured) {
    Purchases.configure({ apiKey });
    configured = true;
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
    const offeringId = getOfferingId();
    const offering = offeringId ? offerings?.all?.[offeringId] : offerings?.current;
    const pkgs: any[] = offering?.availablePackages ?? [];
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
  } catch {
    return [];
  }
}

/** Purchase a specific package by its raw reference. */
export async function purchasePackage(pkg: PlanPackage): Promise<PurchaseOutcome> {
  const ok = await ensureConfigured();
  if (!ok) {
    return { success: false, message: t('purchases.configMissing') };
  }
  const Purchases = getPurchasesModule();
  if (!Purchases) return { success: false, message: t('purchases.unavailable') };

  try {
    await Purchases.purchasePackage(pkg._raw);
    const active = await syncPurchasedState();
    return active ? { success: true } : { success: false, message: t('purchases.verifyFailed') };
  } catch (error: any) {
    if (error?.userCancelled) {
      return { success: false, cancelled: true };
    }
    return { success: false, message: t('purchases.failed') };
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
    const offeringId = getOfferingId();
    const offering = offeringId ? offerings?.all?.[offeringId] : offerings?.current;
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
