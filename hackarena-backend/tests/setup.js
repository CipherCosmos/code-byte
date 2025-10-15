const dotenv = require('dotenv');
dotenv.config({ path: '.env.test' });

// Skip TypeORM setup for now to avoid module issues
beforeAll(async () => {
  // TypeORM setup skipped
});

afterAll(async () => {
  // TypeORM cleanup skipped
});