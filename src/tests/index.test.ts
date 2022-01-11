import request from 'supertest';
import App from '@/app';
import V1Route from '@routes/v1/v1.route';

afterAll(async () => {
  await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
});

describe('Testing Index', () => {
  describe('[GET] /', () => {
    it('response statusCode 200', () => {
      const route = new V1Route();
      const app = new App([route])

      return request(app.getServer()).get('/status').expect(200);
    });
  });
});
