import test from "node:test";
import assert from "node:assert/strict";
import { MMPaySDK } from "mmpay-node-sdk";

test("provider SDK accepts a valid callback signature and rejects a modified signature", async () => {
  const sdk = MMPaySDK({
    appId: "MM_TEST_APP",
    publishableKey: "pk_test_only",
    secretKey: "unit-test-secret-not-a-real-credential",
    apiBaseUrl: "https://sandbox.myanmyanpay.com",
  });
  const body = JSON.stringify({
    orderId: "AT-TEST-1",
    amount: 10000,
    currency: "MMK",
    status: "SUCCESS",
    transactionRefId: "provider-test-reference",
  });
  const nonce = "unit-test-nonce-001";
  const signature = sdk._generateSignature(body, nonce);

  assert.equal(await sdk.verifyCb(body, nonce, signature), true);
  assert.equal(await sdk.verifyCb(body, nonce, "invalid-signature"), false);
  assert.equal(await sdk.verifyCb(body + " ", nonce, signature), false);
});
