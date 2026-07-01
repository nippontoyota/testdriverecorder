require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcryptjs');

async function migrate() {
  const client = await pool.connect();
  try {
    // 1. Create clusters table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clusters (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Junction table: cluster ↔ branches
    await client.query(`
      CREATE TABLE IF NOT EXISTS cluster_branches (
        cluster_id INTEGER NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
        branch_id  INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        PRIMARY KEY (cluster_id, branch_id)
      );
    `);

    // 3. Add cluster_id column to users
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS cluster_id INTEGER REFERENCES clusters(id) ON DELETE SET NULL;
    `);

    // 4. Widen role constraint to include cluster_manager
    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('admin','coordinator','cluster_manager'));
    `);

    // 5. Add Nettoor branch (Cochin cluster branch not in original 40)
    await client.query(`INSERT INTO branches (name) VALUES ('Nettoor') ON CONFLICT DO NOTHING;`);

    // 6. Insert 4 clusters
    await client.query(`
      INSERT INTO clusters (name) VALUES
        ('Thrissur Cluster'),
        ('Cochin Cluster'),
        ('Kottayam Cluster'),
        ('Trivandrum Cluster')
      ON CONFLICT DO NOTHING;
    `);

    // 7. Assign branches to clusters
    const { rows: clusters } = await client.query(`SELECT id, name FROM clusters`);
    const { rows: branches } = await client.query(`SELECT id, name FROM branches`);

    const clusterMap = Object.fromEntries(clusters.map(c => [c.name, c.id]));
    const branchMap  = Object.fromEntries(branches.map(b => [b.name, b.id]));

    const assignments = {
      'Thrissur Cluster':   ['Thrissur','Kunankulam','Nadathara','Wadakkanchery','Thrithalloor','Irinjalakuda','Chendrappinni','Chalakudy','Muvattupuzha','Koothattukulam','Kothamangalam'],
      'Cochin Cluster':     ['Kalamassery','Nettoor','Cherthala','Kayamkulam','Mavelikkara','Kunnathoor'],
      'Kottayam Cluster':   ['Kottayam','Changanassery','Kanjirapally','Vaikom','Uzhavoor','Pala','Ettumanoor','Thiruvalla','Chengannur','Mallapally','Pathanamthitta','Adoor','Koni','Rani'],
      'Trivandrum Cluster': ['Kazhakkoottam','Varkala','Enjakkal','Parassala','Neyyattinkara','Kollam','Karunagappalli','Punalur','Nilamel','Pathanapuram'],
    };

    for (const [clusterName, branchNames] of Object.entries(assignments)) {
      const clusterId = clusterMap[clusterName];
      for (const branchName of branchNames) {
        const branchId = branchMap[branchName];
        if (!branchId) { console.warn(`Branch not found: ${branchName}`); continue; }
        await client.query(
          `INSERT INTO cluster_branches (cluster_id, branch_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [clusterId, branchId]
        );
      }
    }
    console.log('Cluster-branch assignments done.');

    // 8. Create Nettoor coordinator account
    const nettoorId = branchMap['Nettoor'];
    if (nettoorId) {
      const hash = bcrypt.hashSync('Nettoor@123', 10);
      await client.query(
        `INSERT INTO users (name, email, password, role, branch_id)
         VALUES ('Nettoor Coordinator','nettoor@testdrive.com',$1,'coordinator',$2)
         ON CONFLICT (email) DO NOTHING`,
        [hash, nettoorId]
      );
      console.log('Nettoor coordinator created: nettoor@testdrive.com / Nettoor@123');
    }

    // 9. Create cluster manager accounts
    const managers = [
      { name: 'Thrissur Cluster Manager',   email: 'thrissur.cluster@testdrive.com',   password: 'ThrissurCluster@123',   cluster: 'Thrissur Cluster'   },
      { name: 'Cochin Cluster Manager',     email: 'cochin.cluster@testdrive.com',     password: 'CochinCluster@123',     cluster: 'Cochin Cluster'     },
      { name: 'Kottayam Cluster Manager',   email: 'kottayam.cluster@testdrive.com',   password: 'KottayamCluster@123',   cluster: 'Kottayam Cluster'   },
      { name: 'Trivandrum Cluster Manager', email: 'trivandrum.cluster@testdrive.com', password: 'TrivandrumCluster@123', cluster: 'Trivandrum Cluster' },
    ];

    for (const m of managers) {
      const hash = bcrypt.hashSync(m.password, 10);
      const clusterId = clusterMap[m.cluster];
      await client.query(
        `INSERT INTO users (name, email, password, role, cluster_id)
         VALUES ($1,$2,$3,'cluster_manager',$4)
         ON CONFLICT (email) DO UPDATE SET cluster_id = EXCLUDED.cluster_id, role = 'cluster_manager'`,
        [m.name, m.email, hash, clusterId]
      );
      console.log(`Cluster manager created: ${m.email} / ${m.password}`);
    }

    console.log('\nCluster migration complete!');
  } catch (e) {
    console.error('Migration failed:', e);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => { console.error(err); process.exit(1); });
