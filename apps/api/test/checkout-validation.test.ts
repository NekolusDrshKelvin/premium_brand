import test from "node:test";
import assert from "node:assert/strict";
import { PaymentMethod } from "@prisma/client";
import { checkoutPayloadSchema } from "../src/checkout-validation";

const validPayload = {
  customerName: "Avery Taylor",
  customerEmail: "avery@example.com",
  shippingAddress: "18 Example Road, Yangon, Myanmar",
  items: [{ productId: "product_123", quantity: 2 }],
};

test("accepts a valid checkout and defaults to cash on delivery", () => {
  const result = checkoutPayloadSchema.safeParse(validPayload);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.paymentMethod, PaymentMethod.CASH_ON_DELIVERY);
});

test("accepts bank transfer as a payment method", () => {
  const result = checkoutPayloadSchema.safeParse({ ...validPayload, paymentMethod: PaymentMethod.BANK_TRANSFER });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.paymentMethod, PaymentMethod.BANK_TRANSFER);
});

test("rejects an invalid email address", () => {
  const result = checkoutPayloadSchema.safeParse({ ...validPayload, customerEmail: "not-an-email" });
  assert.equal(result.success, false);
});

test("rejects empty carts", () => {
  const result = checkoutPayloadSchema.safeParse({ ...validPayload, items: [] });
  assert.equal(result.success, false);
});

test("rejects fractional, zero, and excessive quantities", () => {
  for (const quantity of [0, 1.5, 21]) {
    const result = checkoutPayloadSchema.safeParse({ ...validPayload, items: [{ productId: "product_123", quantity }] });
    assert.equal(result.success, false, `quantity ${quantity} should be rejected`);
  }
});

test("rejects short shipping addresses and invalid payment methods", () => {
  assert.equal(checkoutPayloadSchema.safeParse({ ...validPayload, shippingAddress: "short" }).success, false);
  assert.equal(checkoutPayloadSchema.safeParse({ ...validPayload, paymentMethod: "WIRE_CASH" }).success, false);
});


test("accepts MMQR as a checkout payment method", () => {
  const result = checkoutPayloadSchema.safeParse({ ...validPayload, paymentMethod: "MMQR" });
  assert.equal(result.success, true);
});
