const bcrypt = require('bcryptjs');
const hash = '$2a$10$eW.jbTwbCXZt3bqA5xLcaOBvXZ2S8hBgQmW8h.Y2uWQqX.ksYqk5G';
const password = 'test123';

bcrypt.compare(password, hash, (err, result) => {
  console.log('Error:', err);
  console.log('Match:', result);
});