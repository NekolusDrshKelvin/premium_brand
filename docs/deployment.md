# Development and Deployment

## Local development

### 1. Start PostgreSQL
From the repository root:

```powershell
docker compose up -d postgres
```

The included credentials are for local development only. Do not expose this database publicly or reuse the sample password in production.

### 2. Configure and start the API
```powershell
cd apps/api
npm install
Copy-Item .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Check:
- `http://localhost:4000/api/health`
- `http://localhost:4000/api/products`

### 3. Start the storefront
Open another terminal:

```powershell
cd apps/store
npm install
npm run dev
```

Visit `http://localhost:3000`.

## API endpoints currently implemented
- `GET /api/health`
- `GET /api/products?search=tote&category=Bags&featured=true&page=1&limit=12`
- `GET /api/products/:slug`
- `POST /api/orders`

The checkout endpoint expects customer name, email, shipping address, and product IDs with quantities. It reads prices from the database and reserves stock transactionally. It does not collect or process payment details.

## Production checklist
- Add customer authentication, secure sessions, password hashing, password reset, and role-based admin authorization.
- Add protected admin endpoints for product/inventory/order management; never expose these without verified ADMIN access.
- Connect storefront product pages and cart/checkout UI to the API.
- Add payment provider integration and verify webhook signatures.
- Add order confirmation email, shipping updates, cancellation/refund flows, and idempotency protections.
- Validate all inputs on the server; never trust client-supplied prices or stock quantities.
- Configure production CORS origins, HTTPS, secrets, logging, monitoring, rate limits, and database backups.
- Configure image hosting and optimize product images.
- Add automated unit/integration/e2e tests and CI.
- Run database migrations using the deployment process; do not run development migration commands against production.
- Deploy the storefront and API, configure environment variables, then verify health checks and a full test order.

The current repository is a development foundation and must be security-reviewed and tested before handling real customer data or payments.
