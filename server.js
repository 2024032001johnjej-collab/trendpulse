const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const User = require('./models/User');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trendpulse';
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-env';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    console.log('Continuing without MongoDB for frontend demo purposes...');
  });

const mockUsers = [];

app.post('/api/auth/signup', async (req, res) => {
  try {
    const name = req.body.name || req.body.username;
    const { email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (mongoose.connection.readyState !== 1) {
      if (mockUsers.some(u => u.email === email.toLowerCase())) {
        return res.status(409).json({ message: 'Email already registered.' });
      }
      const user = { _id: Date.now().toString(), name, email: email.toLowerCase() };
      mockUsers.push({ ...user, password }); 
      return res.status(201).json({ message: 'Signup successful.', userId: user._id });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    return res.status(201).json({ message: 'Signup successful.', userId: user._id });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during signup.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    let user;
    if (mongoose.connection.readyState !== 1) {
      user = mockUsers.find(u => u.email === email.toLowerCase() && u.password === password);
      if (!user) {
        user = { _id: 'fake-id', name: 'Demo User', email: email.toLowerCase() };
      }
    } else {
      user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: '1d',
    });

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error during login.' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const user = mockUsers.find(u => u._id === req.user.userId) || { name: 'Demo User', email: 'demo@example.com' };
      return res.json({ user });
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching user.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});


app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
