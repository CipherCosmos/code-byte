import { initializeDatabase } from './init.js';

async function runProductionMigration() {
  try {
    console.log('🚀 Starting production database migration...');

    // Set production environment
    process.env.NODE_ENV = 'production';

    // Validate required environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'FRONTEND_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('✅ Environment variables validated');

    // Initialize database with production settings
    await initializeDatabase();

    console.log('✅ Production database migration completed successfully');

    // Run health check
    const { db } = await import('./init.js');
    const healthCheck = await db.getAsync('SELECT 1 as status');
    if (healthCheck.status === 1) {
      console.log('✅ Database health check passed');
    } else {
      throw new Error('Database health check failed');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Production migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

runProductionMigration();