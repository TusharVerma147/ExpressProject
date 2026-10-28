import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/middlewares/errorHandler';
import { notFoundHandler } from '../src/middlewares/notFound';
import { createRateLimiter } from '../src/middlewares/rateLimit';
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
import * as authService from '../src/modules/auth/auth.service';
import * as markRepository from '../src/modules/mark/mark.repository';
import * as studentRepository from '../src/modules/student/student.repository';
import routes from '../src/routes';

const mockedFindAuth = vi.mocked(authRepository.findAuthUserById);
const mockedFindById = vi.mocked(studentRepository.findById);
const mockedFindMany = vi.mocked(studentRepository.findMany);
const mockedAverages = vi.mocked(markRepository.subjectAverages);
const mockedTeacherTeaches = vi.mocked(adminRepository.teacherTeaches);

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

const dbUser = (
  id: number,
  role: 'admin' | 'teacher' | 'student' | 'user',
  studentId: number | null = null,
) => ({
  id,
  name: `User ${id}`,
  email: `u${id}@test.com`,
  passwordHash: 'hash',
  role,
  studentId,
  createdAt: new Date(),
});

describe('C1 per-user marks rate limit', () => {
  it('user A over limit → 429; user B on same IP still succeeds', async () => {
    const limiter = createRateLimiter({
      windowMs: 10 * 60 * 1000,
      max: 2,
      keyFn: (req) => `marks-write:${req.user!.id}`,
      message: 'Mark entry rate limit exceeded; try again later',
    });

    const app = express();
    app.use(express.json());
    app.post(
      '/marks',
      (req, _res, next) => {
        const userId = Number(req.headers['x-user-id']);
        req.user = {
          id: userId,
          email: `u${userId}@t.com`,
          name: 'T',
          role: 'teacher',
          studentId: null,
        };
        next();
      },
      limiter,
      (_req, res) => {
        res.status(201).json({ data: { ok: true } });
      },
    );
    app.use(errorHandler);

    const ip = '203.0.113.10';

    expect((await request(app).post('/marks').set('X-Forwarded-For', ip).set('x-user-id', '10')).status).toBe(
      201,
    );
    expect((await request(app).post('/marks').set('X-Forwarded-For', ip).set('x-user-id', '10')).status).toBe(
      201,
    );
    const limited = await request(app).post('/marks').set('X-Forwarded-For', ip).set('x-user-id', '10');
    expect(limited.status).toBe(429);
    expect(limited.body.error).toMatchObject({ message: expect.stringMatching(/rate limit/i) });

    const otherUser = await request(app).post('/marks').set('X-Forwarded-For', ip).set('x-user-id', '11');
    expect(otherUser.status).toBe(201);
  });
});

describe('C2 Cache-Control no-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets Cache-Control: no-store on success and error under /api/students', async () => {
    mockedFindAuth.mockResolvedValue(dbUser(1, 'admin'));
    mockedFindById.mockResolvedValue({
      id: 1,
      rollNo: '2026-10A-001',
      firstName: 'A',
      lastName: 'B',
      dateOfBirth: new Date(Date.UTC(2015, 0, 1)),
      className: '10',
      section: 'A',
      guardian: { name: 'G', phone: '+919876543210', relation: 'father' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = makeApp();
    const token = as(1, 'admin');

    const ok = await request(app).get('/api/students/1').set(authHeader(token));
    expect(ok.status).toBe(200);
    expect(ok.headers['cache-control']).toBe('no-store');

    mockedFindById.mockResolvedValue(null);
    const err = await request(app).get('/api/students/999').set(authHeader(token));
    expect(err.status).toBe(404);
    expect(err.headers['cache-control']).toBe('no-store');
  });

  it('sets Cache-Control: no-store on /api/auth error', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/auth/login').send({ email: 'bad', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('C4 no secrets in responses', () => {
  it('login + three student/marks calls never leak password, hash, or raw token in curl/bodies', async () => {
    const password = 'SuperSecretPass1';
    const accessToken = 'FAKE_ACCESS_TOKEN_VALUE_XYZ';

    vi.spyOn(authService, 'login').mockResolvedValue({
      accessToken,
      user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin', studentId: null },
    });

    mockedFindAuth.mockResolvedValue(dbUser(1, 'admin'));
    mockedFindById.mockResolvedValue({
      id: 17,
      rollNo: '2026-10A-017',
      firstName: 'Priya',
      lastName: 'S',
      dateOfBirth: new Date(Date.UTC(2015, 0, 1)),
      className: '10',
      section: 'A',
      guardian: { name: 'G', phone: '+919876543210', relation: 'father' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockedFindMany.mockResolvedValue([]);
    mockedAverages.mockResolvedValue([]);
    mockedTeacherTeaches.mockResolvedValue(true);

    const app = makeApp();

    const login = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password,
    });
    expect(login.status).toBe(200);
    expect(login.body.data.accessToken).toBe(accessToken);

    const token = as(1, 'admin');
    const followUps = [
      await request(app).get('/api/students').set(authHeader(token)),
      await request(app).get('/api/students/17').set(authHeader(token)),
      await request(app).get('/api/marks/averages?className=10').set(authHeader(token)),
    ];

    const bodies = [login.body, ...followUps.map((r) => r.body)].map((b) => JSON.stringify(b));

    for (const body of bodies) {
      expect(body).not.toContain(password);
      expect(body).not.toMatch(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{20,}/);
    }

    for (const res of followUps) {
      const raw = JSON.stringify(res.body);
      expect(raw).not.toContain(token);
      expect(raw).not.toContain(accessToken);
      expect(res.body.curl).toContain('Bearer <redacted>');
    }

    expect(JSON.stringify(login.body.curl)).not.toContain(password);
  });
});

describe('admin linking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects linking a non-teacher to a class with 400', async () => {
    mockedFindAuth
      .mockResolvedValueOnce(dbUser(1, 'admin'))
      .mockResolvedValueOnce(dbUser(4, 'student', 17));

    const app = makeApp();
    const res = await request(app)
      .post('/api/admin/teacher-classes')
      .set(authHeader(as(1, 'admin')))
      .send({ teacherUserId: 4, className: '10', section: 'A' });

    expect(res.status).toBe(400);
  });

  it('rejects linking a non-student account with 400', async () => {
    mockedFindAuth
      .mockResolvedValueOnce(dbUser(1, 'admin'))
      .mockResolvedValueOnce(dbUser(2, 'teacher'));

    const app = makeApp();
    const res = await request(app)
      .post('/api/admin/student-links')
      .set(authHeader(as(1, 'admin')))
      .send({ userId: 2, studentId: 17 });

    expect(res.status).toBe(400);
  });
});
