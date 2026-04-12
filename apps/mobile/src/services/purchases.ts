// ─────────────────────────────────────────────────────────────────────────────
// RevenueCat — MOCKED for stability testing.
//
// react-native-purchases native module is crashing on startup.
// All functions return safe free-tier defaults so the rest of the app works.
// TODO: re-enable native SDK once crash root cause is confirmed via adb logcat.
// ─────────────────────────────────────────────────────────────────────────────

import type { PurchasesPackage } from "react-native-purchases";

export const PRO_ENTITLEMENT = "mamalog Pro";

export function initPurchases(_userId?: string): void {
  console.log("[RevenueCat] MOCKED — purchases disabled, user is free tier");
}

export async function checkProStatus(): Promise<boolean> {
  return false;
}

export async function getOfferings(): Promise<null> {
  return null;
}

export async function purchasePackage(
  _pkg: PurchasesPackage
): Promise<boolean> {
  console.warn("[RevenueCat] MOCKED — purchasePackage called but disabled");
  return false;
}

export async function restorePurchases(): Promise<boolean> {
  console.warn("[RevenueCat] MOCKED — restorePurchases called but disabled");
  return false;
}
