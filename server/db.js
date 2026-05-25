// server/db.js
const path = require('path');

let db;

if (process.env.DATABASE_URL) {
  // Neon PostgreSQL - Production
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('✅ Connected to Neon PostgreSQL');
} else {
  // SQLite - Local Development
  const Database = require('better-sqlite3');
  const dbPath = path.join(__dirname, 'lang.db');
  db = new Database(dbPath);
  console.log('✅ Using SQLite (Local)');
}

// Unified interface
const query = async (sql, params = []) => {
  if (db.query) { // Postgres
    const res = await db.query(sql, params);
    return res.rows;
  } else { // SQLite
    const stmt = db.prepare(sql);
    return sql.trim().toLowerCase().startsWith('select') 
      ? stmt.all(...params) 
      : stmt.run(...params);
  }
};

const get = async (sql, params = []) => {
  if (db.query) {
    const res = await db.query(sql, params);
    return res.rows[0];
  } else {
    return db.prepare(sql).get(...params);
  }
};

const run = async (sql, params = []) => {
  if (db.query) {
    await db.query(sql, params);
    return { lastID: null };
  } else {
    return db.prepare(sql).run(...params);
  }
};

// Initialize database schema
async function initDB() {
  try {
    if (db.query) {
      // PostgreSQL schema for Neon
      await db.query(`
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
          content TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      console.log('✅ Neon database initialized');
    }
  } catch (err) {
    console.error('DB Init Error:', err);
  }
}

initDB();

module.exports = { query, get, run, db };
