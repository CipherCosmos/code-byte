import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { AppDataSource } from '../database/dataSource.ts';
import { User } from '../entities/User.ts';
import { authenticateToken } from '../middleware/auth.js';

// Validate JWT_SECRET is available (optional for debugging)
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET environment variable is not set - using default for debugging');
  process.env.JWT_SECRET = 'debug-jwt-secret-key-for-development-only';
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Validate Google Client ID is available (optional for debugging)
if (!process.env.GOOGLE_CLIENT_ID) {
  console.warn('⚠️ GOOGLE_CLIENT_ID environment variable is not set - Google authentication will be disabled');
}

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    console.log('Registration attempt:', { email, name });

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const userRepository = AppDataSource.getRepository(User);

    // Check if user exists
    console.log('🔍 Registration - Checking if user exists for email:', email);
    const existingUser = await userRepository.findOne({ where: { email } });
    console.log('🔍 Registration - Existing user check result:', existingUser ? 'User exists' : 'User does not exist');
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    console.log('Inserting user with password column:', { email, hashedPassword, name });
    const user = userRepository.create({
      email,
      password: hashedPassword,
      name
    });
    const savedUser = await userRepository.save(user);

    // Generate JWT
    console.log('🔑 Generating JWT for userId:', savedUser.id, 'email:', email);
    const token = jwt.sign(
      { userId: savedUser.id, email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('✅ JWT generated successfully, token length:', token.length);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: savedUser.id,
        email,
        name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userRepository = AppDataSource.getRepository(User);

    // Find user
    console.log('🔍 Login - Querying database for email:', email);
    const user = await userRepository.findOne({ where: { email } });
    console.log('🔍 Login - Database query result:', user ? 'User found' : 'User not found');
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    console.log('🔑 Generating JWT for login, userId:', user.id, 'email:', user.email);
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('✅ Login JWT generated successfully, token length:', token.length);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google Sign-In
// Implements OAuth 2.0 authentication with Google
// Supports both new user creation and account linking for existing users
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    // Verify the Google ID token with Google's servers
    // This ensures the token is valid and hasn't been tampered with
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    // Extract user information from the verified token
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    const userRepository = AppDataSource.getRepository(User);

    // Check if a user already exists with this Google ID
    // Google ID is unique per Google account
    let user = await userRepository.findOne({ where: { google_id: googleId } });

    if (!user) {
      // User doesn't exist with Google ID, check if they have an account with this email
      const existingUser = await userRepository.findOne({ where: { email } });

      if (existingUser) {
        // Link Google account to existing user account
        // This allows users to sign in with either email/password or Google
        await userRepository.update(existingUser.id, { google_id: googleId });
        user = { ...existingUser, google_id: googleId };
      } else {
        // Create new user account with Google credentials
        // No password needed since authentication is handled by Google
        const newUser = userRepository.create({
          email,
          name,
          google_id: googleId
        });
        const savedUser = await userRepository.save(newUser);
        user = savedUser;
      }
    }

    // Generate JWT token for session management
    // Same token format as traditional login for consistent API usage
    console.log('🔑 Generating JWT for Google auth, userId:', user.id, 'email:', user.email);
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('✅ Google JWT generated successfully, token length:', token.length);

    res.json({
      message: 'Google authentication successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name
    }
  });
});

export default router;