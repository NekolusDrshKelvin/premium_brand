import { MMPaySDK } from "mmpay-node-sdk";

export type MmpayStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED" | "CANCELLED" | "EXPIRED";
export type InternalPaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED" | "EXPIRED";

export type MmpayTransaction = {
  orderId: string;
  amount: number;
  currency: string;
  status: MmpayStatus;
  transactionRefId?: string | null;
  vendorQrRefId?: string | null;
  vendor?: string | null;
  method?: string | null;
};

const allowedProviderStatuses = new Set<MmpayStatus>([
  "PENDING", "SUCCESS", "FAILED", "REFUNDED", "CANCELLED", "EXPIRED",
]);

export function isMmpayConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    env.MMPAY_APP_ID?.trim() &&
    env.MMPAY_PUBLISHABLE_KEY?.trim() &&
    env.MMPAY_SECRET_KEY?.trim() &&
    env.MMPAY_CALLBACK_URL?.trim() &&
    env.MMPAY_MODE !== "disabled"
  );
}

export function createMmpayClient(env: NodeJS.ProcessEnv = process.env) {
  if (!isMmpayConfigured(env)) throw new Error("MMQR_NOT_CONFIGURED");
  const mode = env.MMPAY_MODE === "live" ? "live" : "sandbox";
  const apiBaseUrl = env.MMPAY_API_BASE_URL?.trim() ||
    (mode === "live" ? "https://api.myanmyanpay.com" : "https://sandbox.myanmyanpay.com");
  return new MMPaySDK({
    appId: env.MMPAY_APP_ID!.trim(),
    publishableKey: env.MMPAY_PUBLISHABLE_KEY!.trim(),
    secretKey: env.MMPAY_SECRET_KEY!.trim(),
    apiBaseUrl,
  });
}

export function normalizeMmpayStatus(status: unknown): InternalPaymentStatus | null {
  if (typeof status !== "string" || !allowedProviderStatuses.has(status as MmpayStatus)) return null;
  switch (status) {
    case "SUCCESS": return "PAID";
    case "PENDING": return "PENDING";
    case "FAILED": return "FAILED";
    case "REFUNDED": return "REFUNDED";
    case "CANCELLED": return "CANCELLED";
    case "EXPIRED": return "EXPIRED";
  }
}

export function canTransitionPaymentStatus(current: string, next: InternalPaymentStatus): boolean {
  if (current === next) return true;
  if (current === "PAID") return next === "REFUNDED";
  if (current === "REFUNDED") return false;
  if (["FAILED", "CANCELLED", "EXPIRED"].includes(current)) return false;
  return current === "PENDING";
}

export function validateMmpayTransaction(
  transaction: Partial<MmpayTransaction>,
  expected: { orderId: string; amount: number; currency: string },
): boolean {
  return transaction.orderId === expected.orderId &&
    typeof transaction.amount === "number" &&
    Number.isFinite(transaction.amount) &&
    transaction.amount === expected.amount &&
    typeof transaction.currency === "string" &&
    transaction.currency.toUpperCase() === expected.currency.toUpperCase() &&
    normalizeMmpayStatus(transaction.status) !== null &&
    (transaction.status !== "SUCCESS" || (typeof transaction.transactionRefId === "string" && transaction.transactionRefId.trim().length > 0));
}
