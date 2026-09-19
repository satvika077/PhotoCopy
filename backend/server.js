const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

const { shops, users, orders } = require('./data/store');

const createToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'quickprint-demo-secret',
    { expiresIn: '7d' }
  );

const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calcOrderCost = (shop, order) => {
  const copies = Number(order.numberOfCopies || 1);
  const colorMode = order.colorMode || 'BW';
  const paperSize = order.paperSize || 'A4';
  const paperType = order.paperType || 'normal';
  const binding = order.binding || 'none';
  const lamination = Boolean(order.lamination);

  const baseRate = colorMode === 'Color' ? shop.pricing.colorPerPage : shop.pricing.bwPerPage;
  let total = copies * baseRate;

  if (paperSize === 'A3') total += copies * shop.pricing.a3Surcharge;
  if (paperType === 'glossy') total += copies * shop.pricing.glossySurcharge;
  if (paperType === 'matte') total += copies * shop.pricing.matteSurcharge;

  const bindingCostMap = {
    none: 0,
    spiral: shop.pricing.spiralCost,
    comb: shop.pricing.combCost,
    staple: 15,
  };

  total += bindingCostMap[binding] || 0;

  if (lamination) total += copies * shop.pricing.laminationPerPage;

  if (order.specialRequirements && order.specialRequirements.toLowerCase().includes('urgent')) {
    total *= 1.2;
  }

  return Number(total.toFixed(2));
};

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'QuickPrint backend is running' });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role = 'customer' } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = users.find((user) => user.email === normalizedEmail && user.role === role);

  if (existingUser) {
    return res.status(409).json({ message: 'User already exists for this role.' });
  }

  const user = {
    id: `user-${Date.now()}`,
    name,
    email: normalizedEmail,
    password: bcrypt.hashSync(password, 10),
    role,
    createdAt: new Date().toISOString(),
  };

  users.push(user);

  const token = createToken(user);

  return res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, role = 'customer' } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = users.find((entry) => entry.email === normalizedEmail && entry.role === role);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const isValidPassword = bcrypt.compareSync(password, user.password);

  if (!isValidPassword) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = createToken(user);

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

app.get('/api/shops/nearby', (req, res) => {
  const latitude = Number(req.query.latitude || 28.7041);
  const longitude = Number(req.query.longitude || 77.1025);
  const radius = Number(req.query.radius || 5);

  const nearbyShops = shops
    .map((shop) => {
      const distanceKm = haversineDistanceKm(latitude, longitude, shop.latitude, shop.longitude);
      const sampleOrder = {
        numberOfCopies: 20,
        colorMode: 'BW',
        sides: 'single',
        paperSize: 'A4',
        paperType: 'normal',
        binding: 'none',
        lamination: false,
      };

      return {
        ...shop,
        distanceKm: Number(distanceKm.toFixed(2)),
        estimatedPrice: calcOrderCost(shop, sampleOrder),
      };
    })
    .filter((shop) => shop.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return res.json({ shops: nearbyShops });
});

app.get('/api/orders', (req, res) => {
  const customerId = req.query.customerId;

  if (customerId) {
    return res.json({ orders: orders.filter((order) => order.customerId === customerId) });
  }

  return res.json({ orders });
});

app.get('/api/orders/:id', (req, res) => {
  const order = orders.find((item) => item.id === req.params.id);

  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  return res.json({ order });
});

app.post('/api/orders', (req, res) => {
  const { customerId, shopId, documentName, numberOfCopies, colorMode, sides, paperSize, paperType, binding, lamination, specialRequirements } = req.body || {};

  if (!customerId || !shopId) {
    return res.status(400).json({ message: 'customerId and shopId are required.' });
  }

  const shop = shops.find((entry) => entry.id === shopId);

  if (!shop) {
    return res.status(404).json({ message: 'Shop not found.' });
  }

  const totalCost = calcOrderCost(shop, {
    numberOfCopies,
    colorMode,
    paperSize,
    paperType,
    binding,
    lamination,
    specialRequirements,
  });

  const orderId = `ORD-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const order = {
    id: orderId,
    customerId,
    shopId,
    shopName: shop.name,
    documentName: documentName || 'uploaded-document.pdf',
    numberOfCopies: Number(numberOfCopies || 1),
    colorMode: colorMode || 'BW',
    sides: sides || 'single',
    paperSize: paperSize || 'A4',
    paperType: paperType || 'normal',
    binding: binding || 'none',
    lamination: Boolean(lamination),
    specialRequirements: specialRequirements || '',
    totalCost,
    status: 'placed',
    estimatedCompletionTime: '45 mins',
    createdAt: timestamp,
    tracking: [
      { status: 'placed', message: 'Order placed successfully.', timestamp },
    ],
  };

  orders.push(order);

  return res.status(201).json({ order });
});

app.patch('/api/orders/:id/status', (req, res) => {
  const { status } = req.body || {};
  const order = orders.find((item) => item.id === req.params.id);

  if (!order) {
    return res.status(404).json({ message: 'Order not found.' });
  }

  order.status = status;
  order.tracking.push({
    status,
    message: `Order updated to ${status}.`,
    timestamp: new Date().toISOString(),
  });

  return res.json({ order });
});

app.listen(PORT, () => {
  console.log(`QuickPrint backend running on http://localhost:${PORT}`);
});
