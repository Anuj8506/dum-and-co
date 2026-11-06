const { COUPON } = require('../config/constants');
function unitPrice(item, portionName, addonNames, city) {
  const portion = item.portions.find((p) => p.name === portionName);
  if (!portion) throw Object.assign(new Error('Choose a valid portion.'), { status: 400 });
  if (new Set(addonNames).size !== addonNames.length)
    throw Object.assign(new Error('Duplicate add-ons are not allowed.'), { status: 400 });
  const selected = addonNames.map((name) => {
    const addon = item.addons.find((a) => a.name === name);
    if (!addon) throw Object.assign(new Error('Choose a valid add-on.'), { status: 400 });
    return addon;
  });
  const cityPrice = item.cityPrices?.get ? item.cityPrices.get(city) : item.cityPrices?.[city];
  return (
    Math.round((cityPrice ?? item.pricePaise) * portion.multiplier) +
    selected.reduce((s, a) => s + a.pricePaise, 0)
  );
}
function totals(items, coupon, points = 0) {
  const subtotalPaise = items.reduce((s, item) => s + item.unitPaise * item.quantity, 0);
  if (coupon && coupon !== COUPON.code)
    throw Object.assign(new Error('That coupon is not valid. Try DUM10.'), { status: 400 });
  const discountPaise = coupon
    ? Math.min(COUPON.maxPaise, Math.round((subtotalPaise * COUPON.percent) / 100))
    : 0;
  const redeemed = Math.min(points, Math.floor((subtotalPaise - discountPaise) / 100));
  const totalPaise = subtotalPaise - discountPaise - redeemed * 100;
  return {
    subtotalPaise,
    discountPaise,
    totalPaise,
    gstPaise: Math.round((totalPaise * 5) / 105),
    pointsRedeemed: redeemed,
  };
}
function haversine(lat1, lng1, lat2, lng2) {
  const rad = (x) => (x * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function isAvailable(item, outletId, hour) {
  const from = item.availableFrom ?? 0,
    until = item.availableUntil ?? 24;
  const timeOK = from < until ? hour >= from && hour < until : hour >= from || hour < until;
  return item.active && !item.unavailableAt.some((id) => String(id) === String(outletId)) && timeOK;
}
const indiaHour = () =>
  Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date())
  );
module.exports = { unitPrice, totals, haversine, isAvailable, indiaHour };
