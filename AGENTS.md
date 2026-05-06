# PocketPal AI Guide (AGENTS)

This repository contains **PocketPal**, a personal finance app (backend API + React frontend).

## Where to look

### Backend (`backend/`)
- Entry: `backend/src/index.js`
- Express app: `backend/src/app.js` (mounts `/api/v1/*` routes)
- Models: `backend/src/models/` (Sequelize `Model.init` + `.associate()` pattern)
- Services: `backend/src/services/` (business logic)
- Controllers: `backend/src/controllers/` (HTTP layer)
- Routes: `backend/src/routes/` (routing only)
- Validators: `backend/src/validators/` (Joi)

### Frontend (`frontend/`)
- Stack: React (Vite), TypeScript, TailwindCSS, shadcn/ui + Radix UI (per project setup)
- App entry: `frontend/src/main.jsx` (and `frontend/src/App.jsx` or equivalent)
- Suggested layout: `frontend/src/pages`, `frontend/src/features`, `frontend/src/components`, `frontend/src/lib`, `frontend/src/types`

## Key conventions

### Backend
- ES Modules (use `import`/`export`).
- API responses use `ApiResponse`; errors throw `ApiError`.
- Auth uses JWT via HttpOnly cookies and `verifyJWT` middleware.
- Use pino logger; never log secrets.
- Prefer migrations for production; `sequelize.sync({ alter: true })` is dev-only.
- Formatting: `backend/.prettierrc` (including semicolons).

### Frontend
- Tailwind-first styling; use `cn()` for conditional class names; event handlers named `handle*`.
- Accessibility: keyboard support, labels, focus-visible styles.
- Do not add new npm libraries without asking (see `.cursor/rules/dependencies-approval.mdc`).
- Frontend code style follows `.cursor/rules/frontend-*.mdc` (no semicolons under `frontend/`, distinct from backend Prettier).

For more detailed, file-scoped conventions, see `.cursor/rules/*.mdc`.
