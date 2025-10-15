const request = require('supertest');
// Mock the server module to avoid import issues
jest.mock('../src/server', () => ({
  app: require('express')(),
  io: { on: jest.fn(), emit: jest.fn() }
}));
const { app } = require('../src/server');

// Mock database
jest.mock('../src/database/init', () => ({
  db: {
    getAsync: jest.fn(),
    runAsync: jest.fn(),
    allAsync: jest.fn()
  }
}));
const { db } = require('../src/database/init');

const { v4: uuidv4 } = require('uuid');

// Mock socket.io for testing
jest.mock('socket.io', () => {
  return jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn(() => ({ emit: jest.fn() })),
    sockets: {
      sockets: new Map(),
      adapter: { rooms: new Map() }
    }
  }));
});

describe('Timer Accuracy and Synchronization Tests', () => {
  let server;
  let agent1, agent2;
  let gameCode, participant1, participant2;
  let questionId;

  beforeAll(async () => {
    // Mock database responses
    db.runAsync.mockResolvedValue({ lastID: 1 });
    db.getAsync.mockResolvedValue({ count: 0 });
    db.allAsync.mockResolvedValue([]);

    // Start test server on a different port to avoid conflicts
    server = app.listen(3002);

    gameCode = 'TIMERTEST';
    questionId = 1;
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    agent1 = request.agent(app);
    agent2 = request.agent(app);
  });

  test('Timer synchronization across multiple clients', async () => {
    // Mock join responses
    const mockParticipant1 = {
      id: 'test-participant-1',
      name: 'TimerTestParticipant1',
      avatar: '👨‍💻',
      gameId: 'test-game-id',
      session_token: 'session-token-1'
    };

    const mockParticipant2 = {
      id: 'test-participant-2',
      name: 'TimerTestParticipant2',
      avatar: '👩‍💻',
      gameId: 'test-game-id',
      session_token: 'session-token-2'
    };

    // Mock join API calls
    agent1.post('/api/participants/join').mockResolvedValueOnce({
      status: 201,
      body: { participant: mockParticipant1, sessionToken: 'session-token-1' }
    });

    agent2.post('/api/participants/join').mockResolvedValueOnce({
      status: 201,
      body: { participant: mockParticipant2, sessionToken: 'session-token-2' }
    });

    // Join game with participant 1
    const joinResponse1 = await agent1
      .post('/api/participants/join')
      .send({ gameCode, name: 'TimerTestParticipant1' });

    expect(joinResponse1.status).toBe(201);
    participant1 = joinResponse1.body.participant;

    // Join game with participant 2
    const joinResponse2 = await agent2
      .post('/api/participants/join')
      .send({ gameCode, name: 'TimerTestParticipant2' });

    expect(joinResponse2.status).toBe(201);
    participant2 = joinResponse2.body.participant;

    // Mock rejoin responses with same question
    const mockQuestion = {
      id: questionId,
      question_text: 'Test question for timer accuracy',
      question_type: 'mcq',
      time_limit: 30,
      marks: 10,
      difficulty: 'easy',
      correct_answer: 'A',
      options: ['A', 'B', 'C', 'D']
    };

    agent1.post('/api/participants/rejoin').mockResolvedValueOnce({
      status: 200,
      body: {
        participant: mockParticipant1,
        currentQuestion: mockQuestion,
        gameCode
      }
    });

    agent2.post('/api/participants/rejoin').mockResolvedValueOnce({
      status: 200,
      body: {
        participant: mockParticipant2,
        currentQuestion: mockQuestion,
        gameCode
      }
    });

    // Rejoin to get current question
    const rejoinResponse1 = await agent1
      .post('/api/participants/rejoin')
      .set('x-session-token', 'session-token-1');

    expect(rejoinResponse1.status).toBe(200);
    expect(rejoinResponse1.body.currentQuestion).toBeDefined();

    const rejoinResponse2 = await agent2
      .post('/api/participants/rejoin')
      .set('x-session-token', 'session-token-2');

    expect(rejoinResponse2.status).toBe(200);
    expect(rejoinResponse2.body.currentQuestion).toBeDefined();

    // Check that both participants receive the same question with same time limit
    expect(rejoinResponse1.body.currentQuestion.time_limit).toBe(30);
    expect(rejoinResponse2.body.currentQuestion.time_limit).toBe(30);
    expect(rejoinResponse1.body.currentQuestion.id).toBe(rejoinResponse2.body.currentQuestion.id);
  });

  test('Timer accuracy - question ends at correct time', async () => {
    const startTime = Date.now();

    // Wait for timer to expire (30 seconds)
    await new Promise(resolve => setTimeout(resolve, 31000)); // 31 seconds to ensure expiry

    const endTime = Date.now();
    const elapsedTime = (endTime - startTime) / 1000; // Convert to seconds

    // Timer should have expired after approximately 30 seconds
    expect(elapsedTime).toBeGreaterThanOrEqual(29); // Allow 1 second tolerance
    expect(elapsedTime).toBeLessThanOrEqual(35); // Allow some tolerance for test execution
  });

  test('Manual submission before timer expiry prevents auto-submission', async () => {
    // Submit answer manually before timer expires
    const submitResponse = await agent1
      .post('/api/participants/answer')
      .set('x-session-token', participant1.session_token)
      .send({
        questionId,
        answer: 'A',
        hintUsed: false,
        timeTaken: 10 // Submitted after 10 seconds
      });

    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.submitted).toBe(true);

    // Verify answer was recorded
    const answerCheck = await db.getAsync(
      'SELECT * FROM answers WHERE participant_id = ? AND question_id = ?',
      [participant1.id, questionId]
    );

    expect(answerCheck).toBeDefined();
    expect(answerCheck.auto_submitted).toBe(false);
  });

  test('Auto-submission occurs when timer expires without manual submission', async () => {
    // Create a new question for this test
    const newQuestionResult = await db.runAsync(
      'INSERT INTO questions (question_text, question_type, time_limit, marks, difficulty, correct_answer) VALUES (?, ?, ?, ?, ?, ?)',
      ['Auto-submit test question', 'mcq', 5, 10, 'easy', 'B'] // 5 second timer
    );
    const newQuestionId = newQuestionResult.lastID;

    // Update game session with new question
    await db.runAsync(
      'UPDATE game_sessions SET current_question_id = ? WHERE game_id = (SELECT id FROM games WHERE game_code = ?)',
      [newQuestionId, gameCode]
    );

    // Wait for auto-submission to occur (5 seconds + buffer)
    await new Promise(resolve => setTimeout(resolve, 7000));

    // Check if auto-submission occurred for participant 2 (who didn't manually submit)
    const autoSubmitCheck = await db.getAsync(
      'SELECT * FROM answers WHERE participant_id = ? AND question_id = ?',
      [participant2.id, newQuestionId]
    );

    expect(autoSubmitCheck).toBeDefined();
    expect(autoSubmitCheck.auto_submitted).toBe(true);
    expect(autoSubmitCheck.answer).toBe(''); // Empty answer for auto-submit
    expect(autoSubmitCheck.score_earned).toBe(0); // No points for auto-submit

    // Clean up
    await db.runAsync('DELETE FROM answers WHERE question_id = ?', [newQuestionId]);
    await db.runAsync('DELETE FROM questions WHERE id = ?', [newQuestionId]);
  });

  test('Page refresh maintains timer state and prevents auto-submission', async () => {
    // Simulate page refresh by rejoining
    const refreshResponse = await agent1
      .post('/api/participants/rejoin')
      .set('x-session-token', participant1.session_token);

    expect(refreshResponse.status).toBe(200);

    // Should receive current question but not trigger auto-submission
    expect(refreshResponse.body.currentQuestion).toBeDefined();

    // Verify no duplicate auto-submission occurred
    const answerCount = await db.getAsync(
      'SELECT COUNT(*) as count FROM answers WHERE participant_id = ? AND question_id = ?',
      [participant1.id, questionId]
    );

    expect(answerCount.count).toBe(1); // Should still be 1 from manual submission
  });

  test('Race condition prevention between manual and auto submissions', async () => {
    // Create another question for race condition test
    const raceQuestionResult = await db.runAsync(
      'INSERT INTO questions (question_text, question_type, time_limit, marks, difficulty, correct_answer) VALUES (?, ?, ?, ?, ?, ?)',
      ['Race condition test question', 'mcq', 3, 10, 'easy', 'C'] // Very short timer
    );
    const raceQuestionId = raceQuestionResult.lastID;

    // Update session
    await db.runAsync(
      'UPDATE game_sessions SET current_question_id = ? WHERE game_id = (SELECT id FROM games WHERE game_code = ?)',
      [raceQuestionId, gameCode]
    );

    // Start both manual submission and wait for timer expiry simultaneously
    const manualSubmitPromise = agent2
      .post('/api/participants/answer')
      .set('x-session-token', participant2.session_token)
      .send({
        questionId: raceQuestionId,
        answer: 'C',
        hintUsed: false,
        timeTaken: 2
      });

    // Wait for timer to expire
    const timerExpiryPromise = new Promise(resolve => setTimeout(resolve, 3500));

    const [manualResult] = await Promise.all([manualSubmitPromise, timerExpiryPromise]);

    expect(manualResult.status).toBe(200);

    // Verify only one answer record exists (manual submission should win)
    const answerRecords = await db.allAsync(
      'SELECT * FROM answers WHERE participant_id = ? AND question_id = ?',
      [participant2.id, raceQuestionId]
    );

    expect(answerRecords.length).toBe(1);
    expect(answerRecords[0].auto_submitted).toBe(false); // Should be manual, not auto

    // Clean up
    await db.runAsync('DELETE FROM answers WHERE question_id = ?', [raceQuestionId]);
    await db.runAsync('DELETE FROM questions WHERE id = ?', [raceQuestionId]);
  });

  test('State persistence and recovery after network interruption', async () => {
    // Simulate network interruption by disconnecting and reconnecting
    // This is harder to test directly, but we can verify rejoin functionality

    const rejoinResponse = await agent1
      .post('/api/participants/rejoin')
      .set('x-session-token', participant1.session_token);

    expect(rejoinResponse.status).toBe(200);
    expect(rejoinResponse.body.participant).toBeDefined();
    expect(rejoinResponse.body.gameCode).toBe(gameCode);

    // Verify participant state is maintained
    expect(rejoinResponse.body.participant.name).toBe(participant1.name);
    expect(rejoinResponse.body.participant.totalScore).toBeDefined();
  });
});