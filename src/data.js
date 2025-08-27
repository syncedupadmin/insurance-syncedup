// Temporary in-memory storage - we'll replace with database later
let products = [
  {
    id: '1',
    name: 'PPO Plan 500',
    carrier: 'FirstEnroll',
    states: ['TX', 'FL', 'CA'],
    premium: 150.00,
    commissionRate: 30.00
  },
  {
    id: '2', 
    name: 'HMO Plan 1000',
    carrier: 'GoodHealth',
    states: ['TX', 'FL'],
    premium: 120.00,
    commissionRate: 30.00
  }
];

let sales = [];
let agents = [];
let chargebacks = [];

module.exports = {
  products,
  sales,
  agents,
  chargebacks
};