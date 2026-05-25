// server/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

console.log('✅ Connected to Neon PostgreSQL');

// Unified query helpers
const query = async (text, params = []) => {
  const res = await pool.query(text, params);
  return res.rows;
};

const get = async (text, params = []) => {
  const res = await pool.query(text, params);
  return res.rows[0];
};

const run = async (text, params = []) => {
  const res = await pool.query(text, params);
  return { rowCount: res.rowCount };
};

// Initialize tables
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'client',
        total_xp INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        last_lesson_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        unit INTEGER,
        type TEXT,
        content TEXT,
        xp_reward INTEGER DEFAULT 10,
        steps JSONB
      );

      CREATE TABLE IF NOT EXISTS board_nodes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        x REAL NOT NULL,
        y REAL NOT NULL,
        title TEXT,
        content TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        node_id INTEGER REFERENCES board_nodes(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Database tables initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

initDB();

module.exports = { query, get, run, pool };
