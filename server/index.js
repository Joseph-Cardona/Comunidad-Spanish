require('dotenv').config();
const express = require('express');

const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'supersecret';

app.use(cors({
  origin: ['https://comunidad-spanish.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Auth Middleware
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, SECRET);
    const user = await db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { username, password, role = 'client' } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = await db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, role);
    const userId = info.lastInsertRowid;
    const token = jwt.sign({ id: userId, username, role }, SECRET);
    res.json({ token, username, role, id: userId });
  } catch (e) {
    res.status(400).json({ error: 'Username taken' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password, role } = req.body;
  const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (user && bcrypt.compareSync(password, user.password_hash)) {
    if (role && user.role !== role) {
      return res.status(403).json({ error: `User is not a ${role}` });
    }
    const token = jwt.sign({ id: user.id, username, role: user.role }, SECRET);
    res.json({ 
      token, 
      id: user.id, 
      username, 
      role: user.role, 
      total_xp: user.total_xp, 
      streak: user.streak 
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Lesson Routes
app.get('/api/lessons', authenticate, async (req, res) => {
  const lessons = await db.prepare(`
    SELECT l.*, 
    EXISTS(SELECT 1 FROM progress WHERE user_id = ? AND lesson_id = l.id) as completed
    FROM lessons l
  `).all(req.user.id);
  res.json(lessons);
});

app.post('/api/lessons/:id/complete', authenticate, async (req, res) => {
  const lessonId = req.params.id;
  const lesson = await db.prepare('SELECT * FROM lessons WHERE id = ?').get(lessonId);
  
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const alreadyCompleted = await db.prepare('SELECT 1 FROM progress WHERE user_id = ? AND lesson_id = ?').get(req.user.id, lessonId);

  try {
    if (!alreadyCompleted) {
      await db.prepare('INSERT INTO progress (user_id, lesson_id) VALUES (?, ?)').run(req.user.id, lessonId);
      await db.prepare('UPDATE users SET total_xp = total_xp + ? WHERE id = ?').run(lesson.xp_reward, req.user.id);
      await db.prepare('INSERT INTO activity (user_id, message) VALUES (?, ?)').run(
        req.user.id, 
        `${req.user.username} completed ${lesson.title}!`
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

// Social Routes
app.post('/api/posts', authenticate, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  
  await db.prepare('INSERT INTO posts (user_id, content) VALUES (?, ?)').run(req.user.id, content);
  res.json({ message: 'Post created' });
});

app.get('/api/feed', async (req, res) => {
  const activities = await db.prepare(`
    SELECT 'activity' as type, a.id, a.message as content, a.created_at, u.username 
    FROM activity a 
    JOIN users u ON a.user_id = u.id 
    UNION ALL
    SELECT 'post' as type, p.id, p.content, p.created_at, u.username 
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY created_at DESC LIMIT 30
  `).all();
  res.json(activities);
});

app.get('/api/leaderboard', async (req, res) => {
  const topUsers = await db.prepare('SELECT username, total_xp, streak FROM users ORDER BY total_xp DESC LIMIT 10').all();
  res.json(topUsers);
});

// Board Routes
app.get('/api/board/nodes', async (req, res) => {
  const nodes = await db.prepare(`
    SELECT n.*, u.username as ownerUsername 
    FROM board_nodes n 
    JOIN users u ON n.user_id = u.id
  `).all();
  
  const comments = await db.prepare(`
    SELECT c.*, u.username as ownerUsername 
    FROM board_comments c 
    JOIN users u ON c.user_id = u.id
  `).all();

  // Group comments by node_id
  const nodesWithComments = nodes.map(node => ({
    ...node,
    comments: comments.filter(c => c.node_id === node.id).map(c => ({
      id: c.id,
      text: c.content,
      ownerId: c.user_id,
      ownerUsername: c.ownerUsername
    }))
  }));

  res.json(nodesWithComments);
});

app.post('/api/board/nodes', authenticate, async (req, res) => {
  const { x, y, title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  const info = await db.prepare('INSERT INTO board_nodes (user_id, x, y, title, content) VALUES (?, ?, ?, ?, ?)').run(
    req.user.id, x, y, title, content
  );
  const nodeId = info.lastInsertRowid;
  res.json({ id: nodeId, ownerId: req.user.id, ownerUsername: req.user.username });
});

app.put('/api/board/nodes/:id', authenticate, async (req, res) => {
  const { x, y, title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  const node = await db.prepare('SELECT user_id FROM board_nodes WHERE id = ?').get(req.params.id);
  
  if (!node) return res.status(404).json({ error: 'Node not found' });
  // Allow if user is owner OR user is admin
  if (node.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await db.prepare('UPDATE board_nodes SET x = ?, y = ?, title = ?, content = ? WHERE id = ?').run(
    x, y, title, content, req.params.id
  );
  res.json({ message: 'Node updated' });
});

app.delete('/api/board/nodes/:id', authenticate, async (req, res) => {
  const node = await db.prepare('SELECT user_id FROM board_nodes WHERE id = ?').get(req.params.id);
  
  if (!node) return res.status(404).json({ error: 'Node not found' });
  // Allow if user is owner OR user is admin
  if (node.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await db.prepare('DELETE FROM board_nodes WHERE id = ?').run(req.params.id);
  res.json({ message: 'Node deleted' });
});

app.post('/api/board/nodes/:id/comments', authenticate, async (req, res) => {
  const { content } = req.body;
  const info = await db.prepare('INSERT INTO board_comments (node_id, user_id, content) VALUES (?, ?, ?)').run(
    req.params.id, req.user.id, content
  );
  const commentId = info.lastInsertRowid;
  res.json({ id: commentId, ownerId: req.user.id, ownerUsername: req.user.username });
});

app.delete('/api/board/comments/:id', authenticate, async (req, res) => {
  const comment = await db.prepare('SELECT user_id FROM board_comments WHERE id = ?').get(req.params.id);
  
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  // Allow if user is owner OR user is admin
  if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await db.prepare('DELETE FROM board_comments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Comment deleted' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
