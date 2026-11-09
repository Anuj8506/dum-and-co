const { WebSocketServer, WebSocket } = require('ws');
const env = require('../config/env');
const { activeSession } = require('../middleware/auth.middleware');
let wss;
function attachRealtime(server) {
  wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  server.on('upgrade', async (req, socket, head) => {
    if (req.url !== '/ws' || !env.origins.includes(req.headers.origin)) return socket.destroy();
    try {
      const session = await activeSession(req);
      if (!session) return socket.destroy();
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.user = session.user;
        ws.sessionKey = session.key;
        ws.sessionExpires = session.expiresAt.getTime();
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
function closeRealtimeSession(key) {
  for (const ws of wss?.clients || []) {
    if (ws.sessionKey === key) ws.close(1008, 'Session ended');
  }
}
function broadcastOrder(order, type = 'orders.changed') {
  if (!wss) return;
  const visibleToStaff = type === 'party.changed' || order.paymentStatus === 'paid';
  const outletId = String(order.outlet?._id || order.outlet);
  const userId = String(order.user?._id || order.user);
  for (const ws of wss.clients) {
    const u = ws.user;
    const allowed =
      String(u._id) === userId ||
      (visibleToStaff &&
        (u.role === 'admin' || (u.role === 'kitchen' && String(u.outlet) === outletId)));
    if (allowed && ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ type, id: order.id }));
  }
}
function broadcastMenu() {
  if (!wss) return;
  for (const ws of wss.clients)
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'menu.changed' }));
}
module.exports = { attachRealtime, broadcastOrder, broadcastMenu, closeRealtimeSession };
