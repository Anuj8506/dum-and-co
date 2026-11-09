const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const crypto = require('node:crypto');
const http = require('node:http');
const { once } = require('node:events');
const { WebSocket } = require('ws');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
process.env.CLIENT_URL = 'http://localhost:5000';
process.env.SEED_DEMO = 'true';
process.env.TRUST_PROXY = '';

const env = require('../src/config/env');
const { seed } = require('../src/services/seed');
const User = require('../src/models/User');
const MenuItem = require('../src/models/MenuItem');
const Outlet = require('../src/models/Outlet');
const Order = require('../src/models/Order');
const { model, predictPrep } = require('../src/algorithms/prepTime');
const { totals, isAvailable } = require('../src/services/pricing');
const { attachRealtime } = require('../src/services/realtime');
const { checkLateOrders } = require('../src/services/lateOrders');
const app = require('../src/app');
let db, server, wss, customer, kitchen, admin, otherKitchen, item, outlet, lastOrder;
const login = async (email) => {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'DumCoDemo2026!' }).expect(200);
  return agent;
};
const demoCookie = async (email) => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'DumCoDemo2026!' })
    .expect(200);
  return response.headers['set-cookie'][0].split(';')[0];
};
const connectSocket = (cookie) =>
  new WebSocket(`ws://127.0.0.1:${server.address().port}/ws`, {
    headers: { Origin: 'http://localhost:5000', Cookie: cookie },
    handshakeTimeout: 3000,
  });
const cart = (extras) => ({
  outlet: String(outlet._id),
  idempotencyKey: crypto.randomUUID(),
  items: [{ menuItem: String(item._id), portion: 'Regular', addons: [], quantity: 2 }],
  coupon: '',
  fulfilment: 'pickup',
  ...extras,
});
before(async () => {
  db = await MongoMemoryReplSet.create({
    binary: { version: '7.0.24' },
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  await mongoose.connect(db.getUri('dumco_test'));
  await seed();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  customer = await login('guest@dumco.example');
  kitchen = await login('kitchen@dumco.example');
  admin = await login('admin@dumco.example');
  otherKitchen = await login('gachibowli@dumco.example');
  item = await MenuItem.findOne({ name: 'Chicken dum biryani' });
  outlet = await Outlet.findOne({ name: 'Kondapur' });
  server = http.createServer(app);
  wss = attachRealtime(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
});
after(async () => {
  for (const client of wss?.clients || []) client.terminate();
  wss?.close();
  await new Promise((resolve) => server?.close(resolve));
  await mongoose.disconnect();
  await db?.stop();
});
test('model is fitted on separate training/validation fixtures; minimum and fallback enforced', () => {
  assert.equal(model.trainRows, 384);
  assert.equal(model.validationRows, 96);
  assert.ok(model.validationMae < 4);
  const base = {
    longestPrep: 10,
    queueUnits: 0,
    portions: 1,
    capacity: 4,
    minimumMinutes: 30,
    hour: 13,
  };
  assert.ok(predictPrep(base).minutes >= 30);
  const loaded = predictPrep({ ...base, queueUnits: 200 });
  assert.equal(loaded.confidence, 'low');
  assert.equal(loaded.source, 'conservative-fallback');
  assert.ok(loaded.minutes > predictPrep(base).minutes);
});
test('money uses integer paise, inclusive tax and capped coupons', () => {
  const p = totals([{ unitPaise: 100000, quantity: 2 }], 'DUM10', 40);
  assert.equal(p.discountPaise, 10000);
  assert.equal(p.totalPaise, 186000);
  assert.equal(p.gstPaise, 8857);
});
test('overnight menus and outlet pauses are enforced', () => {
  const a = { active: true, unavailableAt: [], availableFrom: 19, availableUntil: 2 };
  assert.equal(isAvailable(a, 'x', 23), true);
  assert.equal(isAvailable(a, 'x', 1), true);
  assert.equal(isAvailable(a, 'x', 12), false);
  assert.equal(isAvailable({ ...a, unavailableAt: ['x'] }, 'x', 23), false);
});
test('anonymous and customer accounts cannot enter staff APIs', async () => {
  await request(app).get('/api/orders').expect(401);
  await customer.get('/api/admin/dashboard').expect(403);
  await customer.get('/api/menu/admin').expect(403);
});
test('cookie is HttpOnly; passwords and JWT are absent from response', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'guest@dumco.example', password: 'DumCoDemo2026!' })
    .expect(200);
  assert.match(response.headers['set-cookie'][0], /HttpOnly/);
  assert.match(response.headers['set-cookie'][0], /SameSite=Lax/);
  assert.equal(response.body.user.password, undefined);
  assert.equal(response.body.token, undefined);
});
test('registration cannot self-grant a staff role and requires consent', async () => {
  await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test Guest',
      email: 'test@demo.example',
      password: 'LongDemoPassword!',
      role: 'admin',
      consent: true,
    })
    .expect(201);
  assert.equal((await User.findOne({ email: 'test@demo.example' })).role, 'customer');
  await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Other Guest',
      email: 'other@demo.example',
      password: 'LongDemoPassword!',
      consent: false,
    })
    .expect(400);
});

