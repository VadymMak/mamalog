import Purchases, {
  LOG_LEVEL,
  type PurchasesPackage,
} from "react-native-purchases";
import { Platform } from "react-native";

// ─── Keys ─────────────────────────────────────────────────────────────────────
// Replace with production keys when going live

const REVENUECAT_ANDROID_KEY = "test_juYCoanNQDCcTmXLcSFzHvNVlSU";
const REVENUECAT_IOS_KEY = "test_juYCoanNQDCcTmXLcSFzHvNVlSU";

export const PRO_ENTITLEMENT = "mamalog Pro";

// ─── Init ─────────────────────────────────────────────────────────────────────
// Wrapped in try-catch: native module (RNPurchases) may be absent if the app
// was built before react-native-purchases was installed (needs expo prebuild).

export function initPurchases(userId?: string): void {
  try {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    const apiKey =
      Platform.OS === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
    Purchases.configure({ apiKey, appUserID: userId });
  } catch (e) {
    console.warn("[RevenueCat] initPurchases failed — native module not linked?", e);
  }
}

// ─── Status ───────────────────────────────────────────────────────────────────

export async function checkProStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[PRO_ENTITLEMENT] !== undefined;
  } catch (e) {
    console.warn("[RevenueCat] checkProStatus error:", e);
    return false;
  }
}

// ─── Offerings ────────────────────────────────────────────────────────────────

export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (e) {
    console.warn("[RevenueCat] getOfferings error:", e);
    return null;
  }
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.entitlements.active[PRO_ENTITLEMENT] !== undefined;
  } catch (e) {
    console.warn("[RevenueCat] purchasePackage error:", e);
    throw e; // re-throw so PaywallScreen can show the correct error to user
  }
}

// ─── Restore ──────────────────────────────────────────────────────────────────

export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo.entitlements.active[PRO_ENTITLEMENT] !== undefined;
  } catch (e) {
    console.warn("[RevenueCat] restorePurchases error:", e);
    throw e; // re-throw so PaywallScreen can show the error to user
  }
}
