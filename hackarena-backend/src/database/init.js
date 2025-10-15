import pkg from 'pg';
import { promisify } from 'util';
const { Pool } = pkg;

// Create PostgreSQL connection pool
const pool = new Pool({
  host: 'pg-2e6b7563-svm-aac5.f.aivencloud.com',
  port: 14244,
  database: 'defaultdb',
  user: 'avnadmin',
  password: "AVNS_xajv7yJVEV30CJzLhRR",
  ssl: { rejectUnauthorized: false },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Increased timeout to 10 seconds for debugging
  // Ensure all timestamps are handled in UTC for consistent time management
  timezone: 'UTC',
});

// Promisify database methods for consistency with existing code
const db = {
  getAsync: async (sql, params = []) => {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  },
  allAsync: async (sql, params = []) => {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  },
  runAsync: async (sql, params = []) => {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return { lastID: result.rows[0]?.id || null, changes: result.rowCount };
    } finally {
      client.release();
    }
  }
};

export async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');
    console.log('🔍 Checking database connection...');
    // Test database connection
    await db.getAsync('SELECT 1');
    console.log('✅ Database connection successful');

    // Check if users table exists and has correct schema before dropping
    try {
      console.log('Checking users table schema...');
      const tableExists = await db.getAsync(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'users'
        )
      `);
      console.log('Users table exists:', tableExists.exists);

      if (tableExists.exists) {
        // Check if schema matches expected structure
        const columns = await db.allAsync(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'users'
          ORDER BY column_name
        `);
        console.log('Current users table columns:', columns);

        // Expected columns: id (uuid), email (text), password (text), name (text), google_id (text), created_at (timestamp)
        const expectedColumns = ['id', 'email', 'password', 'name', 'google_id', 'created_at'];
        const currentColumns = columns.map(col => col.column_name).sort();

        const schemaMatches = expectedColumns.every(col => currentColumns.includes(col)) &&
                             currentColumns.every(col => expectedColumns.includes(col));

        console.log('Schema matches expected:', schemaMatches);

        if (!schemaMatches) {
          console.log('Schema mismatch detected, dropping and recreating users table...');
          await db.runAsync(`DROP TABLE IF EXISTS users CASCADE`);
          console.log('Existing users table dropped due to schema mismatch.');
        } else {
          console.log('Users table schema is correct, skipping drop.');
        }
      } else {
        console.log('Users table does not exist, will create it.');
      }
    } catch (error) {
      console.log('Error checking users table schema:', error.message);
      // If we can't check, assume we need to drop and recreate
      console.log('Dropping users table as fallback...');
      await db.runAsync(`DROP TABLE IF EXISTS users CASCADE`);
      console.log('Existing users table dropped as fallback.');
    }

    // Users table
    console.log('Creating users table with correct schema...');
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        name TEXT NOT NULL,
        google_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created successfully with correct schema.');

    // Games table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        game_code TEXT UNIQUE NOT NULL,
        organizer_id UUID NOT NULL,
        status TEXT DEFAULT 'draft',
        current_question_index INTEGER DEFAULT 0,
        total_questions INTEGER DEFAULT 0,
        max_participants INTEGER DEFAULT 500,
        qualification_type TEXT DEFAULT 'none',
        qualification_threshold INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        ended_at TIMESTAMP,
        FOREIGN KEY (organizer_id) REFERENCES users (id)
      )
    `);
    try {
      await db.runAsync(`ALTER TABLE games ALTER COLUMN id SET DEFAULT gen_random_uuid()`);
    } catch (error) {
      // Column might already have default, ignore
    }

    // Rename columns if they exist with old names

    // Rename columns if they exist with old names
    try {
      await db.runAsync(`ALTER TABLE games RENAME COLUMN start_time TO started_at`);
    } catch (error) {
      // Column might not exist or already renamed, ignore
    }

    try {
      await db.runAsync(`ALTER TABLE games RENAME COLUMN end_time TO ended_at`);
    } catch (error) {
      // Column might not exist or already renamed, ignore
    }

    // Add missing columns if they don't exist
    try {
      await db.runAsync(`ALTER TABLE games ADD COLUMN game_code TEXT UNIQUE`);
    } catch (error) {
      // Column might already exist, ignore
    }

    try {
      await db.runAsync(`ALTER TABLE games ADD COLUMN current_question_index INTEGER DEFAULT 0`);
    } catch (error) {
      // Column might already exist, ignore
    }

    try {
      await db.runAsync(`ALTER TABLE games ADD COLUMN total_questions INTEGER DEFAULT 0`);
    } catch (error) {
      // Column might already exist, ignore
    }

    try {
      await db.runAsync(`ALTER TABLE games ADD COLUMN max_participants INTEGER DEFAULT 500`);
    } catch (error) {
      // Column might already exist, ignore
    }

    // Questions table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id TEXT NOT NULL,
        question_order INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL,
        options TEXT,
        correct_answer TEXT NOT NULL,
        hint TEXT,
        hint_penalty INTEGER DEFAULT 10,
        time_limit INTEGER DEFAULT 60,
        marks INTEGER DEFAULT 10,
        difficulty TEXT DEFAULT 'medium',
        explanation TEXT,
        evaluation_mode TEXT DEFAULT 'mcq',
        test_cases TEXT,
        ai_validation_settings TEXT,
        image_url TEXT,
        crossword_grid TEXT,
        crossword_clues TEXT,
        crossword_size TEXT,
        partial_marking_settings TEXT,
        time_decay_enabled BOOLEAN DEFAULT FALSE,
        time_decay_factor DECIMAL(3,2) DEFAULT 0.1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games (id)
      )
    `);

    try {
      await db.runAsync(`ALTER TABLE questions ALTER COLUMN id SET DEFAULT gen_random_uuid()`);
    } catch (error) {
      // Column might already have default, ignore
    }

    // Rename order_index to question_order if it exists
    try {
      await db.runAsync(`ALTER TABLE questions RENAME COLUMN order_index TO question_order`);
    } catch (error) {
      // Column might not exist or already renamed, ignore
    }

    // Add new columns to existing questions table if they don't exist
    try {
      await db.runAsync(`ALTER TABLE questions ADD COLUMN evaluation_mode TEXT DEFAULT 'mcq'`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE questions ADD COLUMN test_cases TEXT`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE questions ADD COLUMN ai_validation_settings TEXT`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE questions ADD COLUMN image_url TEXT`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE questions ADD COLUMN crossword_grid TEXT`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE questions ADD COLUMN crossword_clues TEXT`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE questions ADD COLUMN crossword_size TEXT`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE questions ADD COLUMN partial_marking_settings TEXT`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE questions ADD COLUMN time_decay_enabled BOOLEAN DEFAULT FALSE`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE questions ADD COLUMN time_decay_factor DECIMAL(3,2) DEFAULT 0.1`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add new columns for code evaluation configuration
    try {
      await db.runAsync(`ALTER TABLE questions ADD COLUMN code_languages TEXT`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE questions ADD COLUMN code_timeout INTEGER DEFAULT 30`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE questions ADD COLUMN code_memory_limit INTEGER DEFAULT 256`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE questions ADD COLUMN code_template TEXT`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE game_sessions ADD COLUMN paused_at DATETIME`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE games ADD COLUMN qualification_type TEXT DEFAULT 'none'`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE games ADD COLUMN qualification_threshold INTEGER DEFAULT 0`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE games ADD COLUMN qr_code_url TEXT`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE participants ADD COLUMN qualified BOOLEAN DEFAULT FALSE`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Participants table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT,
        total_score INTEGER DEFAULT 0,
        current_rank INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        qualified BOOLEAN DEFAULT FALSE,
        cheat_warnings INTEGER DEFAULT 0,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        socket_id TEXT,
        session_token TEXT UNIQUE,
        FOREIGN KEY (game_id) REFERENCES games (id)
      )
    `);

    // Answers table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS answers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        participant_id UUID NOT NULL,
        question_id UUID NOT NULL,
        is_correct BOOLEAN DEFAULT FALSE,
        score_earned INTEGER DEFAULT 0,
        time_taken INTEGER,
        hint_used BOOLEAN DEFAULT FALSE,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (participant_id) REFERENCES participants (id),
        FOREIGN KEY (question_id) REFERENCES questions (id)
      )
    `);

    // Add new columns for detailed code scoring
    try {
      await db.runAsync(`ALTER TABLE answers ADD COLUMN execution_results TEXT`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE answers ADD COLUMN partial_score DECIMAL(5,2) DEFAULT 0`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE answers ADD COLUMN code_quality_score DECIMAL(5,2) DEFAULT 0`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE answers ADD COLUMN performance_score DECIMAL(5,2) DEFAULT 0`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE answers ADD COLUMN correctness_score DECIMAL(5,2) DEFAULT 0`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE answers ADD COLUMN evaluation_mode TEXT`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE answers ADD COLUMN execution_time_ms INTEGER DEFAULT 0`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE answers ADD COLUMN memory_used_kb INTEGER DEFAULT 0`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE answers ADD COLUMN test_cases_passed INTEGER DEFAULT 0`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE answers ADD COLUMN total_test_cases INTEGER DEFAULT 0`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add answer_text column if missing (critical for answer submissions)
    try {
      await db.runAsync(`ALTER TABLE answers ADD COLUMN answer_text TEXT`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add auto_submitted_at column for tracking auto-submission timestamps
    try {
      await db.runAsync(`ALTER TABLE answers ADD COLUMN auto_submitted_at TIMESTAMP`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add time_decay_bonus column for enhanced scoring
    try {
      await db.runAsync(`ALTER TABLE answers ADD COLUMN time_decay_bonus DECIMAL(5,4) DEFAULT 0`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add server-side timer synchronization columns
    try {
      await db.runAsync(`ALTER TABLE game_sessions ADD COLUMN server_time_offset INTEGER DEFAULT 0`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE game_sessions ADD COLUMN last_sync_timestamp TIMESTAMP`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      await db.runAsync(`ALTER TABLE answers ADD COLUMN auto_submitted BOOLEAN DEFAULT FALSE`);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Game sessions table for real-time state
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id TEXT NOT NULL,
        current_question_id UUID,
        question_started_at TIMESTAMP,
        question_ends_at TIMESTAMP,
        paused_at TIMESTAMP,
        answers_revealed BOOLEAN DEFAULT FALSE,
        total_participants INTEGER DEFAULT 0,
        answered_participants INTEGER DEFAULT 0,
        auto_submitted_at TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games (id),
        FOREIGN KEY (current_question_id) REFERENCES questions (id)
      )
    `);

    // Code execution results table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS code_execution_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        answer_id UUID NOT NULL,
        language TEXT NOT NULL,
        code TEXT NOT NULL,
        execution_time DECIMAL(5,2),
        memory_used INTEGER,
        output TEXT,
        error_message TEXT,
        test_case_passed BOOLEAN DEFAULT FALSE,
        test_case_input TEXT,
        test_case_expected_output TEXT,
        test_case_actual_output TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (answer_id) REFERENCES answers (id)
      )
    `);

    // Supported languages table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS supported_languages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        language_name TEXT UNIQUE NOT NULL,
        language_code TEXT UNIQUE NOT NULL,
        version TEXT,
        compiler_flags TEXT,
        timeout_multiplier DECIMAL(3,2) DEFAULT 1.0,
        memory_multiplier DECIMAL(3,2) DEFAULT 1.0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Code templates table
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS code_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        language_id UUID NOT NULL,
        template_name TEXT NOT NULL,
        template_code TEXT NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (language_id) REFERENCES supported_languages (id)
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

export { db, pool };
