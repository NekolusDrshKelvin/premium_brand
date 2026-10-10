# Development and Deployment

## Local development

### 1. Start PostgreSQL (optional until database integration is added)
From the repository root:

```powershell
docker compose up -d postgres
```

### 2. Start the API
```powershell
cd apps/api
npm install
Copy-Item .env.example .env
npm run dev
```

Check `http://localhost:4000/api/health` and `http://localhost:4000/api/products`.

### 3. Start the storefront
Open another terminal:

```powershell
cd apps/store
npm install
npm run dev
```

Visit `http://localhost:3000`.

## Production checklist
- Add a real database schema and migrations.
- Implement authentication, password reset, and role-based admin authorization.
- Persist cart, checkout, orders, stock, and customer records in PostgreSQL.
- Add payment provider integration and verify webhook signatures.
- Validate all inputs on the server; never trust client-supplied prices or stock quantities.
- Configure production CORS origins, HTTPS, secrets, logging, backups, and rate limits.
- Configure image hosting and optimize product images.
- Run lint, typecheck, tests, and a production build before release.
- Deploy the Next.js storefront and API, then set environment variables and run migrations.

The current starter is a visual and API foundation, not yet a complete production commerce platform.
