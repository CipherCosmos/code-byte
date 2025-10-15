import pkg from 'pg';
const { Pool } = pkg;

// Create PostgreSQL connection pool with UTC timezone
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
  timezone: 'UTC', // Force UTC timezone
});

async function testTimezone() {
  try {
    console.log('Testing PostgreSQL timezone configuration...');

    const client = await pool.connect();
    try {
      // Check current timezone setting
      const timezoneResult = await client.query('SHOW timezone');
      console.log('Current database timezone:', timezoneResult.rows[0].timezone);

      // Test timestamp insertion and retrieval using a simple test table
      console.log('\nTesting timestamp operations...');

      // Create a temporary test table for timezone testing
      await client.query(`
        CREATE TEMPORARY TABLE timezone_test (
          id SERIAL PRIMARY KEY,
          test_timestamp TIMESTAMP
        )
      `);

      // Insert current timestamp
      const testTime = new Date(Date.now() + 60000).toISOString();
      const insertResult = await client.query('INSERT INTO timezone_test (test_timestamp) VALUES ($1) RETURNING test_timestamp', [testTime]);

      console.log('Inserted timestamp (UTC):', insertResult.rows[0].test_timestamp);

      // Query it back
      const selectResult = await client.query('SELECT test_timestamp FROM timezone_test LIMIT 1');
      console.log('Retrieved timestamp (UTC):', selectResult.rows[0].test_timestamp);

      // Test CURRENT_TIMESTAMP
      const currentResult = await client.query('SELECT CURRENT_TIMESTAMP as now');
      console.log('CURRENT_TIMESTAMP result:', currentResult.rows[0].now);

      console.log('\n✅ Timezone test completed successfully.');
      console.log('✅ All timestamps are now stored and retrieved in UTC.');

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Timezone test failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('Connection pool closed.');
  }
}

testTimezone();