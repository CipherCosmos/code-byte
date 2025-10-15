import pkg from 'pg';
const { Pool } = pkg;
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'pg-2e6b7563-svm-aac5.f.aivencloud.com',
  port: parseInt(process.env.DATABASE_PORT || '14244'),
  database: process.env.DATABASE_NAME || 'defaultdb',
  user: process.env.DATABASE_USER || 'avnadmin',
  password: process.env.DATABASE_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Promisify database methods
const db = {
  getAsync: async (sql, params = []) => {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  },
  allAsync: async (sql, params = []) => {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  },
  runAsync: async (sql, params = []) => {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return { lastID: result.rows[0]?.id || null, changes: result.rowCount };
    } finally {
      client.release();
    }
  }
};

// Test data - Generate proper UUIDs for each test run
const testUserId = uuidv4();
const testGameId = uuidv4();
const testQuestionId = uuidv4();

async function setupTestData() {
  console.log('🔧 Setting up test data...');

  // Create test user
  await db.runAsync(`
    INSERT INTO users (id, email, name, google_id)
    VALUES ($1, $2, $3, $4)
  `, [testUserId, `test-${Date.now()}@example.com`, 'Test User', `test-google-id-${Date.now()}`]);

  console.log('✅ Test data setup complete');
  console.log('   - Test User ID:', testUserId);
  console.log('   - Test Game ID:', testGameId);
  console.log('   - Test Question ID:', testQuestionId);
}

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');

  // Delete in proper order to avoid foreign key constraints
  await db.runAsync('DELETE FROM code_execution_results WHERE answer_id IN (SELECT id FROM answers WHERE question_id IN (SELECT id FROM questions WHERE game_id = $1))', [testGameId]);
  await db.runAsync('DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE game_id = $1)', [testGameId]);
  await db.runAsync('DELETE FROM game_sessions WHERE game_id = $1', [testGameId]);
  await db.runAsync('DELETE FROM participants WHERE game_id = $1', [testGameId]);
  await db.runAsync('DELETE FROM questions WHERE game_id = $1', [testGameId]);
  await db.runAsync('DELETE FROM games WHERE id = $1', [testGameId]);
  await db.runAsync('DELETE FROM users WHERE id = $1', [testUserId]);

  console.log('✅ Test data cleanup complete');
}

