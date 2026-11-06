const { CATEGORIES } = require('../config/constants');
const vector = (item) => [
  ...CATEGORIES.map((c) => Number(c === item.category)),
  Number(item.vegetarian),
  Number(item.spice === 'Hot'),
  Number(item.spice === 'Mild'),
];
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
// Content-based recommendation: learn a taste profile from the customer's paid order history.
function recommend(items, orders) {
  const profile = Array(CATEGORIES.length + 3).fill(0);
  const counts = new Map();
  for (const order of orders)
    for (const line of order.items) {
      const item = items.find((i) => String(i._id) === String(line.menuItem));
      if (!item) continue;
      const weight = Math.log1p(line.quantity);
      vector(item).forEach((value, i) => {
        profile[i] += value * weight;
      });
      counts.set(String(item._id), (counts.get(String(item._id)) || 0) + line.quantity);
    }
  if (!counts.size) return [];
  return items
    .map((item) => {
      const features = vector(item);
      const similarity =
        dot(profile, features) / (Math.sqrt(dot(profile, profile) * dot(features, features)) || 1);
      return {
        item,
        score: similarity + 0.15 * Math.log1p(counts.get(String(item._id)) || 0),
        reason: counts.has(String(item._id))
          ? 'One of your past favourites'
          : 'Similar to dishes you enjoyed',
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
module.exports = { recommend };