test('sign-out revokes a copied cookie and closes its WebSocket without affecting another session', async (t) => {
  const cookie = await demoCookie('guest@dumco.example');
  const otherCookie = await demoCookie('guest@dumco.example');
  assert.notEqual(cookie, otherCookie);
  const ws = connectSocket(cookie);
  t.after(() => ws.terminate());
  await once(ws, 'message');
  const closed = once(ws, 'close');
  await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(200);
  assert.equal((await closed)[0], 1008);
  await request(app).get('/api/auth/me').set('Cookie', cookie).expect(401);
  await request(app).get('/api/auth/me').set('Cookie', otherCookie).expect(200);
  const replay = connectSocket(cookie);
  t.after(() => replay.terminate());
  await assert.rejects(once(replay, 'open'));
});

test('disabling demo mode blocks persisted demo credentials and cookies', async (t) => {
  const cookie = await demoCookie('admin@dumco.example');
  const previous = env.seedDemo;
  env.seedDemo = false;
  try {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@dumco.example', password: 'DumCoDemo2026!' })
      .expect(401);
    await request(app).get('/api/admin/dashboard').set('Cookie', cookie).expect(401);
    const replay = connectSocket(cookie);
    t.after(() => replay.terminate());
    await assert.rejects(once(replay, 'open'));
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Reserved namespace fixture',
        email: 'unseeded@dumco.example',
        password: 'LongDemoPassword!',
        consent: true,
      })
      .expect(400);
  } finally {
    env.seedDemo = previous;
  }
});

test('bcrypt input limits use UTF-8 bytes and reject overlong suffixes', async () => {
  const password = 'é'.repeat(36);
  const signup = { name: 'Unicode fixture', email: 'bytes@demo.example', consent: true };
  await request(app)
    .post('/api/auth/register')
    .send({ ...signup, password: password + 'x' })
    .expect(400);
  await request(app)
    .post('/api/auth/register')
    .send({ ...signup, password })
    .expect(201);
  await request(app).post('/api/auth/login').send({ email: signup.email, password }).expect(200);
  await request(app)
    .post('/api/auth/login')
    .send({ email: signup.email, password: password + 'y' })
    .expect(400);
});

