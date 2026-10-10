# Development and Deployment

## Local development

### 1. Start PostgreSQL
From the repository root:

```powershell
docker compose up -d postgres
```

The included database credentials are for local development only. Do not expose this database publicly or reuse the sample password in production.

### 2. Configure the API
```powershell
cd apps/api
npm install
Copy-Item .env.example .env
```

Edit `apps/api/.env`:
- Replace `JWT_SECRET` with a unique random secret (at least 32 characters).
- Set `ADMIN_EMAIL` and `ADMIN_PASSWORD`. The password must be at least 12 characters.
- Never commit `.env` or share the admin password.

Generate a secret:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then initialize the database and provision the administrator:
```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The seed script hashes the administrator password with bcrypt. Re-running the seed updates that account's password hash to the value currently in the environment, so keep the configured value secure.

### 3. Start the storefront
Open a second terminal:
```powershell
cd apps/store
npm install
Copy-Item .env.example .env.local
npm run dev
```

Visit `http://localhost:3000`, then sign in at `http://localhost:3000/admin/login`.

## Authentication and authorization
- Login returns an HTTP-only cookie; the frontend sends it using credentialed requests.
- API session tokens are signed using `JWT_SECRET` and expire after eight hours.
- Public registration always creates CUSTOMER role accounts.
- Admin routes validate the authenticated user's role in the database on each request.
- Passwords are stored as bcrypt hashes, not plaintext.
- Admin product deletion is a soft archive; order statuses are validated against the schema enum.

## API endpoints currently implemented
- `GET /api/health`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/products?search=tote&category=Bags&featured=true&page=1&limit=12`
- `GET /api/products/:slug`
- `POST /api/orders`
- Admin-only: `GET /api/admin/overview`, `GET/POST /api/admin/products`, `PATCH/DELETE /api/admin/products/:id`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status`

Checkout reads prices from the database and adjusts inventory transactionally. It records cash-on-delivery or bank-transfer selection, but does not collect or process card/e-wallet payments. Bank transfer must be verified manually before marking an order paid. Integrate a chosen provider with signed webhook/callback verification before accepting online payments.

## Production checklist
- Use a managed PostgreSQL database, strong unique secrets, HTTPS, backups, monitoring, and least-privilege database credentials.
- Deploy the storefront and API on the same site or configure cookie `SameSite` and `Secure` settings carefully for the chosen domain architecture.
- Add CSRF protections if deployment architecture or cookie policy requires them, login rate limits, account lockout/throttling, audit logs, and password reset.
- Add protected admin CRUD tests and end-to-end authorization tests.
- Connect storefront product pages and persistent cart/checkout UI to the API.
- Add payment provider integration, webhook signature verification, idempotency, refund/cancellation flows, and order confirmation emails.
- Never accept client-submitted prices as authoritative.
- Configure production CORS origins, HTTPS, secrets, logging, rate limits, image hosting, and database backups.
- Use a controlled production migration process; do not run development migration commands against production.
- Run typechecks, automated tests, and production builds before release.

The current repository is a development foundation and must be security-reviewed and tested before handling real customer data or payments.


## Automated checks

From `apps/api`, run `npm run typecheck` and `npm test`. From `apps/store`, run `npm run typecheck` and `npm run build`. GitHub Actions runs these checks for pushes and pull requests to `main`. Wait for the first workflow run to complete to confirm its result.
