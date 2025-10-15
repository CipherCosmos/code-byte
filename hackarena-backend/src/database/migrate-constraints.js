import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create PostgreSQL connection pool using the same config as dataSource.ts
const pool = new Pool({
  host: 'pg-2e6b7563-svm-aac5.f.aivencloud.com',
  port: 14244,
  database: 'defaultdb',
  user: 'avnadmin',
  password: process.env.DATABASE_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

async function migrateConstraints() {
  try {
    console.log('Starting constraints migration...');

    const client = await pool.connect();
    try {
      // Ensure NOT NULL constraints for required fields in questions table
      const requiredFields = [
        'game_id',
        'question_order',
        'question_text',
        'question_type',
        'correct_answer'
      ];

      for (const field of requiredFields) {
        const alterQuery = `
          ALTER TABLE questions
          ALTER COLUMN ${field} SET NOT NULL;
        `;

        try {
          await client.query(alterQuery);
          console.log(`✅ Ensured ${field} is NOT NULL`);
        } catch (error) {
          console.log(`NOT NULL constraint for ${field} already exists or failed:`, error.message);
        }
      }

      console.log('Constraints migration completed successfully');

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('Connection pool closed.');
  }
}

migrateConstraints();