test('malformed JSON errors do not echo the request body', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('invalid-audit-marker')
    .expect(400);
  assert.deepEqual(response.body, { message: 'Request body is not valid JSON.' });
  assert.equal(response.headers['cache-control'], 'no-store');
});
test('rejects query injection, invalid quantities, invalid IDs and hostile origins', async () => {
  await request(app)
    .post('/api/auth/login')
    .send({ email: { $ne: null }, password: 'x' })
    .expect(400);
  const body = cart();
  body.items[0].quantity = -1;
  await customer.post('/api/orders').send(body).expect(400);
  await customer.get('/api/orders/not-an-id').expect(400);
  await customer.post('/api/orders').set('Origin', 'https://evil.example').send(cart()).expect(403);
});
test('server ignores submitted prices and computes trusted cart total', async () => {
  const body = cart({ totalPaise: 1 });
  body.items[0].unitPaise = 1;
  const response = await customer.post('/api/orders').send(body).expect(201);
  lastOrder = response.body.order;
  assert.equal(lastOrder.totalPaise, item.pricePaise * 2);
  assert.equal(lastOrder.paymentStatus, 'pending');
  assert.ok(lastOrder.estimate.minutes >= outlet.minimumMinutes);
});
test('checkout retries return the same order; changed cart cannot reuse key', async () => {
  const body = cart();
  const a = await customer.post('/api/orders').send(body).expect(201);
  const b = await customer.post('/api/orders').send(body).expect(200);
  assert.equal(a.body.order._id, b.body.order._id);
  body.items[0].quantity = 3;
  await customer.post('/api/orders').send(body).expect(409);
});
test('kitchens cannot see unpaid orders belonging to another outlet', async () => {
  await otherKitchen.get(`/api/orders/${lastOrder._id}`).expect(404);
  const response = await otherKitchen.get('/api/orders').expect(200);
  assert.ok(response.body.orders.every((o) => o.outlet._id !== String(outlet._id)));
});

test('staff only see a customer checkout after payment and failed retries are recorded once', async (t) => {
  const ws = connectSocket(await demoCookie('kitchen@dumco.example'));
  t.after(() => ws.terminate());
  await once(ws, 'message');
  const { body } = await customer
    .post('/api/orders')
    .send(
      cart({
        fulfilment: 'delivery',
        deliveryAddress: 'Synthetic audit address',
        location: { lat: outlet.lat, lng: outlet.lng },
      })
    )
    .expect(201);
  const id = body.order._id;
  await customer.get(`/api/orders/${id}`).expect(200);
  for (const staff of [kitchen, admin]) {
    await staff.get(`/api/orders/${id}`).expect(404);
    const history = await staff.get('/api/orders').expect(200);
    assert.ok(history.body.orders.every((order) => order._id !== id));
  }
  const firstMessage = once(ws, 'message');
  for (let attempt = 0; attempt < 3; attempt++) {
    const failure = await customer
      .post(`/api/orders/${id}/payment`)
      .send({ outcome: 'failed', method: 'UPI' })
      .expect(200);
    assert.equal(
      failure.body.order.events.filter((e) => e.message.includes('payment failed')).length,
      1
    );
  }
  await kitchen.patch(`/api/menu/${item._id}/availability`).send({ available: true }).expect(200);
  assert.equal(JSON.parse((await firstMessage)[0]).type, 'menu.changed');
  const paymentMessage = once(ws, 'message');
  await customer
    .post(`/api/orders/${id}/payment`)
    .send({ outcome: 'success', method: 'UPI' })
    .expect(200);
  assert.deepEqual(JSON.parse((await paymentMessage)[0]), { type: 'orders.changed', id });
  await kitchen.get(`/api/orders/${id}`).expect(200);
  await otherKitchen.get(`/api/orders/${id}`).expect(404);
});

