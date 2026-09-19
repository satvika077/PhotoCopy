const shops = [
  {
    id: 'shop-1',
    name: 'PrintCart Express',
    address: 'Connaught Place, New Delhi',
    latitude: 28.6328,
    longitude: 77.2167,
    phone: '+91 98765 43210',
    openingTime: '09:00',
    closingTime: '21:00',
    rating: 4.8,
    pricing: {
      bwPerPage: 2,
      colorPerPage: 8,
      a3Surcharge: 3,
      glossySurcharge: 4,
      matteSurcharge: 3,
      spiralCost: 35,
      combCost: 25,
      laminationPerPage: 2,
    },
  },
  {
    id: 'shop-2',
    name: 'Quick Print Hub',
    address: 'Dwarka Sector 12, New Delhi',
    latitude: 28.5955,
    longitude: 77.0211,
    phone: '+91 98990 11122',
    openingTime: '08:30',
    closingTime: '20:30',
    rating: 4.5,
    pricing: {
      bwPerPage: 1.5,
      colorPerPage: 7,
      a3Surcharge: 2.5,
      glossySurcharge: 3,
      matteSurcharge: 2.5,
      spiralCost: 30,
      combCost: 20,
      laminationPerPage: 1.5,
    },
  },
  {
    id: 'shop-3',
    name: 'Paperlane Center',
    address: 'Saket, New Delhi',
    latitude: 28.5202,
    longitude: 77.2057,
    phone: '+91 98111 33445',
    openingTime: '10:00',
    closingTime: '22:00',
    rating: 4.7,
    pricing: {
      bwPerPage: 2.2,
      colorPerPage: 8.5,
      a3Surcharge: 3.2,
      glossySurcharge: 4.2,
      matteSurcharge: 3.4,
      spiralCost: 40,
      combCost: 25,
      laminationPerPage: 2.2,
    },
  },
];

const users = [
  {
    id: 'user-demo',
    name: 'Demo User',
    email: 'demo@quickprint.app',
    password: '$2a$10$UQXr6a8tOhNOqP0aWZrJ5.7F7p5R1XwP7/6Q7T8kMf6qaHYk8IhGm',
    role: 'customer',
  },
];

const orders = [];

module.exports = { shops, users, orders };
