import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../auth.controller';

const mockAuthProvider = {
  register: jest.fn(),
  verifyCredentials: jest.fn(),
  issueToken: jest.fn(),
  validateToken: jest.fn(),
};

describe('AuthController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: 'IAuthProvider', useValue: mockAuthProvider }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => jest.clearAllMocks());

  describe('POST /auth/register', () => {
    it('returns 201 with userId on success', async () => {
      mockAuthProvider.register.mockResolvedValue({ userId: 'uuid-1' });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new@example.com', password: 'password123' })
        .expect(201);

      expect(res.body).toEqual({ userId: 'uuid-1' });
    });

    it('returns 400 for invalid email', () =>
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'password123' })
        .expect(400));

    it('returns 400 when password is missing', () =>
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'user@example.com' })
        .expect(400));
  });

  describe('POST /auth/login', () => {
    it('returns 200 with access_token on valid credentials', async () => {
      mockAuthProvider.verifyCredentials.mockResolvedValue({ userId: 'uuid-1' });
      mockAuthProvider.issueToken.mockResolvedValue({ access_token: 'tok', expires_in: 3600 });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'dev@example.com', password: 'password123' })
        .expect(200);

      expect(res.body).toEqual({ access_token: 'tok', expires_in: 3600 });
    });

    it('returns 401 on bad credentials', async () => {
      const { UnauthorizedException } = await import('@nestjs/common');
      mockAuthProvider.verifyCredentials.mockRejectedValue(new UnauthorizedException());

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'dev@example.com', password: 'wrong' })
        .expect(401);
    });

    it('returns 400 for invalid email', () =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'bad', password: 'pass' })
        .expect(400));
  });
});
