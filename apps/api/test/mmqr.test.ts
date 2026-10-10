import test from "node:test";
import assert from "node:assert/strict";
import {
  canTransitionPaymentStatus,
  normalizeMmpayStatus,
  validateMmpayTransaction,
} from "../src/mmqr";

test("maps MMQR provider statuses to internal payment statuses", () => {
  assert.equal(normalizeMmpayStatus("SUCCESS"), "PAID");
  assert.equal(normalizeMmpayStatus("PENDING"), "PENDING");
  assert.equal(normalizeMmpayStatus("REFUNDED"), "REFUNDED");
  assert.equal(normalizeMmpayStatus("UNKNOWN"), null);
  assert.equal(normalizeMmpayStatus(undefined), null);
});

test("prevents late pending or failure callbacks from downgrading a paid payment", () => {
  assert.equal(canTransitionPaymentStatus("PAID", "PENDING"), false);
  assert.equal(canTransitionPaymentStatus("PAID", "FAILED"), false);
  assert.equal(canTransitionPaymentStatus("PAID", "REFUNDED"), true);
  assert.equal(canTransitionPaymentStatus("REFUNDED", "PAID"), false);
  assert.equal(canTransitionPaymentStatus("PENDING", "PAID"), true);
  assert.equal(canTransitionPaymentStatus("PENDING", "FAILED"), true);
});

test("requires matching order id, exact amount, currency, and known provider status", () => {
  const expected = { orderId: "AT-ORDER-123", amount: 125000, currency: "MMK" };
  assert.equal(validateMmpayTransaction({ ...expected, status: "SUCCESS" }, expected), true);
  assert.equal(validateMmpayTransaction({ ...expected, currency: "USD", status: "SUCCESS" }, expected), false);
  assert.equal(validateMmpayTransaction({ ...expected, amount: 124999, status: "SUCCESS" }, expected), false);
  assert.equal(validateMmpayTransaction({ ...expected, orderId: "OTHER", status: "SUCCESS" }, expected), false);
  assert.equal(validateMmpayTransaction({ ...expected, status: "PENDING" }, expected), true);
  assert.equal(validateMmpayTransaction({ ...expected, status: "FORGED" }, expected), false);
});
