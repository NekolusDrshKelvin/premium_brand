# MMQR integration (MyanMyanPay)

This repository contains an integration implementation, not a verified live payment service. It uses the MyanMyanPay Node SDK (mmpay-node-sdk) for dynamic MMQR creation, SDK signature/nonce verification, and provider status queries. It has not yet been tested with merchant credentials or a real/sandbox transaction.

## 1. Merchant onboarding and credentials

1. Register the business with MyanMyanPay and obtain sandbox credentials and the correct API base URL from the provider.
2. Configure a publicly reachable HTTPS callback URL for the API. Localhost is not reachable by the payment provider.
3. In apps/api/.env, set MMPAY_MODE=sandbox, MMPAY_APP_ID, MMPAY_PUBLISHABLE_KEY, MMPAY_SECRET_KEY, and MMPAY_CALLBACK_URL=https://YOUR-API-DOMAIN/api/webhooks/mmpay.
4. Keep the secret key only in the API environment. Never put it in the storefront environment, browser code, logs, or source control.
5. Restart the API after changing environment variables.

The API defaults to the provider's documented sandbox host when MMPAY_MODE=sandbox; use MMPAY_MODE=live only after merchant approval, provider instructions, and a successful sandbox test. Live processing is not asserted or enabled by this code alone.

## 2. Database migration

After pulling the code, run these commands from apps/api:

    npm install
    npm run db:generate
    npm run db:migrate -- --name add_mmqr_payment_transactions
    npm run typecheck
    npm test

If the database is managed in production, review and apply the generated Prisma migration through your normal migration process. Back up production data first.

## 3. Catalog pricing requirement

MMQR checkout accepts only products priced in MMK, and the final total must be a whole-number MMK amount. Existing seed products are still priced in USD; the code deliberately does not guess an exchange rate or silently convert their prices.

To prepare a product, sign in to the admin dashboard, open Products, choose Edit, enter the intended MMK price, and choose MMK as the currency. The create-product form also has a currency selector. Review every price carefully before publishing it.

## 4. Payment flow

- Checkout validates the cart and calculates totals on the server using database prices.
- For MMQR, the API creates the order and a PaymentTransaction, then requests a dynamic provider QR using the order number as the merchant order ID.
- The checkout page renders the returned EMVCo QR payload and polls the API for status while pending.
- POST /api/webhooks/mmpay preserves the raw request body and delegates signature/nonce verification to the provider SDK. Only a callback that matches an existing provider order ID, exact amount, currency, and a known status can update payment state. A successful callback must include a transaction reference.
- The status endpoint also queries the provider while a payment is pending. It requires both the order number and the checkout email.
- Duplicate callbacks are idempotent; terminal statuses cannot be downgraded by a late pending/failed callback. A paid transaction can transition to refunded.
- Verified success sets payment status to PAID and the order status to CONFIRMED.

## 5. Endpoints

- POST /api/orders — accepts paymentMethod: MMQR only when provider configuration is present and all selected products use MMK.
- GET /api/orders/:orderNumber/payment?email=customer@example.com — returns payment status and QR payload for the matching order/email; queries the provider while pending.
- POST /api/webhooks/mmpay — signed provider callback endpoint.

## 6. Verification checklist before launch

- Run the API typecheck and automated tests, and ensure the GitHub Actions workflow passes.
- Test QR generation with provider sandbox credentials.
- Scan and pay the sandbox QR with a supported test wallet.
- Verify a valid callback updates the correct order only once.
- Verify invalid/missing signatures, nonce, mismatched amount/currency/order ID, duplicate callbacks, late callbacks, and provider timeouts do not mark an order paid incorrectly.
- Verify the status-query endpoint reflects provider status even if the webhook is delayed.
- Confirm settlement, refunds, expiry behavior, fees, and production API base URL with the provider.
- Do not switch to live credentials until the merchant account is approved and all checks above pass.

A provider timeout during QR creation intentionally leaves the order/payment pending for reconciliation rather than automatically releasing stock, because the provider may have accepted the request before the network timed out. The customer is instructed to contact the store and not submit a duplicate order. Add an admin reconciliation procedure before production use.