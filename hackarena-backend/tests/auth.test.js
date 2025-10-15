import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import authRoutes from '../src/routes/auth.js';
import { AppDataSource } from '../src/database/dataSource.js';

// Mock the database
jest.mock('../src/database/dataSource.js', () => ({
  AppDataSource: {
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    }),
  },
}));

// Mock Google OAuth2Client
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      getPayload: jest.fn().mockReturnValue({
        sub: 'google-id-123',
        email: 'google@example.com',
        name: 'Google User'
      })
    }),
  })),
}));

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

const mockUserRepository = AppDataSource.getRepository();

describe('Authentication Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const mockUser = { id: 1, email: userData.email, name: userData.name };
      mockUserRepository.findOne.mockResolvedValue(null); // No existing user
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User created successfully');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toEqual({
        id: 1,
        email: userData.email,
        name: userData.name
      });
    });

    it('should return error for missing fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('All fields are required');
    });

    it('should return error for existing user', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User'
      };

      mockUserRepository.findOne.mockResolvedValue({ id: 1, email: userData.email });

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User already exists');
    });
  });

  describe('POST /auth/login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const hashedPassword = await bcrypt.hash(loginData.password, 12);
      const user = {
        id: 1,
        email: loginData.email,
        name: 'Test User',
        password: hashedPassword
      };

      mockUserRepository.findOne.mockResolvedValue(user);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toEqual({
        id: user.id,
        email: user.email,
        name: user.name
      });
    });

    it('should return error for invalid credentials', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('POST /auth/google', () => {
    it('should authenticate with Google successfully for new user', async () => {
      const googleData = { idToken: 'valid-token' };

      const mockUser = { id: 1, email: 'google@example.com', name: 'Google User', google_id: 'google-id-123' };
      mockUserRepository.findOne.mockResolvedValueOnce(null); // No user with Google ID
      mockUserRepository.findOne.mockResolvedValueOnce(null); // No user with email
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/google')
        .send(googleData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Google authentication successful');
      expect(response.body.token).toBeDefined();
    });

    it('should link Google account to existing user', async () => {
      const googleData = { idToken: 'valid-token' };

      const existingUser = { id: 1, email: 'existing@example.com', name: 'Existing User' };

      mockUserRepository.findOne.mockResolvedValueOnce(null); // No user with Google ID
      mockUserRepository.findOne.mockResolvedValueOnce(existingUser); // Existing user with email
      mockUserRepository.update.mockResolvedValue({});

      const response = await request(app)
        .post('/auth/google')
        .send(googleData);

      expect(response.status).toBe(200);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        existingUser.id,
        { google_id: 'google-id-123' }
      );
    });
  });
});