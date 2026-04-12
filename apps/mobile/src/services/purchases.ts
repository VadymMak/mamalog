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

// ─── Init ──────────────────────────────────────────────────────────────────────

export function initPurchases(userId?: string): void {
  Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  const apiKey =
    Platform.OS === "ios" ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
  Purchases.configure({ apiKey, appUserID: userId });
}

// ─── Status ────────────────────────────────────────────────────────────────────

export async function checkProStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[PRO_ENTITLEMENT] !== undefined;
  } catch {
    return false;
  }
}

// ─── Offerings ────────────────────────────────────────────────────────────────

export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo.entitlements.active[PRO_ENTITLEMENT] !== undefined;
}

// ─── Restore ──────────────────────────────────────────────────────────────────

export async function restorePurchases(): Promise<boolean> {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo.entitlements.active[PRO_ENTITLEMENT] !== undefined;
}
