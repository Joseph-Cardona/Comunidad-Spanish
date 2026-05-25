const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// query: returns all rows as an array
async function query(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows;
}

// get: returns only the first row (or null)
async function get(text, params = []) {
  const res = await pool.query(text, params);
  return res.rows[0] || null;
}

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      username  TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role      TEXT DEFAULT 'client',
      total_xp  INTEGER DEFAULT 0,
      streak    INTEGER DEFAULT 0,
      last_lesson_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id        SERIAL PRIMARY KEY,
      title     TEXT NOT NULL,
      content   TEXT NOT NULL,
      unit      INTEGER DEFAULT 1,
      level     TEXT DEFAULT 'A1',
      type      TEXT DEFAULT 'Lesson',
      xp_reward INTEGER DEFAULT 10,
      steps     TEXT
    );

    CREATE TABLE IF NOT EXISTS progress (
      user_id    INTEGER REFERENCES users(id),
      lesson_id  INTEGER REFERENCES lessons(id),
      completed_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS activity (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id),
      message    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS posts (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id),
      content    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS board_nodes (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id),
      x          REAL NOT NULL,
      y          REAL NOT NULL,
      title      TEXT,
      content    TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS board_comments (
      id         SERIAL PRIMARY KEY,
      node_id    INTEGER REFERENCES board_nodes(id) ON DELETE CASCADE,
      user_id    INTEGER REFERENCES users(id),
      content    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Seed lessons if table is empty
  const { rows } = await pool.query('SELECT COUNT(*) AS count FROM lessons');
  if (parseInt(rows[0].count, 10) === 0) {
    const lessonsPath = path.join(__dirname, 'lessons.json');
    if (fs.existsSync(lessonsPath)) {
      const lessons = JSON.parse(fs.readFileSync(lessonsPath, 'utf8'));
      for (const l of lessons) {
        await pool.query(
          `INSERT INTO lessons (title, content, unit, level, type, xp_reward, steps)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [l.title, l.content, l.unit, l.level, l.type, l.xp_reward, JSON.stringify(l.steps || [])]
        );
      }
      console.log(`Seeded ${lessons.length} lessons.`);
    }
  }

  console.log('Database initialised successfully.');
}

init().catch(err => {
  console.error('Database init failed:', err.message);
  process.exit(1);
});

module.exports = { query, get };
