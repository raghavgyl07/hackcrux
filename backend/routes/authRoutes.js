const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Login Flow: Check email existence
router.post('/login', async (req, res) => {
  const { email } = req.body;

  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    const { data, error } = await db
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is code for "no rows found"
    const user = data;

    if (!user) {
      return res.status(404).json({ 
        message: 'Hi 👋 Looks like you’re new. Create an account to continue.',
        isNewUser: true 
      });
    }

    res.json({ 
      message: 'Welcome back!', 
      user: { id: user.id || user.email, email: user.email, name: user.name, role: user.role } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Signup Flow: Create new account
router.post('/signup', async (req, res) => {
  const { name, email, role } = req.body;

  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!name || !role) {
    return res.status(400).json({ error: 'All fields (name, email, role) are required.' });
  }

  try {
    const { data, error } = await db
      .from('users')
      .insert([{ name, email, role }])
      .select('id, name, email, role')
      .single();

    if (error) {
      console.error('Signup Supabase Error:', JSON.stringify(error, null, 2));
      if (error.code === '23505') return res.status(400).json({ error: 'Email already registered' });
      throw error;
    }
    const user = data;

    res.status(201).json({
      message: 'Account created successfully!',
      user
    });
  } catch (error) {
    const status = error.status || 500;
    console.error('Auth Route Error:', error);
    res.status(status).json({ 
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
  }
});

// Get Current User (Session Helper)
router.get('/user', async (req, res) => {
  // In a real app, this would use sessions/cookies/JWT
  // For this version, we expect the frontend to pass context
  res.status(404).json({ error: 'Session not found. Please log in.' });
});

module.exports = router;
