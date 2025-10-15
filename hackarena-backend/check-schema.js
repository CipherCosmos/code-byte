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

async function checkQuestionsTableSchema() {
  try {
    console.log('Checking questions table schema...');

    const client = await pool.connect();
    try {
      // Query information_schema for columns in questions table
      const columnsQuery = `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_name = 'questions'
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `;

      const columnsResult = await client.query(columnsQuery);
      console.log('\n📋 Columns in questions table:');
      console.table(columnsResult.rows);

      // Query for constraints
      const constraintsQuery = `
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          cc.check_clause
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.check_constraints cc
          ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'questions'
        AND tc.table_schema = 'public';
      `;

      const constraintsResult = await client.query(constraintsQuery);
      console.log('\n🔒 Constraints on questions table:');
      console.table(constraintsResult.rows);

      // Check if question_type is an enum and list enum values
      const enumQuery = `
        SELECT
          t.typname AS enum_name,
          e.enumlabel AS enum_value
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'question_type_enum'
        ORDER BY e.enumsortorder;
      `;

      const enumResult = await client.query(enumQuery);
      if (enumResult.rows.length > 0) {
        console.log('\n📝 Question type enum values:');
        console.table(enumResult.rows);
      } else {
        console.log('\n📝 No question_type_enum found - using TEXT type');
      }

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Failed to check schema:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('Connection pool closed.');
  }
}

checkQuestionsTableSchema();