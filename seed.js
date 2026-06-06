require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    // Branches
    await client.query(`INSERT INTO branches (name) VALUES ('Main Showroom'),('North Branch'),('South Branch') ON CONFLICT DO NOTHING`);

    const { rows: [branch] } = await client.query(`SELECT id FROM branches WHERE name = 'Main Showroom'`);

    // Admin
    const adminHash = bcrypt.hashSync('admin123', 10);
    await client.query(
      `INSERT INTO users (name, email, password, role, branch_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      ['Super Admin', 'admin@testdrive.com', adminHash, 'admin', branch.id]
    );

    // Coordinator
    const coordHash = bcrypt.hashSync('coord123', 10);
    await client.query(
      `INSERT INTO users (name, email, password, role, branch_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      ['John Coordinator', 'coord@testdrive.com', coordHash, 'coordinator', branch.id]
    );

    console.log('Seeded successfully!');
    console.log('Admin:       admin@testdrive.com / admin123');
    console.log('Coordinator: coord@testdrive.com / coord123');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
