require('dotenv').config();
const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','coordinator')),
        branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS car_models (
        id SERIAL PRIMARY KEY,
        brand TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(brand, name)
      );

      CREATE TABLE IF NOT EXISTS car_variants (
        id SERIAL PRIMARY KEY,
        model_id INTEGER NOT NULL REFERENCES car_models(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        fuel_type TEXT NOT NULL DEFAULT 'Petrol',
        transmission TEXT NOT NULL DEFAULT 'Manual',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(model_id, name)
      );

      CREATE TABLE IF NOT EXISTS cars (
        id SERIAL PRIMARY KEY,
        variant_id INTEGER NOT NULL REFERENCES car_variants(id) ON DELETE RESTRICT,
        branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
        regd_no TEXT NOT NULL UNIQUE,
        color TEXT,
        status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','in_use','maintenance')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sales_consultants (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
        employee_id TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'Showroom' CHECK(type IN ('Showroom','Field')),
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS test_drives (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER NOT NULL REFERENCES branches(id),
        car_id INTEGER NOT NULL REFERENCES cars(id),
        consultant_id INTEGER REFERENCES sales_consultants(id),
        slip_id TEXT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        drive_date DATE NOT NULL,
        category TEXT NOT NULL DEFAULT 'Test Drive' CHECK(category IN ('Test Drive','Activity','Experience','Repeat Drive','Connected Rides','Others')),
        activity_name TEXT,
        showroom_type TEXT NOT NULL DEFAULT 'Showroom' CHECK(showroom_type IN ('Showroom','Home TD')),
        kms_in NUMERIC,
        kms_out NUMERIC,
        remarks TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE test_drives ADD COLUMN IF NOT EXISTS activity_name TEXT;
    `);
    console.log('Migration complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => { console.error(err); process.exit(1); });
