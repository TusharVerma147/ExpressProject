-- Students, Marks, Auth & school scoping.
-- Idempotent: safe to run `npm run db:migrate` more than once.
-- Run: npm run db:migrate

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auth columns (added idempotently for existing DBs)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

-- Drop student link before recreating students (FK safety)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_student_id_fkey;
ALTER TABLE users DROP COLUMN IF EXISTS student_id;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'user', 'moderator', 'teacher', 'student'));

DROP TABLE IF EXISTS teacher_classes;
DROP TABLE IF EXISTS marks;
DROP TABLE IF EXISTS students;

CREATE TABLE students (
  id                 SERIAL PRIMARY KEY,
  roll_no            VARCHAR(32) NOT NULL UNIQUE,
  first_name         VARCHAR(100) NOT NULL,
  last_name          VARCHAR(100) NOT NULL,
  date_of_birth      DATE NOT NULL,
  class_name         VARCHAR(2) NOT NULL,
  section            CHAR(1) NOT NULL,
  guardian_name      VARCHAR(100) NOT NULL,
  guardian_phone     VARCHAR(20) NOT NULL,
  guardian_relation  VARCHAR(20) NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marks (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam        VARCHAR(20) NOT NULL,
  subject     VARCHAR(50) NOT NULL,
  score       NUMERIC(5, 2) NOT NULL,
  max_score   NUMERIC(5, 2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, exam, subject)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id INTEGER NULL REFERENCES students(id);

CREATE TABLE teacher_classes (
  teacher_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_name      VARCHAR(2) NOT NULL,
  section         CHAR(1) NOT NULL,
  PRIMARY KEY (teacher_user_id, class_name, section)
);

CREATE INDEX IF NOT EXISTS idx_students_class_section ON students (class_name, section);
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks (student_id);
CREATE INDEX IF NOT EXISTS idx_marks_subject ON marks (subject);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users (student_id);
