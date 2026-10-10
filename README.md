# ATELIER — Premium Leather Store

A quiet-luxury storefront starter for a premium leather goods brand.

## Stack
- Storefront: Next.js App Router, React, TypeScript
- Styling: Tailwind CSS
- API: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma ORM
- Authentication: bcrypt password hashes, signed JWT in an HTTP-only cookie, role-checked admin endpoints

## Repository layout
```
apps/
  store/                 Next.js storefront and admin UI
  api/                   Express REST API
    prisma/schema.prisma PostgreSQL commerce schema
    prisma/seed.ts       Catalog seed and optional admin provisioning
docs/
docker-compose.yml
```

## Requirements
- Node.js 20.9+
- npm 10+
- Docker Desktop

## 1. Start PostgreSQL
From the repository root:
```powershell
docker compose up -d postgres
```

## 2. Configure and run the API
```powershell
cd apps/api
npm install
Copy-Item .env.example .env
```

Edit `apps/api/.env` before starting:
- Set `JWT_SECRET` to a unique random secret of at least 32 characters.
- Set `ADMIN_EMAIL` and `ADMIN_PASSWORD`; the password must be at least 12 characters.
- Keep the admin password private and do not commit `.env`.

Generate a secret in PowerShell:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then run:
```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

API health: http://localhost:4000/api/health  
Public product API: http://localhost:4000/api/products

## 3. Configure and run the storefront
Open a second terminal:
```powershell
cd apps/store
npm install
Copy-Item .env.example .env.local
npm run dev
```
Open http://localhost:3000.

## Admin access
Open http://localhost:3000/admin/login and sign in using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values provisioned by the seed script.

The dashboard includes:
- Overview metrics, recent orders, and low-stock alerts.
- Create products, edit price/stock, and archive products.
- Customer checkout with stock validation, server-calculated totals, cash-on-delivery, bank transfer, and an MMQR integration path with signed callback verification and status tracking.
- Checkout payload validation tests and GitHub Actions CI for API typecheck/tests and storefront typecheck/build.
- Review orders and update fulfillment status.
- Sign out and role-checked dashboard access.

Admin accounts are created from the server-side seed configuration. Public registration always creates a CUSTOMER account; it cannot grant admin access.

## Implemented API endpoints
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/products`
- `GET /api/products/:slug`
- `POST /api/orders`
- `GET /api/admin/overview` (ADMIN)
- `GET /api/admin/products` (ADMIN)
- `POST /api/admin/products` (ADMIN)
- `PATCH /api/admin/products/:id` (ADMIN)
- `DELETE /api/admin/products/:id` (ADMIN; archives the product)
- `GET /api/admin/orders` (ADMIN)
- `PATCH /api/admin/orders/:id/status` (ADMIN)

## Automated checks\n\nFrom `apps/api`: `npm run typecheck` and `npm test`. From `apps/store`: `npm run typecheck` and `npm run build`. GitHub Actions runs these checks on pushes and pull requests to `main`. The CI workflow has been added to the repository, but its first run must complete before the build/test status can be confirmed.\n\n## Important production limitations
This is an in-progress starter, not a finished production ecommerce platform. The storefront is still an in-progress starter. MMQR integration code is present but has not been verified against provider sandbox/live credentials or a real payment. Do not claim payment processing works until sandbox transactions, callback signatures, status reconciliation, and CI all pass. Email notifications, password reset, audit logs, deployment hardening, and production reconciliation procedures remain outstanding.

## Documentation
- [Architecture](docs/architecture.md)
- [Deployment guide](docs/deployment.md)


## MMQR payment integration
See [MMQR integration and launch checklist](docs/payment-mmqr.md) for provider onboarding, server-only credentials, migration commands, MMK catalog requirements, callback verification, and launch testing. Existing sample products are USD-priced; update their prices and currency intentionally in Admin before MMQR checkout is enabled. No currency conversion is performed automatically.
