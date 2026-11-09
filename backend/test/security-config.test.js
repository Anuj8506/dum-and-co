const { test } = require('node:test');
const { randomBytes } = require('node:crypto');
const request = require('supertest');

process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.TRUST_PROXY = '';

const app = require('../src/app');

test('spoofed forwarded addresses do not bypass the default production sign-in limit', async () => {
  const invalidLogin = { email: 'not-an-email', password: 'invalid' };
  await request(app).post('/api/auth/login').send(invalidLogin).expect(400);
  for (let attempt = 1; attempt < 40; attempt++) {
    await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', `192.0.2.${attempt}`)
      .send(invalidLogin)
      .expect(400);
  }
  await request(app)
    .post('/api/auth/login')
    .set('X-Forwarded-For', '192.0.2.40')
    .send(invalidLogin)
    .expect(429);
});
