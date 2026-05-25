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
  credentials: true
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

// ====================== AUTH ======================
app.post('/api/auth/register', async (req, res) => {
  const { username, password, role = 'client' } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

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
    if (e.code === '23505') res.status(400).json({ error: 'Username already taken' });
    else res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await get('SELECT * FROM users WHERE username = $1', [username]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET);
    res.json({ token, username: user.username, role: user.role, id: user.id });
  } catch (e) {
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
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// ====================== BOARD ======================
app.get('/api/board/nodes', async (req, res) => {
  try {
    const nodes = await query(`
      SELECT n.*, u.username as ownerUsername 
      FROM board_nodes n 
      JOIN users u ON n.user_id = u.id
    `);

    const comments = await query(`
      SELECT c.*, u.username as ownerUsername 
      FROM board_comments c 
      JOIN users u ON c.user_id = u.id
    `);

    const nodesWithComments = nodes.map(node => ({
      ...node,
      comments: comments.filter(c => c.node_id === node.id)
    }));

    res.json(nodesWithComments);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

app.post('/api/board/nodes', authenticate, async (req, res) => {
  const { x, y, title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

  try {
    const result = await query(
      'INSERT INTO board_nodes (user_id, x, y, title, content) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [req.user.id, x, y, title, content]
    );
    res.json({ id: result[0].id });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create node' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
