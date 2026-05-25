const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'lang.db');
const db = new Database(dbPath);

// Initialize schema (SQLite syntax)
function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'client',
      total_xp INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      last_lesson_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      unit INTEGER DEFAULT 1,
      level TEXT DEFAULT 'A1',
      type TEXT DEFAULT 'Lesson',
      xp_reward INTEGER DEFAULT 10,
      steps TEXT
    );

    CREATE TABLE IF NOT EXISTS progress (
      user_id INTEGER,
      lesson_id INTEGER,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(lesson_id) REFERENCES lessons(id),
      PRIMARY KEY (user_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS board_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      x REAL NOT NULL,
      y REAL NOT NULL,
      title TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS board_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node_id INTEGER,
      user_id INTEGER,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(node_id) REFERENCES board_nodes(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  // Seed initial lessons if empty
  const count = db.prepare('SELECT COUNT(*) as count FROM lessons').get().count;
  if (count === 0) {
    const lessonsPath = path.join(__dirname, 'lessons.json');
    if (fs.existsSync(lessonsPath)) {
      const lessonsData = JSON.parse(fs.readFileSync(lessonsPath, 'utf8'));
      const insert = db.prepare(`
        INSERT INTO lessons (title, content, unit, level, type, xp_reward, steps) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const transaction = db.transaction((lessons) => {
        for (const l of lessons) {
          insert.run(l.title, l.content, l.unit, l.level, l.type, l.xp_reward, JSON.stringify(l.steps || []));
        }
      });
      
      transaction(lessonsData);
      console.log(`Seeded ${lessonsData.length} lessons from JSON.`);
    }
  }
}

init();

module.exports = {
  db,
  prepare: (text) => db.prepare(text)
};
