# Express Project — Users, Students & Marks (Secured)

Node.js + Express 5 + TypeScript + PostgreSQL (`pg`) + Zod validation + JWT auth.

## Setup (first time)

1. Make sure your `.env` has these values (edit if your Postgres is different):

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=user
DB_PASSWORD=postgres
DB_NAME=express_db_connection
PASS_PERCENTAGE=33.5
ACADEMIC_YEAR=2026-27
JWT_SECRET=dev-jwt-secret-change-me-32chars-min
ACCESS_TOKEN_TTL_SECONDS=900
CORS_ORIGINS=http://localhost:3000
MARKS_RATE_LIMIT_MAX=60
```

2. Install packages, create tables, start the server:

```bash
npm install
npm run db:migrate
npm run dev
```

Server: `http://localhost:3000`

---

## How the code is organised (simple)

```
Request
  → middlewares (cors, logger, JSON, reject dangerous keys)
  → routes        (auth + requirePermission / requireAnyPermission)
  → controller    (HTTP only)
  → service       (business rules + canAccessStudent ownership)
  → repository    (SQL)
  → PostgreSQL
```

---

## 4. Authentication

- `POST /api/auth/register` — creates a plain `user` (no students/marks access)
- `POST /api/auth/login` — returns a short-lived access token (~15 min)
- `Authorization: Bearer <token>` required for students, marks, and admin routes
- Role is **reloaded from the DB on every request** (JWT is not the source of truth for role)

Admin linking (admin only):

- `POST /api/admin/teacher-classes` `{ teacherUserId, className, section }`
- `POST /api/admin/student-links` `{ userId, studentId }`

---

## 5. Permissions

Code checks **permissions**, never `role === '...'` outside `permissions.ts`.

| Permission | admin | teacher | student |
|---|---|---|---|
| students:read:own | ✓ | - | ✓ |
| students:read:class | ✓ | ✓ | - |
| students:read:any | ✓ | - | - |
| students:write:any | ✓ | - | - |
| marks:read:own | ✓ | - | ✓ |
| marks:read:class | ✓ | ✓ | - |
| marks:read:any | ✓ | - | - |
| marks:write:class | ✓ | ✓ | - |
| marks:write:any | ✓ | - | - |
| marks:averages:class | ✓ | ✓ | - |
| marks:averages:any | ✓ | - | - |

Ownership / class scope is decided in services via `canAccessStudent` (and list filtering).

**B3 decisions**

1. **LIST endpoints filter (not 403)** — a teacher/student only receives rows in scope; a blanket 403 would reveal that other data exists without showing it.
2. **Single out-of-scope records use 403** — same status everywhere so clients can treat “authenticated but not allowed” consistently (averages for an untaught class also 403).

### Curl examples

Teacher (own classes):

```bash
TOKEN=... # Ms Rao
curl -s http://localhost:3000/api/students \
  -H "Authorization: Bearer $TOKEN"
```

Student (self only):

```bash
TOKEN=... # Priya
curl -s http://localhost:3000/api/students/17 \
  -H "Authorization: Bearer $TOKEN"
```

Forbidden (teacher reading another class):

```bash
TOKEN=... # Ms Rao
curl -s -o /dev/null -w "%{http_code}\n" \
  http://localhost:3000/api/students/23 \
  -H "Authorization: Bearer $TOKEN"
# → 403
```

---

## 6. API security

- Per-user rate limit on `POST /api/students/:id/marks` (`MARKS_RATE_LIMIT_MAX` / 10 minutes, keyed by `req.user.id`)
- `Cache-Control: no-store` on `/api/auth`, `/api/students`, `/api/marks`
- `CORS_ORIGINS="*"` fails at boot with a clear “allow-all is unsafe” message
- Response `curl` helpers redact bearer tokens and passwords

---

## Useful scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start with auto-reload |
| `npm run db:migrate` | Apply `db/schema.sql` (idempotent) |
| `npm run typecheck` | TypeScript check |
| `npm run build` / `npm start` | Production build and run |
| `npm test` | Vitest suite (auth, authorisation, API security) |
