# PocketPal deployment (Neon + Render)

Use this checklist now that **Neon** (Postgres) and **Render** (API) are created.

## Where each thing lives (Neon vs Render vs GitHub vs frontend host)

| Place | What you configure | PocketPal-related |
|--------|-------------------|-------------------|
| **Neon** | Projects, branches, roles, connection strings | You do **not** put app secrets like JWT here. Copy each branch’s **connection string** and paste it into **Render** as `DATABASE_URL`. Optional: reset DB password in Neon if you rotate credentials (then update `DATABASE_URL` on Render). |
| **Render (backend Web Service)** | Environment variables for the Node API | All runtime vars the server reads: `DATABASE_URL`, `NODE_ENV`, `CORS_ORIGIN`, JWT secrets, Cloudinary, etc. (see table below). Staging service ≠ prod service → different `DATABASE_URL` and often different `CORS_ORIGIN`. |
| **GitHub (repo)** | **Secrets** / **Variables** / **Environments** | **Only if** you use optional CD workflows: deploy hook URLs (`RENDER_DEPLOY_HOOK_*`, `VERCEL_DEPLOY_HOOK_*`). CI workflows use a **temporary Postgres** in Actions for tests—not your Neon DB. Do **not** put production `DATABASE_URL` or JWT secrets in GitHub unless you have a specific workflow that needs them (avoid if possible). |
| **Vercel / Render Static (frontend)** | Env vars for the SPA build | e.g. `VITE_API_URL` or `NEXT_PUBLIC_API_URL` = your **public** Render API URL (`https://xxx.onrender.com`). No secrets that belong only on the server. |
| **Your laptop** | `backend/.env` (gitignored) | Local `DB_*` or `DATABASE_URL`, JWT secrets for dev, `CORS_ORIGIN=http://localhost:5173`, etc. See `backend/.env.example`. |

**Rule of thumb:** Neon supplies **Postgres**; Render runs the **API** and holds **server secrets**; GitHub only needs **deploy hook URLs** (optional); the **browser-facing** API URL goes in the **frontend** host env for build-time config.

---

## Render: Environment Groups vs per-service env, and “Secret”

Render lets you attach variables at different levels:

| Mechanism | What it is | When to use for PocketPal |
|-----------|------------|---------------------------|
| **Environment variables** (plain) | Key/value visible in the dashboard (value can still be sensitive—treat carefully). | Non-secret config: `NODE_ENV`, `LOG_LEVEL`, `CORS_ORIGIN` (origin URL is not secret). |
| **Secret** / **Secret environment variables** | Same idea but values are **hidden** in the UI after save (treat as sensitive). | **`DATABASE_URL`**, **`ACCESS_TOKEN_SECRET`**, **`REFRESH_TOKEN_SECRET`**, **Cloudinary keys**. Always use secret-type for these. |
| **Secret files** | A file mounted at runtime (e.g. for TLS certs or multi-line keys). | Usually **not** needed for PocketPal; a single `DATABASE_URL` string is enough. |
| **Environment Groups** | A named bundle of variables you **link** to one or more services so they share the same keys. | Use for values **identical** across services (e.g. shared `CLOUDINARY_*` if both staging and prod use the same Cloudinary account—often you still split by folder). **Do not** put one shared `DATABASE_URL` in a group if staging and prod use **different** Neon branches—use **per-service** `DATABASE_URL` or two groups (`pocketpal-staging`, `pocketpal-prod`). |

**Practical split for PocketPal**

- **Group (optional):** e.g. naming convention, `LOG_LEVEL`, or shared third-party keys **only** if truly the same in staging and prod.
- **Per Web Service:** `DATABASE_URL` (different Neon branch per service), `CORS_ORIGIN` (different frontend URL per env), JWT secrets (can be same or different per env—many teams use **different** secrets for staging vs prod).

---

## Connect Neon to Render: `DATABASE_URL` — where it comes from and what to put

Neon does **not** run your Node app. You only need the **Postgres connection string** on Render.

