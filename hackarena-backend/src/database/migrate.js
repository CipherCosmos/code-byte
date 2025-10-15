import { initializeDatabase } from './init.js';

async function runMigration() {
  try {
    await initializeDatabase();

    // Verify users table structure
    const { db } = await import('./init.js');
    const columns = await db.allAsync(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

runMigration();