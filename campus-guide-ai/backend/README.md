# Campus Guide-AI Backend Starter

This is the first backend layer for the Campus Guide-AI project.

## Stack

- Node.js
- Express
- PostgreSQL / Neon
- `pg`
- CORS
- dotenv

## Setup

From this folder:

```bash
npm install
```

Copy `.env.example` to `.env` and put your Neon connection string in `DATABASE_URL`.

Then run the SQL in `schema.sql` inside the Neon SQL Editor.

Start locally:

```bash
npm run dev
```

Health check:

```text
http://localhost:5000/api/health
```

Buildings:

```text
http://localhost:5000/api/buildings
```

## Important

Do not add fake campus coordinates or unverified locations. The frontend can only consume verified campus records.
