import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/middlewares/errorHandler';
import { notFoundHandler } from '../src/middlewares/notFound';
import type { Role } from '../src/config/permissions';
import type { Student } from '../src/modules/student/student.interface';
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
import * as markRepository from '../src/modules/mark/mark.repository';
import * as studentRepository from '../src/modules/student/student.repository';
import routes from '../src/routes';

const mockedFindAuth = vi.mocked(authRepository.findAuthUserById);
const mockedFindMany = vi.mocked(studentRepository.findMany);
const mockedFindById = vi.mocked(studentRepository.findById);
const mockedInsert = vi.mocked(studentRepository.insert);
const mockedUpdate = vi.mocked(studentRepository.update);
const mockedRemove = vi.mocked(studentRepository.remove);
const mockedInsertMany = vi.mocked(markRepository.insertMany);
const mockedMarkFindById = vi.mocked(markRepository.findById);
const mockedMarkUpdate = vi.mocked(markRepository.update);
const mockedAverages = vi.mocked(markRepository.subjectAverages);
const mockedTeacherTeaches = vi.mocked(adminRepository.teacherTeaches);
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
  passwordHash: 'hash',
  role,
  studentId,
  createdAt: new Date(),
});

const student = (overrides: Partial<Student> & Pick<Student, 'id' | 'className' | 'section'>): Student => ({
  rollNo: `2026-${overrides.className}${overrides.section}-001`,
  firstName: 'Test',
  lastName: 'Student',
  dateOfBirth: new Date(Date.UTC(2015, 0, 1)),
  guardian: { name: 'Guardian', phone: '+919876543210', relation: 'father' },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/** Fixture actors from the brief */
const MS_RAO = 2;
const PRIYA = 4;
const ADMIN = 1;

describe('authorisation matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFindTeacherClasses.mockResolvedValue([
      { teacherUserId: MS_RAO, className: '10', section: 'A' },
      { teacherUserId: MS_RAO, className: '10', section: 'B' },
    ]);
    mockedTeacherTeaches.mockImplementation(async (teacherId, className, section) => {
      if (teacherId !== MS_RAO) return className === '9' && section === 'C';
      return className === '10' && (section === 'A' || section === 'B');
    });
  });

  it.each([
    // GET /api/students — list filters; all authenticated roles with a read perm get 200
    {
      name: 'admin lists students',
      role: 'admin' as Role,
      userId: ADMIN,
      studentId: null,
      method: 'get' as const,
      path: '/api/students',
      expected: 200,
    },
    {
      name: 'teacher lists students',
      role: 'teacher' as Role,
      userId: MS_RAO,
      studentId: null,
      method: 'get' as const,
      path: '/api/students',
      expected: 200,
    },
    {
      name: 'student lists students',
      role: 'student' as Role,
      userId: PRIYA,
      studentId: 17,
      method: 'get' as const,
      path: '/api/students',
      expected: 200,
    },
    // GET /api/students/:id — Priya self
    {
      name: 'student gets self',
      role: 'student' as Role,
      userId: PRIYA,
      studentId: 17,
      method: 'get' as const,
      path: '/api/students/17',
      expected: 200,
      setup: () => {
        mockedFindById.mockResolvedValue(student({ id: 17, className: '10', section: 'A' }));
      },
    },
    // POST students — teacher/student 403
    {
      name: 'teacher cannot create student',
      role: 'teacher' as Role,
      userId: MS_RAO,
      studentId: null,
      method: 'post' as const,
      path: '/api/students',
      body: {
        rollNo: '2026-10A-099',
        firstName: 'New',
        lastName: 'Kid',
        dateOfBirth: '2015-05-18',
        className: '10',
        section: 'A',
        guardian: { name: 'G', phone: '+919876543210', relation: 'father' },
      },
      expected: 403,
    },
    {
      name: 'student cannot create student',
      role: 'student' as Role,
      userId: PRIYA,
      studentId: 17,
      method: 'post' as const,
      path: '/api/students',
      body: {
        rollNo: '2026-10A-099',
        firstName: 'New',
        lastName: 'Kid',
        dateOfBirth: '2015-05-18',
        className: '10',
        section: 'A',
        guardian: { name: 'G', phone: '+919876543210', relation: 'father' },
      },
      expected: 403,
    },
    {
      name: 'admin can create student',
      role: 'admin' as Role,
      userId: ADMIN,
      studentId: null,
      method: 'post' as const,
      path: '/api/students',
      body: {
        rollNo: '2026-10A-099',
        firstName: 'New',
        lastName: 'Kid',
        dateOfBirth: '2015-05-18',
        className: '10',
        section: 'A',
        guardian: { name: 'Guardian', phone: '+919876543210', relation: 'father' },
      },
      expected: 201,
      setup: () => {
        mockedInsert.mockResolvedValue(student({ id: 50, className: '10', section: 'A', firstName: 'New', lastName: 'Kid', rollNo: '2026-10A-099' }));
      },
    },
    // POST marks — teacher own class ok, student 403
    {
      name: 'teacher posts marks for own class',
      role: 'teacher' as Role,
      userId: MS_RAO,
      studentId: null,
      method: 'post' as const,
      path: '/api/students/17/marks',
      body: { exam: 'final', marks: [{ subject: 'maths', score: 70, maxScore: 100 }] },
      expected: 201,
      setup: () => {
        mockedFindById.mockResolvedValue(student({ id: 17, className: '10', section: 'A', firstName: 'Priya' }));
        mockedInsertMany.mockResolvedValue([
          {
            id: 1,
            studentId: 17,
            exam: 'final' as const,
            subject: 'maths',
            score: 70,
            maxScore: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
      },
    },
    {
      name: 'student cannot post marks',
      role: 'student' as Role,
      userId: PRIYA,
      studentId: 17,
      method: 'post' as const,
      path: '/api/students/17/marks',
      body: { exam: 'final', marks: [{ subject: 'maths', score: 70, maxScore: 100 }] },
      expected: 403,
    },
    // averages — student 403; teacher wrong class 403; teacher own class 200
    {
      name: 'student cannot read averages',
      role: 'student' as Role,
      userId: PRIYA,
      studentId: 17,
      method: 'get' as const,
      path: '/api/marks/averages?className=10',
      expected: 403,
    },
    {
      name: 'teacher averages for untaught class → 403',
      role: 'teacher' as Role,
      userId: MS_RAO,
      studentId: null,
      method: 'get' as const,
      path: '/api/marks/averages?className=9',
      expected: 403,
    },
    {
      name: 'teacher averages for own class',
      role: 'teacher' as Role,
      userId: MS_RAO,
      studentId: null,
      method: 'get' as const,
      path: '/api/marks/averages?className=10',
      expected: 200,
      setup: () => {
        mockedAverages.mockResolvedValue([
          { subject: 'maths', averagePercentage: 70, students: 1 },
        ]);
      },
    },
  ])('$name → $expected', async (row) => {
    row.setup?.();
    mockedFindAuth.mockResolvedValue(dbUser(row.userId, row.role, row.studentId));
    if (row.method === 'get' && row.path === '/api/students') {
      mockedFindMany.mockResolvedValue([]);
    }

    const app = makeApp();
    const token = as(row.userId, row.role);
    const req = request(app)[row.method](row.path).set(authHeader(token));
    if (row.body) req.send(row.body);

    const res = await req;
    expect(res.status).toBe(row.expected);
  });
});

describe('IDOR & list filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFindTeacherClasses.mockResolvedValue([
      { teacherUserId: MS_RAO, className: '10', section: 'A' },
      { teacherUserId: MS_RAO, className: '10', section: 'B' },
    ]);
    mockedTeacherTeaches.mockImplementation(async (teacherId, className, section) => {
      if (teacherId !== MS_RAO) return false;
      return className === '10' && (section === 'A' || section === 'B');
    });
  });

  it('IDOR: Ms Rao cannot get student 23 (9C) → 403', async () => {
    mockedFindAuth.mockResolvedValue(dbUser(MS_RAO, 'teacher'));
    mockedFindById.mockResolvedValue(student({ id: 23, className: '9', section: 'C', firstName: 'Arjun' }));

    const app = makeApp();
    const res = await request(app)
      .get('/api/students/23')
      .set(authHeader(as(MS_RAO, 'teacher')));

    expect(res.status).toBe(403);
  });

  it('IDOR: Ms Rao cannot post marks for student 23 — repository write never called', async () => {
    mockedFindAuth.mockResolvedValue(dbUser(MS_RAO, 'teacher'));
    mockedFindById.mockResolvedValue(student({ id: 23, className: '9', section: 'C', firstName: 'Arjun' }));

    const app = makeApp();
    const res = await request(app)
      .post('/api/students/23/marks')
      .set(authHeader(as(MS_RAO, 'teacher')))
      .send({ exam: 'final', marks: [{ subject: 'maths', score: 50, maxScore: 100 }] });

    expect(res.status).toBe(403);
    expect(mockedInsertMany).not.toHaveBeenCalled();
  });

  it('list filtering: Priya listing students gets exactly herself', async () => {
    mockedFindAuth.mockResolvedValue(dbUser(PRIYA, 'student', 17));
    mockedFindMany.mockResolvedValue([
      student({ id: 17, className: '10', section: 'A', firstName: 'Priya' }),
      student({ id: 23, className: '9', section: 'C', firstName: 'Arjun' }),
      student({ id: 18, className: '10', section: 'A', firstName: 'Other' }),
    ]);

    const app = makeApp();
    const res = await request(app)
      .get('/api/students')
      .set(authHeader(as(PRIYA, 'student')));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(17);
    expect(res.body.data[0].firstName).toBe('Priya');
  });

  it('PATCH student / DELETE student forbidden for teacher', async () => {
    mockedFindAuth.mockResolvedValue(dbUser(MS_RAO, 'teacher'));
    const app = makeApp();
    const token = as(MS_RAO, 'teacher');

    const patch = await request(app)
      .patch('/api/students/17')
      .set(authHeader(token))
      .send({ section: 'B' });
    expect(patch.status).toBe(403);
    expect(mockedUpdate).not.toHaveBeenCalled();

    const del = await request(app).delete('/api/students/17').set(authHeader(token));
    expect(del.status).toBe(403);
    expect(mockedRemove).not.toHaveBeenCalled();
  });

  it('PATCH mark outside class blocked and write never called', async () => {
    mockedFindAuth.mockResolvedValue(dbUser(MS_RAO, 'teacher'));
    mockedMarkFindById.mockResolvedValue({
      id: 9,
      studentId: 23,
      exam: 'final',
      subject: 'maths',
      score: 40,
      maxScore: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockedFindById.mockResolvedValue(student({ id: 23, className: '9', section: 'C' }));

    const app = makeApp();
    const res = await request(app)
      .patch('/api/marks/9')
      .set(authHeader(as(MS_RAO, 'teacher')))
      .send({ score: 99 });

    expect(res.status).toBe(403);
    expect(mockedMarkUpdate).not.toHaveBeenCalled();
  });
});
