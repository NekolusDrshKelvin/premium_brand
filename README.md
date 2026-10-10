# ATELIER — Premium Leather Store

A quiet-luxury storefront starter for a premium leather goods brand.

## Stack
- Storefront: Next.js App Router, React, TypeScript
- Styling: Tailwind CSS
- API: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma ORM

## Repository layout
```
apps/
  store/                 Next.js storefront
  api/                   Express REST API
    prisma/schema.prisma PostgreSQL commerce schema
    prisma/seed.ts       Starter catalog seed
docs/
docker-compose.yml
```

## Requirements
- Node.js 20.9+
- npm 10+
- Docker Desktop (for the included local PostgreSQL setup)

## Start PostgreSQL
From the repository root:
```powershell
docker compose up -d postgres
```

## Run the API
```powershell
cd apps/api
npm install
Copy-Item .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```
API health: http://localhost:4000/api/health  
Product list: http://localhost:4000/api/products

## Run the storefront
Open a second terminal:
```powershell
cd apps/store
npm install
npm run dev
```
Open http://localhost:3000.

## Current functionality
- Responsive premium storefront landing page and collection presentation.
- Database-backed product listing, search, category filter, featured filter, and product detail API.
- PostgreSQL models for users, products, orders, and order items.
- Checkout API validates input, calculates totals using database prices, and decrements stock in a database transaction.

## Important production limitations
This is an in-progress starter, not a finished production ecommerce platform. Customer/admin authentication, protected admin CRUD, payment provider integration, persistent storefront cart/checkout UI, email notifications, automated tests, and deployment configuration still need implementation and verification. Do not use for real customer payments until those controls are completed.

## Environment
Copy `.env.example` to `.env`. Never commit secrets. Change the local sample database password before exposing any database outside your development machine.

## Documentation
- [Architecture](docs/architecture.md)
- [Deployment checklist](docs/deployment.md)
