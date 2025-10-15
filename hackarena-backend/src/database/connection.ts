import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca: fs.readFileSync(path.join(__dirname, '../database/aiven-ca.pem')),
    rejectUnauthorized: false,
  },
});

pool.connect()
  .then(() => {
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1); // Exit the process if the database connection fails
  });

export default pool;
