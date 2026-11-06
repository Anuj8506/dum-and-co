const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const production = process.env.NODE_ENV === 'production';
const localDir = path.resolve(__dirname, '../../.local');
let secret = process.env.JWT_SECRET;
if (!secret && !production) {
  fs.mkdirSync(localDir, { recursive: true });
  const file = path.join(localDir, 'jwt-secret');
  if (!fs.existsSync(file))
    fs.writeFileSync(file, crypto.randomBytes(48).toString('hex'), { mode: 0o600 });
  secret = fs.readFileSync(file, 'utf8').trim();
}
if (!secret || secret.length < 32)
  throw new Error('JWT_SECRET must contain at least 32 characters.');
module.exports = {
  production,
  secret,
  localDir,
  port: Number(process.env.PORT || 5000),
  origins: (
    process.env.CLIENT_URL ||
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5000,http://127.0.0.1:5000'
  )
    .split(',')
    .map((s) => s.trim()),
  seedDemo: process.env.SEED_DEMO === 'true' || (!production && process.env.SEED_DEMO !== 'false'),
};
