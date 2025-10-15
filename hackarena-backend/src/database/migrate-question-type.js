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

async function migrateQuestionType() {
  try {
    const client = await pool.connect();
    try {
      // Check if enum already exists
      const enumExistsQuery = `
        SELECT 1 FROM pg_type WHERE typname = 'question_type_enum';
      `;
      const enumExists = await client.query(enumExistsQuery);

      if (enumExists.rows.length === 0) {
        // Create the enum type
        const createEnumQuery = `
          CREATE TYPE question_type_enum AS ENUM (
            'mcq',
            'multiple_choice_single',
            'true_false',
            'multiple_choice',
            'multiple_answers',
            'code',
            'code_snippet',
            'image',
            'fill_blank',
            'short_answer',
            'crossword',
            'crossword_puzzle',
            'text_input'
          );
        `;
        await client.query(createEnumQuery);
      } else {

        // Get existing enum values
        const existingValuesQuery = `
          SELECT enumlabel FROM pg_enum
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'question_type_enum')
          ORDER BY enumsortorder;
        `;
        const existingValues = await client.query(existingValuesQuery);
        const existingLabels = existingValues.rows.map(row => row.enumlabel);

        const requiredValues = [
          'mcq',
          'multiple_choice_single',
          'true_false',
          'multiple_choice',
          'multiple_answers',
          'code',
          'code_snippet',
          'image',
          'fill_blank',
          'short_answer',
          'crossword',
          'crossword_puzzle',
          'text_input'
        ];

        const missingValues = requiredValues.filter(val => !existingLabels.includes(val));

        if (missingValues.length > 0) {
          for (const value of missingValues) {
            const addValueQuery = `ALTER TYPE question_type_enum ADD VALUE '${value}';`;
            await client.query(addValueQuery);
          }
        }
      }

      // Alter the column to use the enum type
      const alterColumnQuery = `
        ALTER TABLE questions
        ALTER COLUMN question_type TYPE question_type_enum
        USING question_type::question_type_enum;
      `;

      try {
        await client.query(alterColumnQuery);
      } catch (alterError) {
      }

      // Ensure NOT NULL constraint
      const notNullQuery = `
        ALTER TABLE questions
        ALTER COLUMN question_type SET NOT NULL;
      `;

      try {
        await client.query(notNullQuery);
      } catch (notNullError) {
      }

    } finally {
      client.release();
    }

  } catch (error) {
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateQuestionType();