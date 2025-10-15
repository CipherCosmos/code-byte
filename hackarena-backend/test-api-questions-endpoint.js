import jwt from 'jsonwebtoken';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:10000/api';
const JWT_SECRET = 'debug-jwt-secret-key-for-development-only';

// Sample question data matching QuestionForm.jsx structure
const sampleQuestionData = {
  questionText: 'What is the output of console.log(2 + 2) in JavaScript?',
  questionType: 'mcq',
  options: ['2', '4', '22', '"4"'],
  correctAnswer: '4',
  hint: 'JavaScript performs arithmetic addition with numbers',
  hintPenalty: 10,
  timeLimit: 60,
  marks: 10,
  difficulty: 'easy',
  explanation: 'JavaScript adds the numbers 2 and 2 to get 4, then console.log outputs this value.',
  evaluationMode: 'mcq'
};

// Function to generate a test JWT token
function generateTestToken(userId = 'test-user-id', email = 'test@example.com') {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Function to create a test user in the database
async function createTestUser() {
  const { db } = await import('./src/database/init.js');
  try {
    // Check if test user already exists
    const existingUser = await db.getAsync('SELECT id FROM users WHERE email = $1', ['test@example.com']);
    if (existingUser) {
      console.log('Test user already exists:', existingUser.id);
      return existingUser.id;
    }

    // Create test user
    const result = await db.runAsync(
      'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id',
      ['test@example.com', 'Test User']
    );
    console.log('Created test user:', result.lastID);
    return result.lastID;
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

// Function to create a test game
async function createTestGame(userId) {
  const { db } = await import('./src/database/init.js');
  try {
    // Check if test game already exists
    const existingGame = await db.getAsync('SELECT id FROM games WHERE game_code = $1', ['TESTGAME']);
    if (existingGame) {
      console.log('Test game already exists:', existingGame.id);
      return existingGame.id;
    }

    // Create test game
    const result = await db.runAsync(
      'INSERT INTO games (title, game_code, organizer_id) VALUES ($1, $2, $3) RETURNING id',
      ['Test Game', 'TESTGAME', userId]
    );
    console.log('Created test game:', result.lastID);
    return result.lastID;
  } catch (error) {
    console.error('Error creating test game:', error);
    throw error;
  }
}

// Function to make the API call
async function testPostQuestionsEndpoint(gameId, questionData, token) {
  const url = `${API_BASE_URL}/games/${gameId}/questions`;

  console.log('🚀 Testing POST /games/:gameId/questions endpoint');
  console.log('📍 URL:', url);
  console.log('🔑 Authorization:', token ? 'Bearer [TOKEN]' : 'None');
  console.log('📦 Request Body:', JSON.stringify(questionData, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(questionData)
    });

    console.log('📊 Response Status:', response.status, response.statusText);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📄 Raw Response:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.log('⚠️ Response is not valid JSON');
      responseData = null;
    }

    // Check response
    if (response.ok) {
      console.log('✅ Request successful!');
      if (responseData) {
        console.log('📋 Response Data:');
        console.log('   - Question ID:', responseData.id);
        console.log('   - Question Text:', responseData.question_text);
        console.log('   - Question Type:', responseData.question_type);
        console.log('   - Options:', responseData.options);
        console.log('   - Correct Answer:', responseData.correct_answer);
        console.log('   - Marks:', responseData.marks);
        console.log('   - Time Limit:', responseData.time_limit);
        console.log('   - Difficulty:', responseData.difficulty);
        console.log('   - Evaluation Mode:', responseData.evaluation_mode);

        // Validate response structure
        const requiredFields = ['id', 'question_text', 'question_type', 'options', 'correct_answer'];
        const missingFields = requiredFields.filter(field => !responseData.hasOwnProperty(field));

        if (missingFields.length > 0) {
          console.log('⚠️ Missing required fields in response:', missingFields);
        } else {
          console.log('✅ All required fields present in response');
        }

        // Validate data integrity
        if (responseData.question_text !== questionData.questionText) {
          console.log('⚠️ Question text mismatch:', {
            sent: questionData.questionText,
            received: responseData.question_text
          });
        }

        if (responseData.question_type !== questionData.questionType) {
          console.log('⚠️ Question type mismatch:', {
            sent: questionData.questionType,
            received: responseData.question_type
          });
        }

        if (JSON.stringify(responseData.options) !== JSON.stringify(questionData.options)) {
          console.log('⚠️ Options mismatch:', {
            sent: questionData.options,
            received: responseData.options
          });
        }

        if (responseData.correct_answer !== questionData.correctAnswer) {
          console.log('⚠️ Correct answer mismatch:', {
            sent: questionData.correctAnswer,
            received: responseData.correct_answer
          });
        }
      }
    } else {
      console.log('❌ Request failed!');
      if (responseData && responseData.error) {
        console.log('🚨 Error Message:', responseData.error);
      }
    }

    return {
      success: response.ok,
      status: response.status,
      data: responseData,
      rawResponse: responseText
    };

  } catch (error) {
    console.error('💥 Network error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test different scenarios
async function runTests() {
  console.log('🧪 Starting API Endpoint Tests for POST /games/:gameId/questions');
  console.log('='.repeat(70));

  // Setup test data
  console.log('\n🔧 Setting up test data...');
  const userId = await createTestUser();
  const gameId = await createTestGame(userId);
  console.log('✅ Test data setup complete');

  // Test 1: Valid request with authentication
  console.log('\n🧪 Test 1: Valid request with proper authentication');
  const token = generateTestToken(userId, 'test@example.com');

  const result1 = await testPostQuestionsEndpoint(gameId, sampleQuestionData, token);

  // Test 2: Missing authentication
  console.log('\n🧪 Test 2: Missing authentication token');
  const result2 = await testPostQuestionsEndpoint(gameId, sampleQuestionData, null);

  // Test 3: Invalid game ID
  console.log('\n🧪 Test 3: Invalid game ID');
  const result3 = await testPostQuestionsEndpoint('invalid-game-id', sampleQuestionData, token);

  // Test 6: Valid request with real game ID
  console.log('\n🧪 Test 6: Valid request with real game ID');
  const result6 = await testPostQuestionsEndpoint(gameId, sampleQuestionData, token);

  // Test 4: Invalid question data
  console.log('\n🧪 Test 4: Invalid question data (missing required fields)');
  const invalidQuestionData = {
    questionType: 'mcq',
    options: ['A', 'B', 'C']
    // Missing questionText and correctAnswer
  };
  const result4 = await testPostQuestionsEndpoint(gameId, invalidQuestionData, token);

  // Test 5: Different question types
  console.log('\n🧪 Test 5: True/False question');
  const trueFalseQuestion = {
    questionText: 'JavaScript is a compiled language.',
    questionType: 'true_false',
    options: ['True', 'False'],
    correctAnswer: 'False',
    marks: 5,
    timeLimit: 30,
    difficulty: 'easy',
    evaluationMode: 'mcq'
  };
  const result5 = await testPostQuestionsEndpoint(gameId, trueFalseQuestion, token);

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('='.repeat(40));

  const results = [result1, result2, result3, result4, result5, result6];
  const testNames = [
    'Valid request with auth',
    'Missing authentication',
    'Invalid game ID',
    'Invalid question data',
    'True/False question',
    'Valid request with real game ID'
  ];

  results.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testNames[index]} (${result.status || 'ERROR'})`);
  });

  const passedTests = results.filter(r => r.success).length;
  console.log(`\n🎯 Overall: ${passedTests}/${results.length} tests passed`);

  if (passedTests === results.length) {
    console.log('🎉 All tests passed! The questions endpoint is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the implementation.');
  }

  console.log('\n🏁 Test suite completed');
}

// Run the tests
runTests().catch(console.error);

export {
  testPostQuestionsEndpoint,
  generateTestToken,
  sampleQuestionData
};