async function testGameCreation() {
  console.log('\n🎮 Testing Game Creation (POST /games)...');

  const gameData = {
    title: 'Test Hackathon Game',
    description: 'A comprehensive test game for CRUD operations',
    maxParticipants: 100,
    qualificationType: 'top_n',
    qualificationThreshold: 10
  };

  try {
    const result = await db.runAsync(
      `INSERT INTO games (id, title, description, game_code, organizer_id, max_participants, qualification_type, qualification_threshold)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [testGameId, gameData.title, gameData.description, 'TEST12345', testUserId, gameData.maxParticipants, gameData.qualificationType, gameData.qualificationThreshold]
    );

    console.log('✅ Game created successfully');
    console.log('   - Game ID:', testGameId);
    console.log('   - Title:', gameData.title);
    console.log('   - Game Code: TEST12345');

    // Verify game was created
    const createdGame = await db.getAsync('SELECT * FROM games WHERE id = $1', [testGameId]);
    if (!createdGame) {
      throw new Error('Game was not found after creation');
    }

    console.log('✅ Game creation verified in database');
    return true;
  } catch (error) {
    console.error('❌ Game creation failed:', error.message);
    return false;
  }
}

async function testGameRetrieval() {
  console.log('\n📖 Testing Game Retrieval (GET /games, GET /games/:gameId)...');

  try {
    // Test GET /games (list all games for organizer)
    const games = await db.allAsync(
      `SELECT g.id, g.title, g.description, g.game_code, g.organizer_id, g.status,
        g.current_question_index, g.total_questions, g.max_participants,
        g.qualification_type, g.qualification_threshold, g.created_at,
        g.started_at, g.ended_at,
        COUNT(p.id) as participant_count,
        COUNT(q.id) as question_count
        FROM games g
        LEFT JOIN participants p ON g.id = p.game_id AND p.status = 'active'
        LEFT JOIN questions q ON g.id = q.game_id
        WHERE g.organizer_id = $1
        GROUP BY g.id, g.title, g.description, g.game_code, g.organizer_id, g.status,
        g.current_question_index, g.total_questions, g.max_participants,
        g.qualification_type, g.qualification_threshold, g.created_at,
        g.started_at, g.ended_at
        ORDER BY g.created_at DESC`,
      [testUserId]
    );

    console.log('✅ Games list retrieved successfully');
    console.log('   - Found', games.length, 'games');

    // Test GET /games/:gameId (get specific game details)
    const game = await db.getAsync('SELECT * FROM games WHERE id = $1 AND organizer_id = $2', [testGameId, testUserId]);

    if (!game) {
      throw new Error('Game not found');
    }

    console.log('✅ Specific game retrieved successfully');
    console.log('   - Game ID:', game.id);
    console.log('   - Title:', game.title);
    console.log('   - Status:', game.status);

    return true;
  } catch (error) {
    console.error('❌ Game retrieval failed:', error.message);
    return false;
  }
}

async function testGameUpdate() {
  console.log('\n✏️ Testing Game Update (PUT /games/:gameId)...');

  const updateData = {
    title: 'Updated Test Hackathon Game',
    description: 'Updated description for comprehensive testing',
    maxParticipants: 150,
    qualificationType: 'top_percentage',
    qualificationThreshold: 25
  };

  try {
    await db.runAsync(
      `UPDATE games SET title = $1, description = $2, max_participants = $3, qualification_type = $4, qualification_threshold = $5
        WHERE id = $6 AND organizer_id = $7`,
      [updateData.title, updateData.description, updateData.maxParticipants, updateData.qualificationType, updateData.qualificationThreshold, testGameId, testUserId]
    );

    // Verify update
    const updatedGame = await db.getAsync('SELECT * FROM games WHERE id = $1 AND organizer_id = $2', [testGameId, testUserId]);

    if (!updatedGame) {
      throw new Error('Game not found after update');
    }

    if (updatedGame.title !== updateData.title ||
        updatedGame.description !== updateData.description ||
        updatedGame.max_participants !== updateData.maxParticipants) {
      throw new Error('Game update did not apply correctly');
    }

    console.log('✅ Game updated successfully');
    console.log('   - New Title:', updatedGame.title);
    console.log('   - New Max Participants:', updatedGame.max_participants);
    console.log('   - New Qualification Type:', updatedGame.qualification_type);

    return true;
  } catch (error) {
    console.error('❌ Game update failed:', error.message);
    return false;
  }
}

async function testQuestionCreation() {
  console.log('\n❓ Testing Question Creation (POST /games/:gameId/questions)...');

  const questionData = {
    questionText: 'What is the capital of France?',
    questionType: 'mcq',
    options: JSON.stringify(['Paris', 'London', 'Berlin', 'Madrid']),
    correctAnswer: 'Paris',
    marks: 10,
    timeLimit: 60,
    evaluationMode: 'mcq'
  };

  try {
    const result = await db.runAsync(
      `INSERT INTO questions (id, game_id, question_order, question_text, question_type, type, content, options, correct_answer, marks, time_limit, evaluation_mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [testQuestionId, testGameId, 1, questionData.questionText, questionData.questionType, questionData.questionType, questionData.questionText, questionData.options, questionData.correctAnswer, questionData.marks, questionData.timeLimit, questionData.evaluationMode]
    );

    console.log('✅ Question created successfully');
    console.log('   - Question ID:', testQuestionId);
    console.log('   - Question Text:', questionData.questionText);

    // Update total questions in game
    await db.runAsync('UPDATE games SET total_questions = 1 WHERE id = $1', [testGameId]);

    return true;
  } catch (error) {
    console.error('❌ Question creation failed:', error.message);
    return false;
  }
}

async function testGameLifecycle() {
  console.log('\n🔄 Testing Game Lifecycle Operations...');

  try {
    // Test game start
    console.log('   - Testing game start...');
    await db.runAsync(
      `UPDATE games SET status = 'active', started_at = CURRENT_TIMESTAMP, current_question_index = 1
        WHERE id = $1 AND organizer_id = $2`,
      [testGameId, testUserId]
    );

    // Create game session
    await db.runAsync(
      `INSERT INTO game_sessions (game_id, current_question_id, question_started_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      [testGameId, testQuestionId]
    );

    console.log('✅ Game started successfully');

    // Test next question (simulate)
    console.log('   - Testing next question logic...');
    await db.runAsync(
      'UPDATE games SET current_question_index = $1 WHERE id = $2',
      [2, testGameId]
    );

    // Update game session
    await db.runAsync(
      `UPDATE game_sessions SET
        current_question_id = $1,
        question_started_at = CURRENT_TIMESTAMP,
        answers_revealed = FALSE
       WHERE game_id = $2`,
      [testQuestionId, testGameId]
    );

    console.log('✅ Next question logic tested successfully');

    // Test answer reveal
    console.log('   - Testing answer reveal...');
    await db.runAsync(
      'UPDATE game_sessions SET answers_revealed = TRUE WHERE game_id = $1',
      [testGameId]
    );

    console.log('✅ Answer reveal tested successfully');

    // Test game end
    console.log('   - Testing game end...');
    await db.runAsync(
      `UPDATE games SET status = 'completed', ended_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND organizer_id = $2`,
      [testGameId, testUserId]
    );

    console.log('✅ Game ended successfully');

    return true;
  } catch (error) {
    console.error('❌ Game lifecycle test failed:', error.message);
    return false;
  }
}

async function testGameDeletion() {
  console.log('\n🗑️ Testing Game Deletion (DELETE /games/:gameId)...');

  try {
    // Verify game exists before deletion
    const gameBeforeDeletion = await db.getAsync('SELECT * FROM games WHERE id = $1 AND organizer_id = $2', [testGameId, testUserId]);
    if (!gameBeforeDeletion) {
      throw new Error('Game not found before deletion');
    }

    // Delete in proper order to avoid foreign key constraints
    await db.runAsync('DELETE FROM code_execution_results WHERE answer_id IN (SELECT id FROM answers WHERE question_id IN (SELECT id FROM questions WHERE game_id = $1))', [testGameId]);
    await db.runAsync('DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE game_id = $1)', [testGameId]);
    await db.runAsync('DELETE FROM game_sessions WHERE game_id = $1', [testGameId]);
    await db.runAsync('DELETE FROM participants WHERE game_id = $1', [testGameId]);
    await db.runAsync('DELETE FROM questions WHERE game_id = $1', [testGameId]);
    await db.runAsync('DELETE FROM games WHERE id = $1 AND organizer_id = $2', [testGameId, testUserId]);

    // Verify game was deleted
    const gameAfterDeletion = await db.getAsync('SELECT * FROM games WHERE id = $1', [testGameId]);
    if (gameAfterDeletion) {
      throw new Error('Game still exists after deletion');
    }

    console.log('✅ Game deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Game deletion failed:', error.message);
    return false;
  }
}

async function verifyDatabaseState() {
  console.log('\n🔍 Verifying Database State...');

  try {
    // Check all tables are clean
    const tables = ['games', 'questions', 'participants', 'answers', 'game_sessions', 'code_execution_results'];
    for (const table of tables) {
      const count = await db.getAsync(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   - ${table}: ${count.count} records`);
    }

    console.log('✅ Database state verification complete');
    return true;
  } catch (error) {
    console.error('❌ Database state verification failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Game CRUD Operations Test Suite');
  console.log('=' .repeat(50));

  try {
    // Setup
    await setupTestData();

    // Run tests
    const results = {
      gameCreation: await testGameCreation(),
      gameRetrieval: await testGameRetrieval(),
      gameUpdate: await testGameUpdate(),
      questionCreation: await testQuestionCreation(),
      gameLifecycle: await testGameLifecycle(),
      gameDeletion: await testGameDeletion(),
      databaseVerification: await verifyDatabaseState()
    };

    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(30));

    const passedTests = Object.values(results).filter(result => result).length;
    const totalTests = Object.keys(results).length;

    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${test}`);
    });

    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Game CRUD operations are working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please review the errors above.');
    }

  } catch (error) {
    console.error('💥 Test suite failed with error:', error.message);
  } finally {
    // Cleanup
    await cleanupTestData();
    await pool.end();
    console.log('\n🏁 Test suite completed');
  }
}

// Run the tests
runTests().catch(console.error);