test('splitting an identical dish across cart lines cannot bypass the quantity cap', async () => {
  const body = cart();
  const line = { ...body.items[0], addons: item.addons.map((addon) => addon.name), quantity: 11 };
  const duplicate = { ...line, addons: [...line.addons].reverse(), quantity: 10 };
  await customer
    .post('/api/orders')
    .send({ ...body, items: [line, duplicate] })
    .expect(400);
  await customer
    .post('/api/orders')
    .send({ ...body, items: [{ ...line, quantity: 10 }, duplicate] })
    .expect(201);
});
test('payment decline is retryable; repeated successful payment does not redeem twice', async () => {
  const before = (await User.findOne({ email: 'guest@dumco.example' })).points;
  const { body } = await customer
    .post('/api/orders')
    .send(cart({ redeemPoints: true }))
    .expect(201);
  const id = body.order._id;
  await customer
    .post(`/api/orders/${id}/payment`)
    .send({ outcome: 'failed', method: 'Card' })
    .expect(200);
  assert.equal((await Order.findById(id)).paymentStatus, 'failed');
  await customer
    .post(`/api/orders/${id}/payment`)
    .send({ outcome: 'success', method: 'UPI' })
    .expect(200);
  await customer
    .post(`/api/orders/${id}/payment`)
    .send({ outcome: 'success', method: 'UPI' })
    .expect(200);
  assert.equal(
    (await User.findOne({ email: 'guest@dumco.example' })).points,
    before - body.order.pointsRedeemed
  );
  lastOrder = (await customer.get(`/api/orders/${id}`)).body.order;
});
test('order stages cannot be skipped; handoff rewards are credited once', async () => {
  const id = lastOrder._id;
  await kitchen.patch(`/api/orders/${id}`).send({ status: 'ready' }).expect(409);
  await kitchen.patch(`/api/orders/${id}`).send({ status: 'preparing' }).expect(200);
  await kitchen.patch(`/api/orders/${id}`).send({ status: 'ready' }).expect(200);
  const before = (await User.findOne({ email: 'guest@dumco.example' })).points;
  await kitchen.patch(`/api/orders/${id}`).send({ status: 'handed_off' }).expect(200);
  await kitchen.patch(`/api/orders/${id}`).send({ status: 'handed_off' }).expect(200);
  const order = await Order.findById(id);
  assert.equal(
    (await User.findOne({ email: 'guest@dumco.example' })).points,
    before + order.pointsEarned
  );
});
test('pausing an item invalidates an unpaid checkout before money/rewards change', async () => {
  const { body } = await customer.post('/api/orders').send(cart()).expect(201);
  await kitchen.patch(`/api/menu/${item._id}/availability`).send({ available: false }).expect(200);
  await customer
    .post(`/api/orders/${body.order._id}/payment`)
    .send({ outcome: 'success', method: 'UPI' })
    .expect(409);
  await customer.post('/api/orders').send(cart()).expect(409);
  await kitchen.patch(`/api/menu/${item._id}/availability`).send({ available: true }).expect(200);
});
test('delivery radius, coupon rules and maximum party notice are checked server-side', async () => {
  await customer
    .post('/api/orders')
    .send(
      cart({
        fulfilment: 'delivery',
        deliveryAddress: 'Fictional demo address',
        location: { lat: 28.6, lng: 77.2 },
      })
    )
    .expect(400);
  await customer
    .post('/api/orders')
    .send(cart({ coupon: 'FREEFOOD' }))
    .expect(400);
  await customer
    .post('/api/admin/party')
    .send({
      outlet: String(outlet._id),
      guests: 20,
      date: new Date(Date.now() + 3600000).toISOString(),
      notes: 'A demo celebration',
    })
    .expect(400);
});
test('promise override enforces outlet floor and records customer-visible reason', async () => {
  const { body } = await customer.post('/api/orders').send(cart()).expect(201);
  const id = body.order._id;
  await customer
    .post(`/api/orders/${id}/payment`)
    .send({ outcome: 'success', method: 'UPI' })
    .expect(200);
  const response = await kitchen
    .patch(`/api/orders/${id}`)
    .send({ overrideMinutes: 1, reason: 'Fresh batch taking longer' })
    .expect(200);
  assert.ok(new Date(response.body.order.promisedAt).getTime() >= Date.now() + 24 * 60000);
  assert.match(response.body.order.events.at(-1).message, /Fresh batch/);
});
test('late alert is created once and visible to customer', async () => {
  const { body } = await customer.post('/api/orders').send(cart()).expect(201);
  const id = body.order._id;
  await customer
    .post(`/api/orders/${id}/payment`)
    .send({ outcome: 'success', method: 'UPI' })
    .expect(200);
  await Order.updateOne({ _id: id }, { promisedAt: new Date(Date.now() - 11 * 60000) });
  await checkLateOrders();
  await checkLateOrders();
  const order = await Order.findById(id);
  assert.ok(order.lateNotifiedAt);
  assert.equal(order.events.filter((e) => e.message.includes('taking longer')).length, 1);
});
test('authenticated WebSocket sends scoped updates and rejects anonymous clients', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'kitchen@dumco.example', password: 'DumCoDemo2026!' });
  const cookie = response.headers['set-cookie'][0].split(';')[0];
  const ws = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws`, {
    headers: { Origin: 'http://localhost:5000', Cookie: cookie },
  });
  const greeting = await once(ws, 'message');
  assert.equal(JSON.parse(greeting[0]).type, 'connected');
  const received = once(ws, 'message');
  const { body } = await customer.post('/api/orders').send(cart()).expect(201);
  await customer
    .post(`/api/orders/${body.order._id}/payment`)
    .send({ outcome: 'success', method: 'UPI' })
    .expect(200);
  const event = JSON.parse((await received)[0]);
  assert.equal(event.type, 'orders.changed');
  assert.equal(event.id, body.order._id);
  assert.equal(event.items, undefined);
  ws.close();
  const anonymous = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws`, {
    headers: { Origin: 'http://localhost:5000' },
  });
  const rejected = new Promise((resolve) => anonymous.on('error', () => resolve(true)));
  assert.equal(await rejected, true);
});

