// A small, inspectable supervised model. The fixtures are synthetic, NOT real kitchen observations.
// Features: intercept, longest item prep, queue load per station, portions, peak dinner period.
function random(seed = 20261106) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function fixtures() {
  const r = random();
  return Array.from({ length: 480 }, () => {
    const x = [1, 8 + r() * 25, r() * 20, 1 + Math.floor(r() * 12), r() > 0.55 ? 1 : 0];
    const y = 4 + 0.8 * x[1] + 1.5 * x[2] + 0.65 * x[3] + 4 * x[4] + (r() - 0.5) * 7;
    return { x, y };
  });
}
function fit(rows) {
  const n = rows[0].x.length;
  const a = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) =>
      j === n
        ? rows.reduce((s, row) => s + row.x[i] * row.y, 0)
        : rows.reduce((s, row) => s + row.x[i] * row.x[j], 0) + (i === j && i !== 0 ? 0.01 : 0)
    )
  );
  for (let i = 0; i < n; i++) {
    let pivot = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(a[k][i]) > Math.abs(a[pivot][i])) pivot = k;
    [a[i], a[pivot]] = [a[pivot], a[i]];
    const divisor = a[i][i];
    if (Math.abs(divisor) < 1e-10) throw new Error('Training matrix is singular');
    for (let j = i; j <= n; j++) a[i][j] /= divisor;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = a[k][i];
      for (let j = i; j <= n; j++) a[k][j] -= factor * a[i][j];
    }
  }
  return a.map((row) => row[n]);
}
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const data = fixtures();
const weights = fit(data.slice(0, 384));
const mae = data.slice(384).reduce((s, row) => s + Math.abs(dot(weights, row.x) - row.y), 0) / 96;
const model = {
  version: 'ridge-synthetic-v1',
  weights,
  trainRows: 384,
  validationRows: 96,
  validationMae: Number(mae.toFixed(2)),
  dataSource: 'Deterministic synthetic fixtures; not a production accuracy claim',
};

function predictPrep({ longestPrep, queueUnits, portions, capacity, minimumMinutes, hour }) {
  const load = queueUnits / Math.max(1, capacity);
  const peak = hour >= 19 && hour <= 22 ? 1 : 0;
  const raw = dot(weights, [1, longestPrep, load, portions, peak]);
  const uncertain =
    load > 20 || portions > 12 || longestPrep < 8 || longestPrep > 33 || !Number.isFinite(raw);
  const fallback = longestPrep + load * 2 + portions;
  // Low confidence gets a conservative rule estimate and human review, never a fabricated confident answer.
  const minutes = Math.ceil(
    Math.max(minimumMinutes, uncertain ? Math.max(fallback, raw || 0) : raw + mae * 2)
  );
  return {
    minutes,
    rawMinutes: Math.round(raw),
    confidence: uncertain ? 'low' : 'medium',
    source: uncertain ? 'conservative-fallback' : 'trained-regression',
    modelVersion: model.version,
    validationMae: model.validationMae,
  };
}
module.exports = { predictPrep, model, fixtures, fit };
