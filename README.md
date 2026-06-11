# PocketPal

Personal finance app (monorepo: `backend/`, `frontend/`).

## Node.js

Requires **Node.js 20.19+** (see `.nvmrc`). Install from [nodejs.org](https://nodejs.org/) or use `nvm install` / `fnm install` in the repo root.

## Deployment

After creating **Neon** (Postgres) and **Render** (API) services, follow **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for env vars, health check, migrations, and optional deploy hooks.

Local backend env template: [backend/.env.example](backend/.env.example).