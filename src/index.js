const express = require('express');
const cors = require('cors');
const routes = require('./routes');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ message: 'SyncedUp Insurance API - Working!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Test the API:');
  console.log(`http://localhost:${PORT}/api/products/TX`);
});