-- Students & Marks schema (replaces the older name/email + simple marks model).
-- Also keeps a minimal users table so the existing user module keeps working.
-- Run: npm run db:migrate

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_students_class_section ON students (class_name, section);
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks (student_id);
CREATE INDEX IF NOT EXISTS idx_marks_subject ON marks (subject);
