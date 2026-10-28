# Express Project — Users, Students & Marks

Node.js + Express 5 + TypeScript + PostgreSQL (`pg`) + Zod validation.

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
```

2. Install packages, create tables, start the server:

```bash
npm install
npm run db:migrate
npm run dev
```

Server: `http://localhost:3000`

If `PASS_PERCENTAGE` or `ACADEMIC_YEAR` is missing/wrong, the app prints the problem and exits.

---

## How the code is organised (simple)

```
Request
  → middlewares (logger, JSON, reject dangerous keys)
  → routes        (which URL?)
  → controller    (HTTP only: read req, call service, send response)
  → service       (business rules)
  → repository    (SQL + map DB rows ↔ app objects)
  → PostgreSQL
```

Each feature lives in one folder:

- `src/modules/student/` — student CRUD
- `src/modules/mark/` — marks + averages
- `src/modules/user/` — existing users API

Errors are thrown (`notFound`, `conflict`, …) and handled once in `errorHandler`.

---

## API overview

Base path: `/api`

| Method | Path | What it does |
|--------|------|----------------|
| GET | `/health` | Health check |
| GET/POST/PATCH/DELETE | `/users` … | User CRUD |
| GET/POST/PATCH/DELETE | `/students` … | Student CRUD |
| POST | `/students/:id/marks` | Add many subject marks for one exam |
| GET/PATCH/DELETE | `/marks/:id` | One mark |
| GET | `/marks/averages?className=10` | Subject averages + pass/fail |

Successful responses look like `{ "data": ... }`.  
Errors look like `{ "error": { "message": "...", "details": ... } }`.

---

## Students

### Create — `POST /api/students`

```bash
curl -s -X POST http://localhost:3000/api/students \
  -H 'Content-Type: application/json' \
  -d '{
    "rollNo":"2026-10A-017",
    "firstName":"Asha",
    "lastName":"Sharma",
    "dateOfBirth":"2015-05-15",
    "className":"10",
    "section":"A",
    "guardian":{
      "name":"Ravi Sharma",
      "phone":"+919876543210",
      "relation":"father"
    }
  }'
```

### List — `GET /api/students`

Optional query: `className`, `section`, `search`, `limit`, `offset`.

```bash
curl -s 'http://localhost:3000/api/students?className=10&section=A'
```

### Get / Update / Delete

```bash
curl -s http://localhost:3000/api/students/1

curl -s -X PATCH http://localhost:3000/api/students/1 \
  -H 'Content-Type: application/json' \
  -d '{"section":"B"}'

curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:3000/api/students/1
```

Delete also removes that student’s marks (`ON DELETE CASCADE`).

---

## Marks

### Add marks for a student — `POST /api/students/:id/marks`

```bash
curl -s -X POST http://localhost:3000/api/students/1/marks \
  -H 'Content-Type: application/json' \
  -d '{
    "exam":"final",
    "marks":[
      {"subject":"maths","score":78.5,"maxScore":100},
      {"subject":"english","score":66}
    ]
  }'
```

All marks in the request are saved together (one transaction). Duplicate exam+subject → **409**.

### Update / Delete one mark

```bash
curl -s -X PATCH http://localhost:3000/api/marks/1 \
  -H 'Content-Type: application/json' \
  -d '{"score":80}'

curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:3000/api/marks/1
```

### Subject averages — `GET /api/marks/averages`

`className` is required. Optional: `exam`, `section`.

```bash
curl -s 'http://localhost:3000/api/marks/averages?className=10&exam=final'
```

Each subject gets `averagePercentage` and `passed` (compared to `PASS_PERCENTAGE` in `.env`).

---

## Useful scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start with auto-reload |
| `npm run db:migrate` | Create / reset students + marks tables |
| `npm run typecheck` | Check TypeScript |
| `npm run build` / `npm start` | Production build and run |
