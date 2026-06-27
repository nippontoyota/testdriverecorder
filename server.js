require('dotenv').config();  // no-op in prod (env vars set in Render dashboard)
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'testdrive_secret_change_in_prod';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── helpers ─────────────────────────────────────────────────────────────────

const q = (text, params) => pool.query(text, params).then(r => r.rows);
const q1 = (text, params) => pool.query(text, params).then(r => r.rows[0]);

// ── auth middleware ──────────────────────────────────────────────────────────

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(header.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

function coordinatorOnly(req, res, next) {
  if (req.user.role !== 'coordinator') return res.status(403).json({ error: 'Coordinator only' });
  next();
}

// ── auth ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await q1(
      `SELECT u.*, b.name as branch_name FROM users u LEFT JOIN branches b ON u.branch_id = b.id WHERE u.email = $1`,
      [email]
    );
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, branch_id: user.branch_id, name: user.name },
      JWT_SECRET, { expiresIn: '12h' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, branch_id: user.branch_id, branch_name: user.branch_name } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await q1(
      `SELECT u.id, u.name, u.email, u.role, u.branch_id, b.name as branch_name FROM users u LEFT JOIN branches b ON u.branch_id = b.id WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(user);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ── branches ─────────────────────────────────────────────────────────────────

app.get('/api/branches', auth, async (req, res) => {
  try { res.json(await q(`SELECT * FROM branches ORDER BY name`)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/branches', auth, adminOnly, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Branch name required' });
  try {
    const row = await q1(`INSERT INTO branches (name) VALUES ($1) RETURNING *`, [name]);
    res.status(201).json(row);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Branch already exists' });
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/branches/:id', auth, adminOnly, async (req, res) => {
  try { await q(`DELETE FROM branches WHERE id = $1`, [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── users ─────────────────────────────────────────────────────────────────────

app.get('/api/users', auth, adminOnly, async (req, res) => {
  try {
    res.json(await q(`SELECT u.id, u.name, u.email, u.role, u.branch_id, b.name as branch_name, u.created_at FROM users u LEFT JOIN branches b ON u.branch_id = b.id ORDER BY u.created_at DESC`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', auth, adminOnly, async (req, res) => {
  const { name, email, password, role, branch_id } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'name, email, password, role required' });
  if (!['admin','coordinator'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const row = await q1(`INSERT INTO users (name, email, password, role, branch_id) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role, branch_id`, [name, email, hash, role, branch_id || null]);
    res.status(201).json(row);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id', auth, adminOnly, async (req, res) => {
  const { name, email, role, branch_id, password } = req.body;
  try {
    const user = await q1(`SELECT * FROM users WHERE id = $1`, [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const newPass = password ? bcrypt.hashSync(password, 10) : user.password;
    await q(`UPDATE users SET name=$1, email=$2, role=$3, branch_id=$4, password=$5 WHERE id=$6`,
      [name||user.name, email||user.email, role||user.role, branch_id??user.branch_id, newPass, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/:id', auth, adminOnly, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  try { await q(`DELETE FROM users WHERE id = $1`, [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── car models ────────────────────────────────────────────────────────────────

app.get('/api/models', auth, async (req, res) => {
  try {
    res.json(await q(`SELECT m.*, COUNT(v.id)::int as variant_count FROM car_models m LEFT JOIN car_variants v ON v.model_id = m.id GROUP BY m.id ORDER BY m.brand, m.name`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/models', auth, adminOnly, async (req, res) => {
  const { brand, name } = req.body;
  if (!brand || !name) return res.status(400).json({ error: 'brand and name required' });
  try {
    const row = await q1(`INSERT INTO car_models (brand, name) VALUES ($1,$2) RETURNING *`, [brand, name]);
    res.status(201).json(row);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Model already exists' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/models/:id', auth, adminOnly, async (req, res) => {
  const { brand, name } = req.body;
  try {
    await q(`UPDATE car_models SET brand=COALESCE($1,brand), name=COALESCE($2,name) WHERE id=$3`, [brand, name, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/models/:id', auth, adminOnly, async (req, res) => {
  try { await q(`DELETE FROM car_models WHERE id = $1`, [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(409).json({ error: 'Cannot delete model with existing variants or cars' }); }
});

// ── car variants ──────────────────────────────────────────────────────────────

app.get('/api/variants', auth, async (req, res) => {
  try {
    const { model_id } = req.query;
    const params = [];
    let sql = `SELECT v.*, m.brand, m.name as model_name FROM car_variants v JOIN car_models m ON v.model_id = m.id`;
    if (model_id) { sql += ` WHERE v.model_id = $1`; params.push(model_id); }
    sql += ` ORDER BY m.brand, m.name, v.name`;
    res.json(await q(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/variants', auth, adminOnly, async (req, res) => {
  const { model_id, name, fuel_type, transmission } = req.body;
  if (!model_id || !name) return res.status(400).json({ error: 'model_id and name required' });
  try {
    const row = await q1(`INSERT INTO car_variants (model_id, name, fuel_type, transmission) VALUES ($1,$2,$3,$4) RETURNING *`,
      [model_id, name, fuel_type||'Petrol', transmission||'Manual']);
    res.status(201).json(row);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Variant already exists for this model' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/variants/:id', auth, adminOnly, async (req, res) => {
  const { name, fuel_type, transmission } = req.body;
  try {
    await q(`UPDATE car_variants SET name=COALESCE($1,name), fuel_type=COALESCE($2,fuel_type), transmission=COALESCE($3,transmission) WHERE id=$4`,
      [name, fuel_type, transmission, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/variants/:id', auth, adminOnly, async (req, res) => {
  try { await q(`DELETE FROM car_variants WHERE id = $1`, [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(409).json({ error: 'Cannot delete variant with registered cars' }); }
});

// ── cars ──────────────────────────────────────────────────────────────────────

app.get('/api/cars', auth, async (req, res) => {
  try {
    const branch_id = req.query.branch_id || (req.user.role === 'coordinator' ? req.user.branch_id : null);
    const params = [];
    let sql = `SELECT c.*, cv.name as variant_name, cv.fuel_type, cv.transmission,
               m.name as model_name, m.brand, b.name as branch_name
               FROM cars c
               JOIN car_variants cv ON c.variant_id = cv.id
               JOIN car_models m ON cv.model_id = m.id
               JOIN branches b ON c.branch_id = b.id`;
    if (branch_id) { sql += ` WHERE c.branch_id = $1`; params.push(branch_id); }
    sql += ` ORDER BY m.brand, m.name, cv.name, c.regd_no`;
    res.json(await q(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cars', auth, async (req, res) => {
  const { variant_id, branch_id, regd_no, color } = req.body;
  if (!variant_id || !branch_id || !regd_no) return res.status(400).json({ error: 'variant_id, branch_id, regd_no required' });
  if (req.user.role === 'coordinator' && parseInt(branch_id) !== req.user.branch_id)
    return res.status(403).json({ error: 'Can only add cars to your own branch' });
  try {
    const row = await q1(`INSERT INTO cars (variant_id, branch_id, regd_no, color) VALUES ($1,$2,$3,$4) RETURNING *`,
      [variant_id, branch_id, regd_no.toUpperCase(), color||null]);
    res.status(201).json(row);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Registration number already exists' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/cars/:id', auth, async (req, res) => {
  const { regd_no, color, status } = req.body;
  try {
    const car = await q1(`SELECT * FROM cars WHERE id = $1`, [req.params.id]);
    if (!car) return res.status(404).json({ error: 'Car not found' });
    if (req.user.role === 'coordinator' && car.branch_id !== req.user.branch_id)
      return res.status(403).json({ error: 'Access denied' });
    await q(`UPDATE cars SET regd_no=COALESCE($1,regd_no), color=COALESCE($2,color), status=COALESCE($3,status) WHERE id=$4`,
      [regd_no?.toUpperCase(), color, status, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/cars/:id', auth, adminOnly, async (req, res) => {
  try { await q(`DELETE FROM cars WHERE id = $1`, [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── consultants ───────────────────────────────────────────────────────────────

app.get('/api/consultants', auth, async (req, res) => {
  try {
    const branch_id = req.query.branch_id || (req.user.role === 'coordinator' ? req.user.branch_id : null);
    const params = [];
    let sql = `SELECT c.*, b.name as branch_name FROM sales_consultants c JOIN branches b ON c.branch_id = b.id WHERE c.active = true`;
    if (branch_id) { sql += ` AND c.branch_id = $1`; params.push(branch_id); }
    sql += ` ORDER BY c.first_name, c.last_name`;
    res.json(await q(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/consultants', auth, coordinatorOnly, async (req, res) => {
  const { branch_id, employee_id, first_name, last_name, type } = req.body;
  if (!branch_id || !employee_id || !first_name || !last_name) return res.status(400).json({ error: 'branch_id, employee_id, first_name, last_name required' });
  if (req.user.role === 'coordinator' && parseInt(branch_id) !== req.user.branch_id)
    return res.status(403).json({ error: 'Access denied' });
  try {
    const row = await q1(`INSERT INTO sales_consultants (branch_id, employee_id, first_name, last_name, type) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [branch_id, employee_id, first_name, last_name, type||'Showroom']);
    res.status(201).json(row);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Employee ID already exists' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/consultants/:id', auth, adminOnly, async (req, res) => {
  const { first_name, last_name, type, active } = req.body;
  try {
    await q(`UPDATE sales_consultants SET first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name), type=COALESCE($3,type), active=COALESCE($4,active) WHERE id=$5`,
      [first_name, last_name, type, active, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/consultants/:id', auth, adminOnly, async (req, res) => {
  try { await q(`DELETE FROM sales_consultants WHERE id = $1`, [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── test drives ───────────────────────────────────────────────────────────────

app.get('/api/test-drives', auth, async (req, res) => {
  try {
    const branch_id = req.user.role === 'coordinator' ? req.user.branch_id : req.query.branch_id;
    const { date_from, date_to } = req.query;
    const params = [];
    let idx = 1;

    let sql = `SELECT td.*,
               c.regd_no, cv.name as variant_name, m.name as model_name, m.brand,
               sc.first_name || ' ' || sc.last_name as consultant_name, sc.employee_id,
               b.name as branch_name
               FROM test_drives td
               JOIN cars c ON td.car_id = c.id
               JOIN car_variants cv ON c.variant_id = cv.id
               JOIN car_models m ON cv.model_id = m.id
               LEFT JOIN sales_consultants sc ON td.consultant_id = sc.id
               JOIN branches b ON td.branch_id = b.id
               WHERE 1=1`;

    if (branch_id) { sql += ` AND td.branch_id = $${idx++}`; params.push(branch_id); }
    if (date_from) { sql += ` AND td.drive_date >= $${idx++}`; params.push(date_from); }
    if (date_to)   { sql += ` AND td.drive_date <= $${idx++}`; params.push(date_to); }
    sql += ` ORDER BY td.drive_date DESC, td.created_at DESC`;

    res.json(await q(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/test-drives', auth, coordinatorOnly, async (req, res) => {
  const { branch_id, car_id, consultant_id, slip_id, customer_name, customer_phone, drive_date, category, activity_name, showroom_type, kms_in, kms_out, remarks } = req.body;
  if (!branch_id || !car_id || !consultant_id || !customer_name || !customer_phone || !drive_date || !category || !showroom_type || kms_in === undefined || kms_in === null || kms_in === '' || kms_out === undefined || kms_out === null || kms_out === '')
    return res.status(400).json({ error: 'All fields except TD Slip ID and Remarks are required' });
  if (category === 'Activity' && !activity_name)
    return res.status(400).json({ error: 'Activity name is required for the Activity category' });
  if (req.user.role === 'coordinator' && parseInt(branch_id) !== req.user.branch_id)
    return res.status(403).json({ error: 'Access denied' });
  try {
    const row = await q1(
      `INSERT INTO test_drives (branch_id, car_id, consultant_id, slip_id, customer_name, customer_phone, drive_date, category, activity_name, showroom_type, kms_in, kms_out, remarks, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [branch_id, car_id, consultant_id, slip_id||null, customer_name, customer_phone, drive_date, category, category==='Activity'?activity_name:null, showroom_type, kms_in, kms_out, remarks||null, req.user.id]
    );
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/test-drives/:id', auth, adminOnly, async (req, res) => {
  try { await q(`DELETE FROM test_drives WHERE id = $1`, [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── stats ─────────────────────────────────────────────────────────────────────

app.get('/api/stats', auth, async (req, res) => {
  try {
    const branch_id = req.user.role === 'coordinator' ? req.user.branch_id : req.query.branch_id;
    const today = new Date().toISOString().split('T')[0];
    const params = branch_id ? [branch_id] : [];
    const bf  = branch_id ? `WHERE branch_id = $1` : ``;
    const bfa = branch_id ? `AND branch_id = $2` : ``;

    const totalDrives      = (await q1(`SELECT COUNT(*)::int as c FROM test_drives ${bf}`, params))?.c || 0;
    const todayParams      = branch_id ? [today, branch_id] : [today];
    const todayDrives      = (await q1(`SELECT COUNT(*)::int as c FROM test_drives WHERE drive_date = $1 ${bfa}`, todayParams))?.c || 0;
    const totalCars        = (await q1(`SELECT COUNT(*)::int as c FROM cars ${bf}`, params))?.c || 0;
    const totalConsultants = (await q1(`SELECT COUNT(*)::int as c FROM sales_consultants WHERE active = true ${branch_id ? (bf.replace('WHERE','AND')) : ''}`, params))?.c || 0;

    res.json({ totalDrives, todayDrives, totalCars, totalConsultants });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SPA fallback ──────────────────────────────────────────────────────────────

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); });

app.listen(PORT, () => console.log(`FleetDrive Pro running at http://localhost:${PORT}`));
