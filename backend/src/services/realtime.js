const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const { readToken } = require('../middleware/auth.middleware');
let wss;
function attachRealtime(server) {
  wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  server.on('upgrade', async (req, socket, head) => {
    if (req.url !== '/ws' || !env.origins.includes(req.headers.origin)) return socket.destroy();
    try {
      const payload = jwt.verify(readToken(req) || '', env.secret, {
        algorithms: ['HS256'],
        issuer: 'dumco',
      });
      const user = await User.findById(payload.id);
      if (!user) return socket.destroy();
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.user = user;
        ws.sessionExpires = payload.exp * 1000;
        ws.alive = true;
        ws.on('pong', () => {
          ws.alive = true;
        });
        ws.on('error', () => ws.terminate());
        ws.send(JSON.stringify({ type: 'connected' }));
      });
    } catch {
      socket.destroy();
    }
  });
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.alive || Date.now() > ws.sessionExpires) {
        ws.terminate();
        continue;
      }
      ws.alive = false;
      ws.ping();
    }
  }, 25000);
  heartbeat.unref();
  wss.on('close', () => clearInterval(heartbeat));
  return wss;
}
function broadcastOrder(order, type = 'orders.changed') {
  if (!wss) return;
  for (const ws of wss.clients) {
    const u = ws.user;
    const allowed =
      u.role === 'admin' ||
      (u.role === 'kitchen' && String(u.outlet) === String(order.outlet?._id || order.outlet)) ||
      String(u._id) === String(order.user?._id || order.user);
    if (allowed && ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ type, id: order.id }));
  }
}
function broadcastMenu() {
  if (!wss) return;
  for (const ws of wss.clients)
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'menu.changed' }));
}
module.exports = { attachRealtime, broadcastOrder, broadcastMenu };
