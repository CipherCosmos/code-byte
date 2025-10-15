import pkg from 'pg';
const { Pool } = pkg;

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
  connectionTimeoutMillis: 10000, // Increased timeout for debugging
});

async function testConnection() {
  try {
    console.log('Testing PostgreSQL database connection...');

    // Test the connection by running a simple query
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT 1 as test');
      console.log('✅ Database connection successful.');
      console.log('Query result:', result.rows[0]);
    } finally {
      client.release();
    }

    console.log('✅ Connection test passed. PostgreSQL database is accessible.');
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('Connection pool closed.');
  }
}

testConnection();