1. Open the **[Neon Console](https://console.neon.tech)** → your project.
2. Select the **branch** you use for that environment (e.g. `main` / production vs a **preview** or second branch for staging).
3. Open **Connection details** (or **Dashboard** → connect / SQL editor area—Neon’s UI shows “Connection string”).
4. Choose **PostgreSQL** and copy the URI. It looks like:
   `postgresql://USER:PASSWORD@EP-xxx.region.aws.neon.tech/neondb?sslmode=require`
5. In **Render** → your **Web Service** (staging or prod) → **Environment** → add:
   - **Key:** `DATABASE_URL`
   - **Value:** paste that full string
   - Mark it as a **Secret** if Render offers that toggle.

Repeat for the **other** Render service with the **other** Neon branch’s connection string (staging DB → staging service, prod DB → prod service).

Your app reads **`process.env.DATABASE_URL`** in `backend/src/db/sequelize.js` and `backend/src/db/pool.js`. You do **not** need separate `DB_HOST` / `DB_USER` on Render when `DATABASE_URL` is set.

---

## GitHub: Render deploy hooks — what they are and how to get the URLs

**Deploy hooks** are **HTTPS URLs** that tell Render: “start a new deploy for this service.” They are **not** your database URL and **not** your API URL.

**Why use them:** Optional GitHub Actions workflows (e.g. `.github/workflows/backend-deploy.yml`) can `curl` these URLs after a push so a deploy runs without storing Render login tokens in GitHub.

**How to create (one per Web Service)**

1. **Render** → select the **Web Service** (e.g. staging API).
2. **Settings** → **Deploy Hook** (or **Build & Deploy** → Deploy hook—wording varies).
3. Create a hook, give it a name (e.g. `github-staging`).
4. Render shows a URL like: `https://api.render.com/deploy/srv-xxxxx?key=yyyyy`
5. Copy that **entire URL**.

**Put in GitHub**

1. Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Name: `RENDER_DEPLOY_HOOK_STAGING` → paste the **staging** service hook URL.
3. Repeat: `RENDER_DEPLOY_HOOK_PRODUCTION` → **production** service hook URL.

These URLs are **sensitive** (anyone with the URL can trigger a deploy). Store them only as **GitHub Secrets**, not in the repo.

If you **don’t** use GitHub Actions to trigger deploys, you can skip GitHub secrets entirely and rely on Render’s **auto-deploy on push** to the connected branch.

## Render Web Service (backend)

| Setting | Value |
|--------|--------|
| **Root Directory** | `backend` |
| **Build Command** | `npm ci` (or `npm install` if no lockfile) |
| **Start Command** | `npm start` |
| **Branch** | `develop` for staging · `prod` for production |

### Health check

In the service settings, set **Health Check Path** to:

`/api/v1/health`

### Release command (migrations)

After each deploy, run DB migrations (Render → **Settings → Build & Deploy → Release Command**):

```bash
npm run db:migrate
```

Runs from **Root Directory** (`backend`). Ensure `DATABASE_URL` is available to the release step (same env as the service).

---

## Environment variables (Render)

Set these on **each** Web Service (staging vs production values differ).

### Required

| Variable | Notes |
|----------|--------|
| `NODE_ENV` | `production` for prod API. Use `staging` or `development` on staging if you want `sequelize.sync({ alter: true })` there; use `production` on both if you rely only on **migrations**. |
| `DATABASE_URL` | Full Postgres URL from the matching **Neon branch** (staging DB → staging service, prod DB → prod service). The app reads this at runtime (see `backend/src/db/sequelize.js`). |
| `CORS_ORIGIN` | Exact frontend origin, e.g. `https://your-app.vercel.app` (no trailing slash). Must match the browser origin calling the API. |
| `ACCESS_TOKEN_SECRET` | Strong random string (sign access JWTs). |
| `REFRESH_TOKEN_SECRET` | Different strong random string (sign refresh JWTs). |

### If you use uploads (avatars, etc.)

| Variable | Notes |
|----------|--------|
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | |
| `CLOUDINARY_API_SECRET` | |

### Optional

| Variable | Default |
|----------|---------|
| `ACCESS_TOKEN_EXPIRY` | `15m` |
| `REFRESH_TOKEN_EXPIRY` | `7d` |
| `LOG_LEVEL` | `info` |
| `PORT` | Render sets this automatically; app uses `process.env.PORT \|\| 8000`. |

Do **not** commit real secrets. Configure them only in Render (and Neon dashboard for DB passwords).

---

## Neon

- **Staging** Render service → connection string for your **develop / staging** database branch.
- **Production** Render service → connection string for your **production** database branch.
- Run **migrations** against each branch when schema changes (via Render release command or locally with that branch’s `DATABASE_URL`).

---

## First deploy: database schema

1. Deploy the service (build + start).
2. Ensure **Release Command** runs `npm run db:migrate` **or** run once from your machine:

   ```bash
   cd backend
   set DATABASE_URL=postgresql://...   # Windows PowerShell: $env:DATABASE_URL="..."
   npm run db:migrate
   ```

3. If `NODE_ENV=production`, the app does **not** run `sequelize.sync({ alter: true })`; the schema must come from migrations.

---

## GitHub Actions deploy hooks (optional)

If you use `.github/workflows/backend-deploy.yml`, add repository **Secrets**:

- `RENDER_DEPLOY_HOOK_STAGING` — Deploy Hook URL for the staging Web Service  
- `RENDER_DEPLOY_HOOK_PRODUCTION` — Deploy Hook URL for the production Web Service  

(Create hooks under each service on Render: **Settings → Deploy Hook**.)

---

## Local development

Use discrete variables in `backend/.env` (see `backend/.env.example`): `DB_HOST`, `DB_USER`, `DATABASE`, `DB_PASSWORD`, `DB_PORT` — **or** set `DATABASE_URL` for local Docker/Neon.
