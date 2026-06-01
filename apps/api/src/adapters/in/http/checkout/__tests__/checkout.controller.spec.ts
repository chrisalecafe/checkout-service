import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { CheckoutController } from '../checkout.controller';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

const TEST_SECRET = 'test-secret-32-chars-minimum-ok!!';
const makeToken = (userId = 'user-1') =>
  jwt.sign({ sub: userId }, TEST_SECRET, { expiresIn: 3600 });

const mockAuthProvider = {
  validateToken: jest.fn(async (token: string) => {
    const p = jwt.verify(token, TEST_SECRET) as { sub: string };
    return { userId: p.sub };
  }),
};

const mockProcessCheckout = {
  execute: jest.fn(),
};

const mockGetHistory = {
  execute: jest.fn(),
};

describe('CheckoutController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckoutController],
      providers: [
        { provide: 'IAuthProvider', useValue: mockAuthProvider },
        { provide: 'IProcessCheckout', useValue: mockProcessCheckout },
        { provide: 'IGetCheckoutHistory', useValue: mockGetHistory },
        JwtAuthGuard,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => jest.clearAllMocks());

  describe('POST /checkout', () => {
    it('returns 401 with no token', () =>
      request(app.getHttpServer()).post('/checkout').send({ items: [] }).expect(401));

    it('returns 400 when items is empty', () => {
      mockProcessCheckout.execute.mockResolvedValue({});
      return request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ items: [] })
        .expect(400);
    });

    it('returns 201 with valid payload', async () => {
      const result = { subtotal: 50, taxes: 6.5, discount: 0, total: 56.5 };
      mockProcessCheckout.execute.mockResolvedValue(result);

      const res = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${makeToken('user-abc')}`)
        .send({ items: [{ name: 'Widget', unit_price: 50, quantity: 1 }] })
        .expect(201);

      expect(res.body).toEqual(result);
      expect(mockProcessCheckout.execute).toHaveBeenCalledWith(
        'user-abc',
        [{ name: 'Widget', unit_price: 50, quantity: 1 }],
      );
    });

    it('strips unknown fields from items', async () => {
      mockProcessCheckout.execute.mockResolvedValue({});

      await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({ items: [{ name: 'A', unit_price: 10, quantity: 1, extra: 'bad' }] })
        .expect(400);
    });
  });

  describe('GET /checkout/history', () => {
    it('returns 401 with no token', () =>
      request(app.getHttpServer()).get('/checkout/history').expect(401));

    it('returns 200 with history', async () => {
      const sessions = [{ id: 'sess-1', total: 56.5 }];
      mockGetHistory.execute.mockResolvedValue(sessions);

      const res = await request(app.getHttpServer())
        .get('/checkout/history')
        .set('Authorization', `Bearer ${makeToken('user-1')}`)
        .expect(200);

      expect(res.body).toEqual(sessions);
      expect(mockGetHistory.execute).toHaveBeenCalledWith('user-1');
    });
  });
});
