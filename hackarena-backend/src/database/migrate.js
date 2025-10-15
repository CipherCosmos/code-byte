import { initializeDatabase } from './init.js';

async function runMigration() {
  try {
    console.log('Starting migration process...');
    await initializeDatabase();
    console.log('Migration completed successfully');

    // Verify users table structure
    console.log('Verifying users table structure...');
    const { db } = await import('./init.js');
    const columns = await db.allAsync(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log('Users table columns:', columns);

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();