require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query, get } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'supersecret';

app.use(cors({
  origin: [
    'https://comunidad-spanish-fl93cqedz-joseph-cardonas-projects.vercel.app',
    'https://comunidad-spanish.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Auth Middleware
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, SECRET);
    const user = await get('SELECT id, username, role FROM users WHERE id = $1', [decoded.id]);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ====================== AUTH ROUTES ======================

app.post('/api/auth/register', async (req, res) => {
  const { username, password, role = 'client' } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const hash = bcrypt.hashSync(password, 10);

  try {
    const result = await query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
      [username, hash, role]
    );

    const userId = result[0].id;
    const token = jwt.sign({ id: userId, username, role }, SECRET);

    res.json({ token, username, role, id: userId });
  } catch (e) {
    console.error(e);
    if (e.code === '23505') {
      res.status(400).json({ error: 'Username already taken' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await get('SELECT * FROM users WHERE username = $1', [username]);
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ 
      id: user.id, 
      username: user.username, 
      role: user.role 
    }, SECRET);

    res.json({ 
      token, 
      username: user.username, 
      role: user.role, 
      id: user.id 
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ====================== LESSONS ======================

app.get('/api/lessons', authenticate, async (req, res) => {
  try {
    const lessons = await query(`
      SELECT l.*,
      EXISTS(SELECT 1 FROM progress WHERE user_id = $1 AND lesson_id = l.id) as completed
      FROM lessons l
    `, [req.user.id]);
    res.json(lessons);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

app.post('/api/lessons/:id/complete', authenticate, async (req, res) => {
  const lessonId = req.params.id;
  try {
    const lesson = await get('SELECT * FROM lessons WHERE id = $1', [lessonId]);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const alreadyCompleted = await get(
      'SELECT 1 FROM progress WHERE user_id = $1 AND lesson_id = $2', 
      [req.user.id, lessonId]
    );

    if (!alreadyCompleted) {
      await query('INSERT INTO progress (user_id, lesson_id) VALUES ($1, $2)', [req.user.id, lessonId]);
      await query('UPDATE users SET total_xp = total_xp + $1 WHERE id = $2', [lesson.xp_reward, req.user.id]);
      
      res.json({ 
        message: 'Lesson completed', 
        xp_gained: lesson.xp_reward, 
        first_time: true 
      });
    } else {
      res.json({ message: 'Lesson already completed', xp_gained: 0, first_time: false });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
