const bcrypt = require('bcryptjs');

// Generate hash for admin123
const password = 'admin123';
const hash = bcrypt.hashSync(password, 10);

console.log('Add this SQL to your Supabase dashboard:\n');
console.log(`INSERT INTO users (email, password_hash, name, role) VALUES (
  'admin@syncedup.com',
  '${hash}',
  'Admin User',
  'admin'
);`);
