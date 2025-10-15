import jwt from 'jsonwebtoken';
import { db } from '../database/init.js';

// Validate JWT_SECRET is available (optional for debugging)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'debug-jwt-secret-key-for-development-only';
}

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if database connection is available
    if (!db) {
      return res.status(500).json({ error: 'Database connection error' });
    }

    const user = await db.getAsync('SELECT * FROM users WHERE id = $1', [decoded.userId]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
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

  if (!sessionToken) {
    return res.status(401).json({ error: 'Session token required' });
  }

  try {
    const participant = await db.getAsync(
      'SELECT * FROM participants WHERE session_token = $1 AND status = $2',
      [sessionToken, 'active']
    );

    if (!participant) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    req.participant = participant;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Authentication error' });
  }
};