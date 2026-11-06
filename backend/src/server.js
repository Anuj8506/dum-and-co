const http = require('node:http');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { seed } = require('./services/seed');
const { attachRealtime } = require('./services/realtime');
const { checkLateOrders } = require('./services/lateOrders');
async function start() {
  await connectDB();
  if (env.seedDemo) await seed();
  const app = require('./app');
  const server = http.createServer(app);
  const wss = attachRealtime(server);
  const timer = setInterval(
    () => checkLateOrders().catch((e) => console.error('Late-order check:', e.message)),
    30000
  );
  timer.unref();
  await checkLateOrders();
  server.listen(env.port, env.production ? '0.0.0.0' : '127.0.0.1', () =>
    console.log(`Dum & Co. API: http://localhost:${env.port}`)
  );
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    clearInterval(timer);
    for (const client of wss.clients) client.terminate();
    wss.close();
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
}
start().catch(async (error) => {
  console.error('Startup failed:', error.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
