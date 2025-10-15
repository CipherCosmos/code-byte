import jwt from 'jsonwebtoken';
import { db } from '../database/init.js';

// Validate JWT_SECRET is available (optional for debugging)
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET environment variable is not set - using default for debugging');
  process.env.JWT_SECRET = 'debug-jwt-secret-key-for-development-only';
}

export const authenticateToken = async (req, res, next) => {
  console.log('🔐 Auth middleware - Incoming request:');
  console.log('   Method:', req.method);
  console.log('   Path:', req.path);
  console.log('   Origin:', req.headers.origin);
  console.log('   User-Agent:', req.headers['user-agent']);

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Auth middleware - Request path:', req.path);
  console.log('🔐 Auth middleware - Auth header present:', !!authHeader);
  console.log('🔐 Auth middleware - Token present:', !!token);

  if (!token) {
    console.log('❌ Auth middleware - No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    console.log('🔍 Verifying JWT token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Auth middleware - Token decoded successfully, userId:', decoded.userId, 'email:', decoded.email);

    // Check if database connection is available
    if (!db) {
      console.error('❌ Database connection not available');
      return res.status(500).json({ error: 'Database connection error' });
    }

    console.log('🔍 Auth middleware - Querying database for userId:', decoded.userId);
    const user = await db.getAsync('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    console.log('🔍 Auth middleware - Database query result:', user ? 'User found' : 'User not found');

    if (!user) {
      console.log('❌ Auth middleware - User not found for userId:', decoded.userId);
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('✅ Auth middleware - User authenticated:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.log('❌ Auth middleware - Token verification failed:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token format' });
    } else {
      return res.status(403).json({ error: 'Token verification failed' });
    }
  }
};

export const authenticateParticipant = async (req, res, next) => {
  const sessionToken = req.headers['x-session-token'];

  console.log('🔐 Auth participant middleware - Session token:', sessionToken ? 'present' : 'missing');

  if (!sessionToken) {
    return res.status(401).json({ error: 'Session token required' });
  }

  try {
    console.log('🔍 Auth participant middleware - Querying database for session_token:', sessionToken);
    const participant = await db.getAsync(
      'SELECT * FROM participants WHERE session_token = $1 AND status = $2',
      [sessionToken, 'active']
    );
    console.log('🔍 Auth participant middleware - Database query result:', participant ? 'Participant found' : 'Participant not found');

    if (!participant) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    req.participant = participant;
    next();
  } catch (error) {
    console.log('❌ Auth participant middleware - Database query failed:', error.message);
    return res.status(500).json({ error: 'Authentication error' });
  }
};