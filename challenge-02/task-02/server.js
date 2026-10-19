import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

const app = express();
const users = [];
const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error('Set JWT_SECRET');
}

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Auth API' });
});

app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must have at least 8 characters' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const emailExists = users.some(user => user.email === normalizedEmail);

  if (emailExists) {
    return res.status(409).json({ error: 'Email is already registered' });
  }

  const user = {
    id: randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    password: await bcrypt.hash(password, 10),
  };

  users.push(user);
  res.status(201).json({ id: user.id, name: user.name, email: user.email });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = users.find(user => user.email === email.toLowerCase().trim());
  const correctPassword = user && await bcrypt.compare(password, user.password);

  if (!correctPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    secret,
    { expiresIn: '1h' },
  );

  res.json({ token });
});

function verifyToken(req, res, next) {
  const header = req.get('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token is required' });
  }

  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ error: 'Token is invalid or expired' });
  }
}

app.get('/api/profile', verifyToken, (req, res) => {
  const user = users.find(user => user.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Auth API running at http://localhost:${port}`);
});
