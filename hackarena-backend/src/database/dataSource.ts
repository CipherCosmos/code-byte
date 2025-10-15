import { DataSource } from 'typeorm';
import { User } from '../entities/User.ts';
import { Game } from '../entities/Game.ts';
import { Question } from '../entities/Question.ts';
import { Participant } from '../entities/Participant.ts';
import { Answer } from '../entities/Answer.ts';
import { GameSession } from '../entities/GameSession.ts';
import { CodeExecutionResult } from '../entities/CodeExecutionResult.ts';
import { SupportedLanguage } from '../entities/SupportedLanguage.ts';
import { CodeTemplate } from '../entities/CodeTemplate.ts';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'pg-2e6b7563-svm-aac5.f.aivencloud.com',
  port: 14244,
  username: 'avnadmin',
  password: process.env.DATABASE_PASSWORD,
  database: 'defaultdb',
  ssl: { rejectUnauthorized: false },
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
    // Ensure all timestamps are handled in UTC
    timezone: 'UTC',
  },
});