test('simultaneous payment retries confirm once and redeem rewards once', async () => {
  await User.updateOne({ email: 'guest@dumco.example' }, { points: 80 });
  const { body } = await customer
    .post('/api/orders')
    .send(cart({ redeemPoints: true }))
    .expect(201);
  const id = body.order._id;
  const results = await Promise.all(
    [1, 2].map(() =>
      customer.post(`/api/orders/${id}/payment`).send({ outcome: 'success', method: 'UPI' })
    )
  );
  assert.deepEqual(
    results.map((r) => r.status),
    [200, 200]
  );
  const order = await Order.findById(id);
  assert.equal(order.events.filter((e) => e.status === 'confirmed').length, 1);
  assert.equal((await User.findOne({ email: 'guest@dumco.example' })).points, 0);
});

test('another customer cannot read or pay for an order by guessing its ID', async () => {
  const second = request.agent(app);
  await second
    .post('/api/auth/login')
    .send({ email: 'test@demo.example', password: 'LongDemoPassword!' })
    .expect(200);
  await second.get(`/api/orders/${lastOrder._id}`).expect(404);
  await second
    .post(`/api/orders/${lastOrder._id}/payment`)
    .send({ outcome: 'success', method: 'Card' })
    .expect(404);
});

test('recommendations use the customer history and exclude unavailable items', async () => {
  const { body } = await customer
    .get('/api/menu/recommendations')
    .query({ outlet: String(outlet._id) })
    .expect(200);
  assert.ok(body.suggestions.length > 0 && body.suggestions.length <= 3);
  const paused = body.suggestions[0].id;
  await kitchen.patch(`/api/menu/${paused}/availability`).send({ available: false }).expect(200);
  const refreshed = await customer
    .get('/api/menu/recommendations')
    .query({ outlet: String(outlet._id) })
    .expect(200);
  assert.equal(
    refreshed.body.suggestions.some((s) => s.id === paused),
    false
  );
  await kitchen.patch(`/api/menu/${paused}/availability`).send({ available: true }).expect(200);
});

test('menu editing is manager-only and validates prices and inclusive hours', async () => {
  const payload = {
    name: 'Test dish',
    description: 'Synthetic test dish',
    category: 'Biryani',
    image: '/images/veg.jpg',
    vegetarian: true,
    spice: 'Mild',
    allergens: [],
    pricePaise: 22000,
    prepMinutes: 15,
    portions: [{ name: 'Regular', multiplier: 1 }],
    addons: [],
    active: true,
    availableFrom: 0,
    availableUntil: 24,
  };
  await kitchen.post('/api/menu').send(payload).expect(403);
  const created = await admin.post('/api/menu').send(payload).expect(200);
  await admin
    .put(`/api/menu/${created.body.item._id}`)
    .send({ ...payload, pricePaise: 24000 })
    .expect(200);
  await admin
    .put(`/api/menu/${created.body.item._id}`)
    .send({ ...payload, pricePaise: -1 })
    .expect(400);
  await admin
    .put(`/api/menu/${created.body.item._id}`)
    .send({ ...payload, availableFrom: 20, availableUntil: 20 })
    .expect(400);
});
