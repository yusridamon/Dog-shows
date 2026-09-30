# Dog Show Entry & Catalogue

Web-based dog show entry and digital catalogue system.

- **client/** — React public site + admin portal
- **server/** — Express API, Prisma (PostgreSQL)

## Data model

```
DOG  ──<  SHOW ENTRY  >──  SHOW
```

- **Dog** — central registry. `registrationNumber` is the unique identifier. A dog is
  registered once and reused across shows. Columns mirror the registry export (`test.xlsx`).
- **Show** — a single show (multi-show from the start).
- **ShowClass** — configurable class per show (name, sex, min/max age in months, rules).
  Age ranges are admin-configurable, never hard-coded in the frontend.
- **Grade** — configurable grade options (Excellent, Very Good, ...).
- **ShowEntry** — one record per dog per show. Holds status, class, catalogue number,
  grade and pedigree upload. Grading and critiques live here, never on the Dog.
- **Critique** — judge critique per entry, editable before publishing.

## Entry flow

1. Enter registration number → 2. System searches registry →
3a. Found: confirm details / 3b. Not found: manual entry + pedigree upload (PDF/JPG/JPEG/PNG) →
4. System determines class by sex & age → 5. Entry submitted →
6. Admin approves → 7. Catalogue number assigned → 8. Appears in catalogue →
9. Grading & critique captured → 10. Catalogue updates with results.

Manual entries are `PENDING` and only appear in the catalogue after approval. On approval a
manual dog is added to the central registry for future lookups.

## Setup

### 1. Database
Create a PostgreSQL database and set `DATABASE_URL` in `server/.env` (see `.env.example`).

### 2. Server
```
cd server
npm install
npm run db:generate
npm run db:migrate      # creates the tables
npm run db:seed         # admin user, grades, an example show with classes
npm run db:import       # imports dogs from DOG_IMPORT_FILE (test.xlsx)
npm run dev
```
Default admin: `admin@dogshows.test` / `admin123`

### 3. Client
```
cd client
npm install
npm start
```
The client proxies `/api` to `http://localhost:5000`.

## Importing the dog registry

`server/prisma/importDogs.js` reads the Excel export (headers on row 1) and upserts each
dog by registration number. Point `DOG_IMPORT_FILE` at the file, then run `npm run db:import`.
