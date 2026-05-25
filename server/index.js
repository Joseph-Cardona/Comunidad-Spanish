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

// ====================== AUTH MIDDLEWARE ======================
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
    if (e.code === '23505') res.status(400).json({ error: 'Username taken' });
    else res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const user = await get('SELECT * FROM users WHERE username = $1', [username]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (role && user.role !== role) {
      return res.status(403).json({ error: `User is not a ${role}` });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET);
    res.json({
      token,
      id: user.id,
      username: user.username,
      role: user.role,
      total_xp: user.total_xp,
      streak: user.streak
    });
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
    console.error('Lessons error:', e);
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
      await query(
        'INSERT INTO activity (user_id, message) VALUES ($1, $2)',
        [req.user.id, `${req.user.username} completed ${lesson.title}!`]
      );
      res.json({ message: 'Lesson completed', xp_gained: lesson.xp_reward, first_time: true });
    } else {
      res.json({ message: 'Lesson practiced', xp_gained: 0, first_time: false });
    }
  } catch (e) {
    console.error('Completion error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ====================== SOCIAL ======================
app.post('/api/posts', authenticate, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  try {
    await query('INSERT INTO posts (user_id, content) VALUES ($1, $2)', [req.user.id, content]);
    res.json({ message: 'Post created' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.get('/api/feed', async (req, res) => {
  try {
    const activities = await query(`
      SELECT 'activity' as type, a.id, a.message as content, a.created_at, u.username
      FROM activity a
      JOIN users u ON a.user_id = u.id
      UNION ALL
      SELECT 'post' as type, p.id, p.content, p.created_at, u.username
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY created_at DESC LIMIT 30
    `);
    res.json(activities);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const topUsers = await query(
      'SELECT username, total_xp, streak FROM users ORDER BY total_xp DESC LIMIT 10'
    );
    res.json(topUsers);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
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
      comments: comments
        .filter(c => c.node_id === node.id)
        .map(c => ({
          id: c.id,
          text: c.content,
          ownerId: c.user_id,
          ownerUsername: c.ownerUsername
        }))
    }));
    res.json(nodesWithComments);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

app.post('/api/board/nodes', authenticate, async (req, res) => {
  const { x, y, title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
  try {
    const result = await query(
      'INSERT INTO board_nodes (user_id, x, y, title, content) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [req.user.id, x, y, title, content]
    );
    res.json({ id: result[0].id, ownerId: req.user.id, ownerUsername: req.user.username });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create node' });
  }
});

app.put('/api/board/nodes/:id', authenticate, async (req, res) => {
  const { x, y, title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
  try {
    const node = await get('SELECT user_id FROM board_nodes WHERE id = $1', [req.params.id]);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    if (node.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await query(
      'UPDATE board_nodes SET x = $1, y = $2, title = $3, content = $4 WHERE id = $5',
      [x, y, title, content, req.params.id]
    );
    res.json({ message: 'Node updated' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update node' });
  }
});

app.delete('/api/board/nodes/:id', authenticate, async (req, res) => {
  try {
    const node = await get('SELECT user_id FROM board_nodes WHERE id = $1', [req.params.id]);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    if (node.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await query('DELETE FROM board_nodes WHERE id = $1', [req.params.id]);
    res.json({ message: 'Node deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete node' });
  }
});

app.post('/api/board/nodes/:id/comments', authenticate, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  try {
    const result = await query(
      'INSERT INTO board_comments (node_id, user_id, content) VALUES ($1, $2, $3) RETURNING id',
      [req.params.id, req.user.id, content]
    );
    res.json({ id: result[0].id, ownerId: req.user.id, ownerUsername: req.user.username });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

app.delete('/api/board/comments/:id', authenticate, async (req, res) => {
  try {
    const comment = await get('SELECT user_id FROM board_comments WHERE id = $1', [req.params.id]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await query('DELETE FROM board_comments WHERE id = $1', [req.params.id]);
    res.json({ message: 'Comment deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ====================== HEALTH ======================
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
