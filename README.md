# ATELIER — Premium Leather Store

A quiet-luxury storefront starter for a premium leather goods brand.

## Stack
- Storefront: Next.js App Router, React, TypeScript
- Styling: Tailwind CSS
- API starter: Node.js + Express + TypeScript
- Database plan: PostgreSQL + Prisma (schema and Docker setup to follow)

## Repository layout
```
apps/
  store/    Next.js storefront
  api/      Express REST API starter
docs/
docker-compose.yml
```

## Requirements
- Node.js 20.9+
- npm 10+
- Docker Desktop (optional, for PostgreSQL)

## Run the storefront
```powershell
cd apps/store
npm install
npm run dev
```
Open http://localhost:3000.

## Run the API
```powershell
cd apps/api
npm install
npm run dev
```
API health endpoint: http://localhost:4000/api/health

## Environment
Copy each `.env.example` to `.env` and configure values for your environment. Never commit secrets.

## Current scope
The first commit provides a responsive luxury landing page, product collection cards, navigation, and a lightweight API starter. Checkout, authentication, persistent cart, inventory, order processing, and admin CRUD need to be implemented and tested before production use.

## Deployment
See [docs/deployment.md](docs/deployment.md).
