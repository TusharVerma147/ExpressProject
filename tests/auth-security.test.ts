import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/middlewares/errorHandler';
import { notFoundHandler } from '../src/middlewares/notFound';
import type { Role } from '../src/config/permissions';
import { as, authHeader } from './helpers/auth';

vi.mock('../src/modules/auth/auth.repository', () => ({
  findAuthUserById: vi.fn(),
  findAuthUserByEmail: vi.fn(),
  insertAuthUser: vi.fn(),
  updateUserRole: vi.fn(),
  linkStudent: vi.fn(),
  findUserIdByStudentId: vi.fn(),
}));

vi.mock('../src/modules/admin/admin.repository', () => ({
  insertTeacherClass: vi.fn(),
  findTeacherClasses: vi.fn(),
  teacherTeaches: vi.fn(),
}));

vi.mock('../src/modules/student/student.repository', () => ({
  findMany: vi.fn(),
  findById: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../src/modules/mark/mark.repository', () => ({
  insertMany: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  subjectAverages: vi.fn(),
}));

import * as adminRepository from '../src/modules/admin/admin.repository';
import * as authRepository from '../src/modules/auth/auth.repository';
import * as studentRepository from '../src/modules/student/student.repository';
import routes from '../src/routes';

const mockedFindAuth = vi.mocked(authRepository.findAuthUserById);
const mockedFindMany = vi.mocked(studentRepository.findMany);
const mockedFindTeacherClasses = vi.mocked(adminRepository.findTeacherClasses);

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

const dbUser = (id: number, role: Role, studentId: number | null = null) => ({
  id,
  name: `User ${id}`,
  email: `u${id}@test.com`,
  passwordHash: '$2a$10$hashed',
  role,
  studentId,
  createdAt: new Date(),
});

describe('auth security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFindTeacherClasses.mockResolvedValue([]);
  });

  it('registered plain user cannot see students or marks (403)', async () => {
    mockedFindAuth.mockResolvedValue(dbUser(99, 'user'));

    const app = makeApp();
    const token = as(99, 'user');

    const students = await request(app)
      .get('/api/students')
      .set(authHeader(token));
    expect(students.status).toBe(403);

    const marks = await request(app)
      .get('/api/marks/averages?className=10')
      .set(authHeader(token));
    expect(marks.status).toBe(403);
  });

  it('token issued as teacher stops working for teacher actions after role demotion to user', async () => {
    const app = makeApp();
    const token = as(2, 'teacher');

    mockedFindAuth.mockResolvedValueOnce(dbUser(2, 'teacher'));
    mockedFindMany.mockResolvedValueOnce([]);

    const whileTeacher = await request(app)
      .get('/api/students')
      .set(authHeader(token));
    expect(whileTeacher.status).toBe(200);

    // Admin changed role in DB; JWT is unchanged but authenticate reloads role.
    mockedFindAuth.mockResolvedValueOnce(dbUser(2, 'user'));

    const afterDemotion = await request(app)
      .get('/api/students')
      .set(authHeader(token));
    expect(afterDemotion.status).toBe(403);
  });
});
