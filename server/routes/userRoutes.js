const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Get all users
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, role FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load users', error: err.message });
  }
});

// Add new user (default role = employee)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  const { name, email, password, role = 'employee' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashed, role]
    );

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create user', error: err.message });
  }
});

module.exports = router;
