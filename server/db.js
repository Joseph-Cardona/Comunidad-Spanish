const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

let pool;

if (isProduction) {
  // Cloud SQL Connection
  pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
  });
} else {
  // Local PostgreSQL for dev
  // You can set DATABASE_URL in your .env file
  // Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/comunidad
  pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/comunidad'
  });
}

// Helper to handle queries
const query = (text, params) => pool.query(text, params);

// Initialize schema (PostgreSQL syntax)
async function init() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'client',
        total_xp INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        last_lesson_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        unit INTEGER DEFAULT 1,
        level TEXT DEFAULT 'A1',
        type TEXT DEFAULT 'Lesson',
        xp_reward INTEGER DEFAULT 10,
        steps TEXT
      );

      CREATE TABLE IF NOT EXISTS progress (
        user_id INTEGER REFERENCES users(id),
        lesson_id INTEGER REFERENCES lessons(id),
        completed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, lesson_id)
      );

      CREATE TABLE IF NOT EXISTS activity (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS board_nodes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        x REAL NOT NULL,
        y REAL NOT NULL,
        title TEXT,
        content TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS board_comments (
        id SERIAL PRIMARY KEY,
        node_id INTEGER REFERENCES board_nodes(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed initial lessons if empty
    const res = await query('SELECT COUNT(*) FROM lessons');
    if (parseInt(res.rows[0].count) === 0) {
      const lessonsPath = path.join(__dirname, 'lessons.json');
      if (fs.existsSync(lessonsPath)) {
        const lessonsData = JSON.parse(fs.readFileSync(lessonsPath, 'utf8'));
        for (const l of lessonsData) {
          await query(
            'INSERT INTO lessons (title, content, unit, level, type, xp_reward, steps) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [l.title, l.content, l.unit, l.level, l.type, l.xp_reward, JSON.stringify(l.steps || [])]
          );
        }
        console.log(`Seeded ${lessonsData.length} lessons from JSON.`);
      }
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Run init but don't block exports
init();

module.exports = {
  query,
  // Shim to help transition from better-sqlite3
  prepare: (text) => {
    // Replace SQLite ? with PostgreSQL $1, $2, etc.
    let paramIndex = 1;
    const pgText = text.replace(/\?/g, () => `$${paramIndex++}`);
    
    return {
      run: (...params) => pool.query(pgText, params),
      get: async (...params) => {
        const res = await pool.query(pgText, params);
        return res.rows[0];
      },
      all: async (...params) => {
        const res = await pool.query(pgText, params);
        return res.rows;
      }
    };
  }
};
