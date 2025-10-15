import { DataSource } from 'typeorm';
import { User } from '../entities/User.js';
import { Game } from '../entities/Game.js';
import { Question } from '../entities/Question.js';
import { Participant } from '../entities/Participant.js';
import { Answer } from '../entities/Answer.js';
import { GameSession } from '../entities/GameSession.js';
import { CodeExecutionResult } from '../entities/CodeExecutionResult.js';
import { SupportedLanguage } from '../entities/SupportedLanguage.js';
import { CodeTemplate } from '../entities/CodeTemplate.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL, // Use DATABASE_URL if available
  host: process.env.DATABASE_URL ? undefined : (process.env.DATABASE_HOST || 'pg-2e6b7563-svm-aac5.f.aivencloud.com'),
  port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DATABASE_PORT || '14244'),
  username: process.env.DATABASE_URL ? undefined : (process.env.DATABASE_USER || 'avnadmin'),
  password: process.env.DATABASE_URL ? undefined : process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_URL ? undefined : (process.env.DATABASE_NAME || 'defaultdb'),
  ssl: {
    rejectUnauthorized: false,
  },
  synchronize: false, // Use migrations instead
  logging: true, // Enable logging for development
  entities: [
    User,
    Game,
    Question,
    Participant,
    Answer,
    GameSession,
    CodeExecutionResult,
    SupportedLanguage,
    CodeTemplate,
  ],
  migrations: [], // Add migration files if needed
  subscribers: [], // Add subscribers if needed
  extra: {
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Increased timeout to 10 seconds for debugging
    timezone: 'UTC', // Ensure all timestamps are handled in UTC
  },
});

// Initialize the data source with error handling
AppDataSource.initialize()
  .then(() => {
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1); // Exit the process if the database connection fails
  });
