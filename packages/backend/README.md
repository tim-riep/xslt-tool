# Backend — XSLT Development & Testing Tool

Fastify 5 API server that compiles and executes XSLT 3.0 transformations via Saxon-JS.

## Prerequisites

- **Node.js** 22+
- **PostgreSQL** running locally (or a remote instance)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_PASSPHRASE` | Secret for signing JWTs (use a long, random string) | — |
| `PORT` | Server port | `3000` |
| `SECURE_COOKIES` | Set to `false` for local development without HTTPS | `true` |

### 3. Set up the database

Run Prisma migrations to create the database schema:

```bash
npx prisma migrate dev
```

This applies all migrations from `prisma/migrations/` and generates the Prisma client into `src/generated/prisma/`.

> If you only need to regenerate the client without running migrations:
> ```bash
> npx prisma generate
> ```

### 4. Start the development server

```bash
npm run watch
```

The server starts at `http://localhost:3000` (or the port you configured).

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Run once with tsx |
| `npm run watch` | Run with auto-reload on file changes |
| `npm run build` | Generate Prisma client and compile TypeScript |
| `npm run start` | Run compiled output (production) |
| `npm run lint` | Run ESLint |

## API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register a new user |
| POST | `/auth/login` | No | Login / refresh token |
| POST | `/auth/logout` | Yes | Logout (clear refresh cookie) |
| POST | `/transform/adhoc` | Yes | Execute an XSLT transformation |
| GET | `/users/me` | Yes | Get current user info |

Swagger UI is available at `/documentation` when the server is running.

## Database

The project uses Prisma 7 with PostgreSQL. The schema is defined in `prisma/schema.prisma`.

To create a new migration after changing the schema:

```bash
npx prisma migrate dev --name describe_your_change
```

To reset the database (drops all data):

```bash
npx prisma migrate reset
```
