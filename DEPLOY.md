# Deploying the Cape Rottweiler Club Dog Shows platform

Three parts: a React client (Create React App), an Express + Prisma API, and a
PostgreSQL database. All environment-specific config comes from environment
variables, so the same code runs locally and in production.

- `client/` React frontend
- `server/` Express API with Prisma
- PostgreSQL database (`dog_shows`)

This app accepts file uploads (pedigrees and completed entry forms). On managed
hosts the container disk is ephemeral, so production MUST store uploads on a
persistent volume (see Step 5).

---

## Local development

### Server (`server/`)
```bash
npm install
npm run db:push       # create tables
npm run db:seed       # admin user, grades, example shows with default classes
npm run db:import     # import the dog registry from DOG_IMPORT_FILE (optional)
npm run dev           # http://localhost:5001
```
Copy `server/.env.example` to `server/.env` and fill in values first.
Default admin: `admin@dogshows.test` / `admin123`.

### Client (`client/`)
```bash
npm install
npm start             # http://localhost:3000
```
Leave `REACT_APP_API_URL` unset locally; the CRA proxy forwards `/api` to
`http://localhost:5001`.

---

## Production deployment (Railway API + Postgres, Cloudflare Pages client)

### Step 1: Provision managed PostgreSQL
Create a Postgres instance and copy its connection string (`DATABASE_URL`).
Append `?sslmode=require` if the provider needs SSL.

### Step 2: Deploy the server (`server/` root directory) to Railway
Set these environment variables on the service:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Required. From Step 1. |
| `JWT_SECRET` | Required. Long random secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | The live client URL. Comma-separated list allowed to also permit localhost. |
| `UPLOADS_DIR` | Path of the mounted volume, e.g. `/data` (see Step 5). |

Railway injects `PORT`. `postinstall` runs `prisma generate`. Start command is `npm start`.

### Step 3: Initialise the database (once)
From a shell whose `DATABASE_URL` points at production:
```bash
npx prisma db push
npm run db:seed
```
Use `db push` (this project has no migration baseline). Do NOT run
`prisma migrate dev` against production; it can reset data.

Optional: import the dog registry. Set `DOG_IMPORT_FILE` to the Excel export and
run `npm run db:import` (this is a large one-off; run it from a machine that has
the file, pointed at the production `DATABASE_URL`).

### Step 4: Deploy the client (`client/` root directory) to Cloudflare Pages
- Build command: `npm run build`
- Output directory: `build`
- Environment variable: `REACT_APP_API_URL` = the Railway API origin WITHOUT `/api`.
`_routes.json` handles SPA routing so refreshes resolve.

### Step 5: Attach a persistent volume for uploads (IMPORTANT)
On the Railway API service, add a Volume and mount it at a path such as `/data`,
then set `UPLOADS_DIR=/data`. The API stores pedigrees under
`/data/pedigrees` and entry forms under `/data/entry-forms`, and serves them at
`/uploads/...`. Without a volume, uploaded documents are lost on every redeploy.

### Step 6: Wire up CORS and test
Set the API `CLIENT_URL` to the deployed client URL and redeploy. Test the full
flow: look up a dog, download and upload the entry form, submit, then approve in
admin and view the uploaded documents.

### Step 7: Security before go-live
- Change the seeded admin password (`admin@dogshows.test` / `admin123`).
- Use a strong `JWT_SECRET`. Never commit `.env`.

---

## Required environment variables

### Server
| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `JWT_SECRET` | Yes | Long random secret. |
| `JWT_EXPIRES_IN` | No | Defaults to `7d`. |
| `NODE_ENV` | Yes | `production` on the host. |
| `CLIENT_URL` | Yes | Allowed browser origin(s), comma-separated allowed. |
| `UPLOADS_DIR` | Yes (prod) | Mounted volume path for uploads (e.g. `/data`). |
| `PORT` | Injected | Host injects it; falls back to 5001 locally. |
| `DOG_IMPORT_FILE` | No | Only for the one-off registry import. |

### Client
| Variable | Required | Notes |
| --- | --- | --- |
| `REACT_APP_API_URL` | Yes (prod) | API origin without `/api`. Leave unset locally. |

---

## Troubleshooting
- CORS errors: `CLIENT_URL` must match the client origin exactly (no trailing slash).
- 404 on refresh: ensure `_routes.json` deployed and output dir is `build`.
- Uploaded documents 404 or vanish after redeploy: attach a volume and set `UPLOADS_DIR`.
- Prisma client errors: ensure `postinstall`/`prisma generate` ran during build.
- Empty class dropdown: each show has its own classes; new shows get the default
  KUSA set automatically.

## Notes
- Uses `db push` (no versioned migrations committed).
- Uploads (pedigrees, entry forms) require a persistent volume in production.
- The dog registry (thousands of dogs) is imported separately via `db:import`.
