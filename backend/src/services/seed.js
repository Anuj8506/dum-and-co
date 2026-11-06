const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Outlet = require('../models/Outlet');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');

async function seed() {
  // Idempotent, additive seed. Never resets existing accounts, stock, menu edits or orders.
  if ((await Outlet.countDocuments()) > 0) return;
  const outlets = await Outlet.create([
    {
      name: 'Kondapur',
      city: 'Hyderabad',
      address: 'Botanical Garden Road, Kondapur',
      fssai: 'DEMO-LICENCE-001',
      lat: 17.4622,
      lng: 78.3568,
      radiusKm: 6,
      minimumMinutes: 25,
      capacity: 4,
    },
    {
      name: 'Gachibowli cloud kitchen',
      city: 'Hyderabad',
      address: 'DLF Road, Gachibowli',
      fssai: 'DEMO-LICENCE-002',
      lat: 17.4401,
      lng: 78.3489,
      radiusKm: 5,
      minimumMinutes: 20,
      capacity: 3,
    },
    {
      name: 'Kukatpally',
      city: 'Hyderabad',
      address: 'KPHB Road, Kukatpally',
      fssai: 'DEMO-LICENCE-003',
      lat: 17.4948,
      lng: 78.3996,
      radiusKm: 6,
      minimumMinutes: 30,
      capacity: 4,
    },
  ]);
  const common = {
    active: true,
    availableFrom: 0,
    availableUntil: 24,
    cityPrices: {},
    unavailableAt: [],
    portions: [{ name: 'Regular', multiplier: 1 }],
    addons: [],
  };
  const items = await MenuItem.create([
    {
      ...common,
      name: 'Chicken dum biryani',
      description:
        'Aged basmati, tender chicken and our signature 12-spice blend. Sealed and slow-cooked, the Hyderabadi way.',
      category: 'Biryani',
      image: '/images/biryani.jpg',
      vegetarian: false,
      spice: 'Medium',
      allergens: ['Milk'],
      badge: 'House favourite',
      prepMinutes: 25,
      pricePaise: 32000,
      portions: [
        { name: 'Regular', multiplier: 1 },
        { name: 'Family pack', multiplier: 2.5 },
      ],
      addons: [
        { name: 'Extra raita', pricePaise: 3000 },
        { name: 'Boiled egg', pricePaise: 2500 },
      ],
    },
    {
      ...common,
      name: 'Mutton dum biryani',
      description:
        'Fall-apart mutton, fragrant long-grain rice and saffron. A little patience, a lot of flavour.',
      category: 'Biryani',
      image: '/images/mutton.jpg',
      vegetarian: false,
      spice: 'Hot',
      allergens: ['Milk'],
      badge: 'Slow-cooked',
      prepMinutes: 30,
      pricePaise: 42000,
      portions: [
        { name: 'Regular', multiplier: 1 },
        { name: 'Family pack', multiplier: 2.4 },
      ],
      addons: [{ name: 'Extra raita', pricePaise: 3000 }],
    },
    {
      ...common,
      name: 'Vegetable dum biryani',
      description:
        'Seasonal vegetables, mint and golden basmati, layered with care and cooked on dum.',
      category: 'Biryani',
      image: '/images/veg.jpg',
      vegetarian: true,
      spice: 'Medium',
      allergens: ['Milk', 'Nuts'],
      badge: 'Vegetarian favourite',
      prepMinutes: 20,
      pricePaise: 27000,
      portions: [
        { name: 'Regular', multiplier: 1 },
        { name: 'Family pack', multiplier: 2.4 },
      ],
      addons: [{ name: 'Extra raita', pricePaise: 3000 }],
    },
    {
      ...common,
      name: 'Chicken 65',
      description:
        'Crisp chicken tossed with curry leaves, green chilli and a proper punch of spice.',
      category: 'Starters',
      image: '/images/chicken.jpg',
      vegetarian: false,
      spice: 'Hot',
      allergens: ['Egg', 'Wheat'],
      badge: 'A good beginning',
      prepMinutes: 18,
      pricePaise: 29000,
    },
    {
      ...common,
      name: 'Paneer tikka',
      description:
        'Soft paneer, smoky edges and a spiced yoghurt marinade. Straight from the tandoor.',
      category: 'Starters',
      image: '/images/paneer.jpg',
      vegetarian: true,
      spice: 'Medium',
      allergens: ['Milk'],
      prepMinutes: 18,
      pricePaise: 26000,
    },
    {
      ...common,
      name: 'Mirchi ka salan',
      description:
        'Hyderabad’s classic green chilli curry, with roasted peanuts, sesame and a tangy finish.',
      category: 'Curries & sides',
      image: '/images/curry.jpg',
      vegetarian: true,
      spice: 'Hot',
      allergens: ['Peanuts', 'Sesame'],
      prepMinutes: 10,
      pricePaise: 10000,
    },
    {
      ...common,
      name: 'Mutton haleem',
      description:
        'Slow-stirred mutton and wheat, finished with fried onions and a squeeze of lime.',
      category: 'Curries & sides',
      image: '/images/curry.jpg',
      vegetarian: false,
      spice: 'Medium',
      allergens: ['Wheat', 'Milk'],
      badge: 'Hyderabad special',
      prepMinutes: 25,
      pricePaise: 35000,
    },
    {
      ...common,
      name: 'Double ka meetha',
      description: 'Golden bread, warm milk and cardamom. A little sweetness to linger over.',
      category: 'Desserts',
      image: '/images/dessert.jpg',
      vegetarian: true,
      spice: 'Mild',
      allergens: ['Milk', 'Wheat', 'Nuts'],
      prepMinutes: 8,
      pricePaise: 19000,
    },
    {
      ...common,
      name: 'Gulab jamun',
      description:
        'Two soft, warm dumplings in rose-scented syrup. Some classics need no introduction.',
      category: 'Desserts',
      image: '/images/dessert.jpg',
      vegetarian: true,
      spice: 'Mild',
      allergens: ['Milk', 'Wheat'],
      prepMinutes: 8,
      pricePaise: 12000,
    },
    {
      ...common,
      name: 'Rose lassi',
      description: 'Cool, creamy yoghurt with a delicate touch of rose. Made fresh for your order.',
      category: 'Drinks',
      image: '/images/lassi.jpg',
      vegetarian: true,
      spice: 'Mild',
      allergens: ['Milk'],
      prepMinutes: 5,
      pricePaise: 11000,
    },
  ]);
  const password = await bcrypt.hash('DumCoDemo2026!', 12);
  const users = await User.create([
    {
      name: 'Demo Guest',
      email: 'guest@dumco.example',
      password,
      role: 'customer',
      points: 50,
      consentAt: new Date(),
    },
    {
      name: 'Kondapur Kitchen',
      email: 'kitchen@dumco.example',
      password,
      role: 'kitchen',
      outlet: outlets[0]._id,
      consentAt: new Date(),
    },
    {
      name: 'Gachibowli Kitchen',
      email: 'gachibowli@dumco.example',
      password,
      role: 'kitchen',
      outlet: outlets[1]._id,
      consentAt: new Date(),
    },
    {
      name: 'Menu Manager',
      email: 'admin@dumco.example',
      password,
      role: 'admin',
      consentAt: new Date(),
    },
  ]);
  const now = Date.now();
  const demos = [
    {
      number: 'WEB-778120',
      outlet: 0,
      lines: [
        [0, 1, 'Family pack', 80000],
        [7, 2, 'Regular', 19000],
      ],
      total: 118000,
      age: 14,
      promise: 31,
      status: 'preparing',
    },
    {
      number: 'WEB-778131',
      outlet: 1,
      lines: [
        [2, 2, 'Regular', 27000],
        [5, 1, 'Regular', 10000],
      ],
      total: 64000,
      age: 7,
      promise: 33,
      status: 'ready',
    },
    {
      number: 'WEB-778146',
      outlet: 2,
      lines: [[6, 3, 'Regular', 35000]],
      total: 105000,
      age: 54,
      promise: -4,
      status: 'preparing',
    },
    {
      number: 'DUM-DEMO24',
      outlet: 0,
      lines: [[1, 2, 'Regular', 42000]],
      total: 84000,
      age: 51,
      promise: -11,
      status: 'preparing',
    },
    {
      number: 'DUM-DEMO25',
      outlet: 0,
      lines: [
        [3, 1, 'Regular', 29000],
        [9, 1, 'Regular', 11000],
      ],
      total: 40000,
      age: 2,
      promise: 25,
      status: 'confirmed',
    },
  ];
  for (const [index, demo] of demos.entries()) {
    const createdAt = new Date(now - demo.age * 60000);
    const promisedAt = new Date(now + demo.promise * 60000);
    await Order.create({
      number: demo.number,
      user: users[0]._id,
      outlet: outlets[demo.outlet]._id,
      idempotencyKey: `seed-${index}`,
      requestHash: 'seed',
      items: demo.lines.map(([i, quantity, portion, unitPaise]) => ({
        menuItem: items[i]._id,
        name: items[i].name,
        portion,
        quantity,
        unitPaise,
        addons: [],
        prepMinutes: items[i].prepMinutes,
      })),
      subtotalPaise: demo.total,
      totalPaise: demo.total,
      discountPaise: 0,
      gstPaise: Math.round((demo.total * 5) / 105),
      status: demo.status,
      paymentStatus: 'paid',
      paymentMethod: index % 2 ? 'Card' : 'UPI',
      fulfilment: 'pickup',
      promisedAt,
      originalPromisedAt: promisedAt,
      estimate: {
        minutes: demo.age + demo.promise,
        rawMinutes: demo.age + demo.promise,
        confidence: 'medium',
        source: 'sample-fixture',
        modelVersion: 'seed',
      },
      createdAt,
      events: [
        { status: 'confirmed', message: 'Seeded sample order; no real payment.', at: createdAt },
        ...(demo.status !== 'confirmed'
          ? [
              {
                status: 'preparing',
                message: 'Kitchen started preparing.',
                at: new Date(createdAt.getTime() + 60000),
              },
            ]
          : []),
        ...(demo.status === 'ready'
          ? [{ status: 'ready', message: 'Ready for pickup.', at: new Date(now - 60000) }]
          : []),
      ],
    });
  }
  console.log('Seeded synthetic outlets, menu, accounts and sample orders.');
}
module.exports = { seed };
