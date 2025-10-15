import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/init.js';
import { authenticateParticipant } from '../middleware/auth.js';
import CodeExecutionService from '../services/codeExecution.js';

// Time decay function
function calculateTimeDecayBonus(timeTaken, timeLimit, decayFactor = 0.1) {
  if (!timeLimit || timeTaken >= timeLimit) return 0;

  // Exponential decay: bonus = base_marks * e^(-decay_factor * (time_taken / time_limit))
  const normalizedTime = timeTaken / timeLimit;
  const bonusMultiplier = Math.exp(-decayFactor * normalizedTime);

  return bonusMultiplier;
}

// Partial marking function
function calculatePartialScore(userAnswer, correctAnswer, questionType, partialSettings, question = null) {
  if (!partialSettings) return 0;

  try {
    const settings = JSON.parse(partialSettings);

    if (questionType === 'fill_blank' || questionType === 'mcq') {
      // For text-based questions, check for partial matches
      const userWords = userAnswer.toLowerCase().split(/\s+/);
      const correctWords = correctAnswer.toLowerCase().split(/\s+/);

      let matchingWords = 0;
      for (const word of userWords) {
        if (correctWords.includes(word)) {
          matchingWords++;
        }
      }

      const accuracy = matchingWords / correctWords.length;
      return settings.partialPercentage ? (accuracy * settings.maxPartialScore) : 0;
    } else if (questionType === 'code') {
      // Enhanced partial scoring for code questions using CodeExecutionService
      const language = question.programming_language || 'javascript';
      const evaluationMode = question.evaluation_mode || 'mcq';

      // Use the new partial scoring algorithm
      return CodeExecutionService.calculatePartialScore(userAnswer, correctAnswer, null, language, evaluationMode);
    }

    return 0;
  } catch (error) {
    return 0;
  }
}

const router = express.Router();

// Code evaluation functions
async function evaluateCodeSemantic(userCode, correctCode, aiSettings, language = 'javascript', userId = null) {
  // Enhanced semantic checking using the new CodeExecutionService
  if (!userCode || !correctCode) return false;

  try {
    // Rate limiting check for semantic analysis
    if (userId && !CodeExecutionService.rateLimiter.isAllowed(userId)) {
      return false;
    }

    // Use the semantic analyzer from CodeExecutionService
    const analysis = CodeExecutionService.analyzeCode(userCode, language, correctCode);

    // Determine if code passes semantic evaluation
    const semanticScore = (analysis.structureScore + analysis.keywordScore + analysis.similarityScore) / 3;

    // Pass if semantic score is above threshold (6 out of 10)
    return semanticScore >= 6;

  } catch (error) {
    // Fallback to basic checks
    const userCodeNormalized = userCode.toLowerCase().trim();
    const correctCodeNormalized = correctCode.toLowerCase().trim();

    if (userCodeNormalized === correctCodeNormalized) return true;

    const checks = [
      () => {
        const keywords = ['function', 'def', 'class', 'if', 'for', 'while', 'return'];
        const userHasKeywords = keywords.some(kw => userCodeNormalized.includes(kw));
        const correctHasKeywords = keywords.some(kw => correctCodeNormalized.includes(kw));
        return userHasKeywords === correctHasKeywords;
      },
      () => {
        const lengthRatio = userCodeNormalized.length / correctCodeNormalized.length;
        return lengthRatio > 0.5 && lengthRatio < 2.0;
      }
    ];

    const passedChecks = checks.filter(check => check()).length;
    return passedChecks >= 1;
  }
}

async function evaluateCodeWithTestCases(userCode, testCasesJson, correctCode, language = 'javascript', userId = null) {
  // Enhanced test case validation using the new CodeExecutionService
  if (!userCode || !testCasesJson) return false;

  try {
    const testCases = JSON.parse(testCasesJson);
    if (!Array.isArray(testCases) || testCases.length === 0) return false;

    // Execute code against all test cases with rate limiting
    const testResults = await CodeExecutionService.executeTestCases(userCode, language, testCases, userId);

    // Calculate success rate
    const passedTests = testResults.filter(result => result.success).length;
    const totalTests = testResults.length;
    const passRate = passedTests / totalTests;

    // Return true if at least 80% tests pass
    return passRate >= 0.8;

  } catch (error) {
    return false;
  }
}

function evaluateCrosswordAnswer(userAnswer, crosswordGrid, crosswordClues, crosswordSize) {
  // Validate crossword answer
  if (!userAnswer || !crosswordGrid || !crosswordClues || !crosswordSize) return false;

  try {
    const grid = JSON.parse(crosswordGrid);
    const clues = JSON.parse(crosswordClues);
    const size = JSON.parse(crosswordSize); // { rows: number, cols: number }

    // Parse user answer - expect format like "1A:WORD,2D:WORD,..."
    const userEntries = {};
    const entries = userAnswer.split(',').map(entry => entry.trim());

    for (const entry of entries) {
      const [clueNum, word] = entry.split(':');
      if (clueNum && word) {
        userEntries[clueNum.toUpperCase()] = word.toUpperCase().trim();
      }
    }

    // Check if all required clues are filled
    let correctCount = 0;
    let totalClues = 0;

    for (const [clueNum, clueData] of Object.entries(clues)) {
      totalClues++;
      const userWord = userEntries[clueNum];
      if (userWord && userWord === clueData.word.toUpperCase()) {
        correctCount++;
      }
    }

    // Consider it correct if 80% or more answers are correct
    return correctCount >= totalClues * 0.8;

  } catch (error) {
    return false;
  }
}

// Tech-themed avatars
const techAvatars = [
  '👨‍💻', '👩‍💻', '🤖', '🦾', '🔬', '⚡', '🚀', '💻', '📱', '🖥️',
  '⌨️', '🖱️', '💾', '💿', '📟', '📺', '🔌', '🔋', '💡', '🔧'
];

// Join game
router.post('/join', async (req, res) => {
  try {
    const { gameCode, name } = req.body;

    if (!gameCode || !name) {
      return res.status(400).json({ error: 'Game code and name are required' });
    }

    // Find game
    const game = await db.getAsync(
      'SELECT * FROM games WHERE game_code = $1',
      [gameCode.toUpperCase()]
    );

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Check if game has started and no new participants allowed
    if (game.status === 'active' || game.status === 'paused') {
      return res.status(400).json({ error: 'Game has already started. No new participants allowed.' });
    }

    if (game.status === 'completed') {
      return res.status(400).json({ error: 'Game has ended' });
    }

    // Check if participant already exists (prevent duplicates)
    const existingParticipant = await db.getAsync(
      'SELECT * FROM participants WHERE game_id = $1 AND name = $2 AND status = $3',
      [game.id, name, 'active']
    );

    if (existingParticipant) {
      return res.status(400).json({ error: 'Participant with this name already exists' });
    }

    // Check participant limit
    const participantCount = await db.getAsync(
      'SELECT COUNT(*) as count FROM participants WHERE game_id = $1 AND status = $2',
      [game.id, 'active']
    );

    if (participantCount.count >= game.max_participants) {
      return res.status(400).json({ error: 'Game is full' });
    }

    // Create participant
    const sessionToken = uuidv4();
    const avatar = techAvatars[Math.floor(Math.random() * techAvatars.length)];

    const result = await db.runAsync(
      `INSERT INTO participants (game_id, name, avatar, session_token)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [game.id, name, avatar, sessionToken]
    );

    const participant = await db.getAsync(
      'SELECT * FROM participants WHERE id = $1',
      [result.lastID]
    );

    res.status(201).json({
      participant: {
        id: participant.id,
        name: participant.name,
        avatar: participant.avatar,
        gameId: game.id,
        gameTitle: game.title,
        gameStatus: game.status
      },
      sessionToken,
      gameCode: game.game_code
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join game' });
  }
});

// Rejoin game (for network reconnection)
router.post('/rejoin', authenticateParticipant, async (req, res) => {
  try {
    const participant = req.participant;


    const game = await db.getAsync(
      'SELECT * FROM games WHERE id = $1',
      [participant.game_id]
    );

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get current game state
    let currentQuestion = null;
    let answersRevealed = false;
    if (game.status === 'active') {
      const session = await db.getAsync(
        `SELECT gs.*, q.* FROM game_sessions gs
         JOIN questions q ON gs.current_question_id = q.id
         WHERE gs.game_id = $1`,
        [game.id]
      );

      if (session) {
        answersRevealed = session.answers_revealed;

        // Always send current question for active games, regardless of reveal status
        // Check if participant already answered this question
        const existingAnswer = await db.getAsync(
          'SELECT * FROM answers WHERE participant_id = $1 AND question_id = $2',
          [participant.id, session.current_question_id]
        );


        // CRITICAL FIX: Always send current question for active games to ensure participants
        // who rejoin during an active question immediately receive it, regardless of answer status
        // Only skip if answers are revealed AND participant has already answered
        if (!answersRevealed || !existingAnswer) {

          // Safe JSON parsing for question options (handles arrays, JSON strings, and comma-separated strings)
          let parsedOptions = [];
          try {
            if (session.options) {
              // Check if already an array (some database drivers return JSON as parsed objects)
              if (Array.isArray(session.options)) {
                parsedOptions = [...session.options];
              } else if (typeof session.options === 'string') {
                // Try to parse as JSON first
                parsedOptions = JSON.parse(session.options);
                if (!Array.isArray(parsedOptions)) {
                  // If it's not an array, treat as comma-separated string
                  parsedOptions = session.options.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
                }
              } else {
                parsedOptions = [];
              }
            }
          } catch (parseError) {
            // If JSON parsing fails, treat as comma-separated string
            if (typeof session.options === 'string') {
              parsedOptions = session.options.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
            } else {
              parsedOptions = [];
            }
          }


          currentQuestion = {
            ...session,
            options: parsedOptions
          };
        } else {
        }
      }
    }

    const responseData = {
      participant: {
        id: participant.id,
        name: participant.name,
        avatar: participant.avatar,
        totalScore: participant.total_score,
        currentRank: participant.current_rank,
        gameId: game.id,
        gameTitle: game.title,
        gameStatus: game.status
      },
      currentQuestion,
      gameCode: game.game_code
    };


    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to rejoin game' });
  }
});

// Submit answer
router.post('/answer', authenticateParticipant, async (req, res) => {
  try {

    let { questionId, answer, hintUsed, timeTaken, autoSubmit } = req.body;


    // Security: Validate input size and content
    if (answer && answer.length > 10000) {
      return res.status(400).json({ error: 'Answer too large' });
    }

    // Security: Basic input sanitization for code
    if (typeof answer === 'string') {
      // Check for potentially dangerous patterns
      const dangerousPatterns = [
        /require\s*\(\s*['"`]child_process['"`]\s*\)/i,
        /require\s*\(\s*['"`]fs['"`]\s*\)/i,
        /exec\s*\(/i,
        /spawn\s*\(/i,
        /eval\s*\(/i,
        /Function\s*\(/i
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(answer)) {
          console.warn('Potentially dangerous code detected from participant:', req.participant?.id);
          // Log security event but don't block - sandboxing will handle it
        }
      }
    }
    const participant = req.participant;

    // Validate required fields - allow null answer for auto-submitted responses
    console.log('🔍 DEBUG: Validating required fields...');
    const isAutoSubmit = autoSubmit === true || autoSubmit === 'true';
    if (!questionId || (!isAutoSubmit && answer == null) || hintUsed === undefined || timeTaken === undefined) {
      console.log('🔍 DEBUG: Missing required fields:', { questionId, answer, hintUsed, timeTaken, isAutoSubmit });
      return res.status(400).json({
        error: 'Missing required fields: questionId, answer (unless auto-submitted), hintUsed, timeTaken are all required'
      });
    }

    console.log('🔍 DEBUG: Required fields validation passed');

    // Check if already answered - prevent duplicate submissions
    console.log('🔍 DEBUG: Checking for existing answer...');
    const existingAnswer = await db.getAsync(
      'SELECT id, is_correct, score_earned FROM answers WHERE participant_id = $1 AND question_id = $2',
      [participant.id, questionId]
    );

    console.log('🔍 DEBUG: Existing answer check result:', !!existingAnswer);
    if (existingAnswer) {
      console.log('🔍 DEBUG: Participant already answered, rejecting submission');
      return res.status(409).json({
        error: 'Already answered this question',
        message: 'You have already submitted an answer for this question. Only the first submission counts for scoring.'
      });
    }

    // Ensure empty strings are preserved as empty strings, not converted to null
    // For auto-submitted answers, always use empty string to prevent null constraint violations
    // Always convert null/undefined to empty string to prevent database constraint violations
    const finalAnswer = (answer == null || isAutoSubmit) ? '' : String(answer).trim();
    console.log('🔍 DEBUG: Final answer after processing:', finalAnswer?.substring(0, 100) || 'empty string');



    // Get question details
    console.log('🔍 DEBUG: Fetching question details for ID:', questionId);
    const question = await db.getAsync(
      'SELECT * FROM questions WHERE id = $1',
      [questionId]
    );

    console.log('🔍 DEBUG: Question fetch result:', !!question);
    if (!question) {
      console.log('🔍 DEBUG: Question not found, rejecting submission');
      return res.status(404).json({ error: 'Question not found' });
    }
    console.log('🔍 DEBUG: Question details:', { id: question.id, type: question.question_type, evaluation_mode: question.evaluation_mode });

    // Verify question is still active (no server-side time checking)
    const session = await db.getAsync(
      'SELECT * FROM game_sessions WHERE current_question_id = $1',
      [questionId]
    );

    if (!session) {
      return res.status(400).json({ error: 'Question is not currently active' });
    }

    // Calculate score with enhanced features
    let isCorrect = false;
    let scoreEarned = 0;
    let timeBonus = 0;
    let partialScore = 0;
    let codeQualityScore = 0;
    let performanceScore = 0;
    let correctnessScore = 0;
    let executionResults = null;
    let evaluationMode = question.evaluation_mode || 'mcq';
    let executionTimeMs = 0;
    let memoryUsedKb = 0;
    let testCasesPassed = 0;
    let totalTestCases = 0;

    const language = question.programming_language || 'javascript';

    if (question.question_type === 'mcq') {
      isCorrect = finalAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
      correctnessScore = isCorrect ? 50 : 0; // Base score: 50 points
    } else if (question.question_type === 'fill_blank') {
      isCorrect = finalAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
      correctnessScore = isCorrect ? 50 : 0; // Base score: 50 points
    } else if (question.question_type === 'image') {
      // For image-based questions, answer is typically a text description or identification
      isCorrect = finalAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
      correctnessScore = isCorrect ? 50 : 0; // Base score: 50 points
    } else if (question.question_type === 'crossword') {
      // Validate crossword answers
      isCorrect = evaluateCrosswordAnswer(finalAnswer, question.crossword_grid, question.crossword_clues, question.crossword_size);
      correctnessScore = isCorrect ? 50 : 0; // Base score: 50 points
    } else if (question.question_type === 'code') {
      // Enhanced code question evaluation with detailed scoring
      try {
        if (evaluationMode === 'mcq') {
          // Auto-check against key
          isCorrect = finalAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
          correctnessScore = isCorrect ? 50 : 0; // Base score: 50 points
        } else if (evaluationMode === 'semantic') {
          // AI-based semantic validation with detailed analysis
          isCorrect = await evaluateCodeSemantic(finalAnswer, question.correct_answer, question.ai_validation_settings, language, participant.id);
          const analysis = CodeExecutionService.analyzeCode(finalAnswer, language, question.correct_answer);

          correctnessScore = (analysis.structureScore + analysis.keywordScore + analysis.similarityScore) / 3;
          codeQualityScore = analysis.complexityScore;
          performanceScore = 0; // Not applicable for semantic evaluation
          isCorrect = correctnessScore >= 30; // Pass threshold adjusted for 50-point scale

          // Ensure scores don't exceed maximum
          correctnessScore = Math.min(correctnessScore, 50);
          codeQualityScore = Math.min(codeQualityScore, 50);
        } else if (evaluationMode === 'compiler') {
          // Test case validation with detailed metrics
          const testResults = await CodeExecutionService.executeTestCases(finalAnswer, language, JSON.parse(question.test_cases || '[]'), participant.id);
          executionResults = JSON.stringify(testResults);

          testCasesPassed = testResults.filter(r => r.success).length;
          totalTestCases = testResults.length;
          const passRate = totalTestCases > 0 ? testCasesPassed / totalTestCases : 0;

          // Calculate metrics
          executionTimeMs = testResults.reduce((sum, r) => sum + (r.executionTime || 0), 0);
          memoryUsedKb = testResults.reduce((sum, r) => sum + (r.memoryUsage || 0), 0) / 1024;

          correctnessScore = passRate * 50; // Base score: up to 50 points
          performanceScore = Math.max(0, 50 - (executionTimeMs / 1000)); // Penalize slow execution
          codeQualityScore = CodeExecutionService.calculatePartialScore(finalAnswer, question.correct_answer, testResults, language, evaluationMode);

          // Ensure scores don't exceed maximum
          correctnessScore = Math.min(correctnessScore, 50);
          performanceScore = Math.min(performanceScore, 50);
          codeQualityScore = Math.min(codeQualityScore, 50);

          isCorrect = passRate >= 0.8; // 80% pass rate required
        } else if (evaluationMode === 'bugfix') {
          // Bug fix validation with detailed analysis
          const validation = await CodeExecutionService.validateBugFix(question.correct_answer || '', finalAnswer, question.test_cases || '[]', participant.id);
          executionResults = JSON.stringify(validation);

          correctnessScore = (validation.fixesApplied ? 25 : 0) + (validation.testsPass ? 25 : 0); // Base score: up to 50 points
          codeQualityScore = validation.improvementScore;
          performanceScore = 0; // Not measured for bug fixes
          testCasesPassed = validation.testsPass ? 1 : 0;
          totalTestCases = 1;

          isCorrect = validation.fixesApplied && validation.testsPass;
        } else {
          // Default to simple text comparison
          isCorrect = finalAnswer.toLowerCase().includes(question.correct_answer.toLowerCase());
          correctnessScore = isCorrect ? 50 : 0; // Base score: 50 points
        }

        // Handle execution failures and timeouts
        if (executionResults && JSON.parse(executionResults).some(r => r.error && r.error.includes('timeout'))) {
          performanceScore = Math.max(0, performanceScore - 2); // Penalty for timeouts
          correctnessScore = Math.max(0, correctnessScore - 1); // Minor penalty for timeouts
        }

      } catch (error) {
        console.error('Code evaluation error:', error);
        // On evaluation failure, fall back to partial scoring
        partialScore = calculatePartialScore(finalAnswer, question.correct_answer, question.question_type, question.partial_marking_settings, question);
        correctnessScore = partialScore;
        isCorrect = false;
      }
    } else {
      isCorrect = finalAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
      correctnessScore = isCorrect ? 50 : 0; // Base score: 50 points
    }

    // Calculate time decay bonus (up to 50 points)
    let timeDecayBonus = 0;

    if (isCorrect && !autoSubmit) {
      // Check if submission time is within question time limit
      if (timeTaken <= question.time_limit) {
        // Calculate time decay bonus: up to 50 points based on speed
        const decayFactor = question.time_decay_enabled ? question.time_decay_factor || 0.1 : 0;
        if (decayFactor > 0) {
          const normalizedTime = timeTaken / question.time_limit;
          timeDecayBonus = 50 * Math.exp(-decayFactor * normalizedTime); // Up to 50 points for time decay
          scoreEarned = correctnessScore + timeDecayBonus;
          console.log('⏰ Time decay calculation:', {
            timeTaken,
            timeLimit: question.time_limit,
            normalizedTime,
            decayFactor,
            timeDecayBonus,
            baseScore: correctnessScore,
            finalScore: scoreEarned
          });
        } else {
          scoreEarned = correctnessScore + 50; // Full time bonus if no decay
          timeDecayBonus = 50;
        }
      } else {
        // Time limit exceeded - only base points if correct
        scoreEarned = correctnessScore;
        timeDecayBonus = 0;
        console.log('⏰ Time limit exceeded:', {
          timeTaken,
          timeLimit: question.time_limit,
          scoreEarned: correctnessScore
        });
      }
    } else if (autoSubmit) {
      // Auto-submitted answers get no points and are marked incorrect
      scoreEarned = 0;
      isCorrect = false; // Override correctness for auto-submitted answers
      timeDecayBonus = 0;
      console.log('⏰ Auto-submit: No points awarded, answer marked incorrect');
    } else {
      // Incorrect answers get no points
      scoreEarned = 0;
      timeDecayBonus = 0;
    }

    // Ensure score doesn't exceed 100 points total
    scoreEarned = Math.min(scoreEarned, 100);

    // Hint penalty: 10 points deduction
    if (hintUsed) {
      scoreEarned = Math.max(0, scoreEarned - 10);
      console.log('💡 Hint used: 10 points deducted, new score:', scoreEarned);
    }

    // Additional validation: Ensure finalAnswer is never null before database insertion
    if (finalAnswer === null || finalAnswer === undefined) {
      console.error('🔍 DEBUG: finalAnswer is null/undefined before database insertion, this should not happen');
      return res.status(400).json({ error: 'Invalid answer format' });
    }

    // Check if auto_submitted_at column exists for backward compatibility
    let columnExists = { exists: true }; // Default to true for newer databases
    try {
      columnExists = await db.getAsync(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'answers' AND column_name = 'auto_submitted_at'
        )
      `);
    } catch (error) {
      // If information_schema query fails, assume column exists
      console.log('🔍 DEBUG: Column existence check failed, assuming auto_submitted_at exists');
    }

    // Save answer with detailed scoring information and duplicate prevention
    const answerId = uuidv4();
    let insertSql, insertParams;

    // Insert answer with all required fields
    insertSql = `INSERT INTO answers (
      id, participant_id, question_id, answer, answer_text, is_correct, score_earned, time_taken, hint_used,
      execution_results, partial_score, code_quality_score, performance_score, correctness_score,
      evaluation_mode, execution_time_ms, memory_used_kb, test_cases_passed, total_test_cases,
      time_decay_bonus, auto_submitted, auto_submitted_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`;
    insertParams = [
      answerId, participant.id, questionId, finalAnswer, finalAnswer, isCorrect, scoreEarned, timeTaken, hintUsed,
      executionResults, partialScore, codeQualityScore, performanceScore, correctnessScore,
      evaluationMode, executionTimeMs, memoryUsedKb, testCasesPassed, totalTestCases,
      timeDecayBonus, autoSubmit || false, autoSubmit ? new Date().toISOString() : null
    ];

    try {
      await db.runAsync(insertSql, insertParams);
      console.log('🔍 DEBUG: Answer saved successfully with ID:', answerId);
    } catch (insertError) {
      // Check if it's a duplicate key error (participant already answered)
      if (insertError.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
          insertError.code === '23505' || // PostgreSQL unique violation
          insertError.message?.includes('UNIQUE constraint failed') ||
          insertError.message?.includes('duplicate key value')) {
        console.log('🔍 DEBUG: Duplicate answer detected during insert, rejecting submission');
        return res.status(409).json({
          error: 'Already answered this question',
          message: 'You have already submitted an answer for this question. Only the first submission counts for scoring.'
        });
      }
      throw insertError; // Re-throw other errors
    }

    // Update participant total score and session answered count in a transaction
    console.log('🔍 DEBUG: Updating participant total score by:', scoreEarned);
    const dbConnection = db.getConnection ? db.getConnection() : db;
    const inTransaction = dbConnection && typeof dbConnection.runAsync === 'function';

    try {
      if (inTransaction) {
        // Use transaction if available
        await dbConnection.runAsync('BEGIN TRANSACTION');
      }

      // Update participant total score
      await db.runAsync(
        'UPDATE participants SET total_score = total_score + $1 WHERE id = $2',
        [scoreEarned, participant.id]
      );
      console.log('🔍 DEBUG: Participant score updated successfully');

      // Update session answered count only if not auto-submitted (to prevent double counting)
      if (!isAutoSubmit) {
        await db.runAsync(
          'UPDATE game_sessions SET answered_participants = answered_participants + 1 WHERE current_question_id = $1',
          [questionId]
        );
        console.log('🔍 DEBUG: Session answered count updated successfully');
      } else {
        console.log('🔍 DEBUG: Skipping session answered count update for auto-submit');
      }

      if (inTransaction) {
        await dbConnection.runAsync('COMMIT');
      }
    } catch (dbError) {
      console.error('🔍 DEBUG: Database update error:', dbError);
      if (inTransaction) {
        try {
          await dbConnection.runAsync('ROLLBACK');
        } catch (rollbackError) {
          console.error('🔍 DEBUG: Rollback failed:', rollbackError);
        }
      }
      throw dbError;
    }

    // Log resource usage for monitoring
    const resourceStats = CodeExecutionService.getResourceStats();
    if (resourceStats.memoryUsage > 50 * 1024 * 1024) { // 50MB
      console.warn('High memory usage detected:', resourceStats);
    }

    res.json({
      submitted: true,
      isCorrect,
      scoreEarned,
      timeDecayBonus: timeDecayBonus || 0,
      partialScore,
      codeQualityScore,
      performanceScore,
      correctnessScore,
      evaluationMode,
      executionTimeMs,
      memoryUsedKb,
      testCasesPassed,
      totalTestCases,
      autoSubmitted: autoSubmit || false,
      submittedAt: new Date().toISOString(),
      message: autoSubmit
        ? 'Time expired - answer auto-submitted'
        : (isCorrect ? 'Correct answer!' : (partialScore > 0 ? 'Partial credit awarded!' : 'Incorrect answer'))
    });
  } catch (error) {
    console.error('🔍 DEBUG: Submit answer error:', error);
    console.error('🔍 DEBUG: Error stack:', error.stack);
    console.error('🔍 DEBUG: Error message:', error.message);

    // Provide more specific error messages based on error type
    if (error.code === 'SQLITE_CONSTRAINT' || error.message?.includes('constraint')) {
      console.error('🔍 DEBUG: Database constraint violation');
      res.status(409).json({ error: 'Answer submission conflict - please try again' });
    } else if (error.message?.includes('time') || error.message?.includes('expired')) {
      console.error('🔍 DEBUG: Time-related error');
      res.status(400).json({ error: 'Question time has expired' });
    } else if (error.message?.includes('already answered')) {
      console.error('🔍 DEBUG: Duplicate submission attempt');
      res.status(409).json({
        error: 'Already answered this question',
        message: 'You have already submitted an answer for this question. Only the first submission counts for scoring.'
      });
    } else {
      console.error('🔍 DEBUG: Unexpected error during submission');
      res.status(500).json({ error: 'Failed to submit answer' });
    }
  }
});

// Report cheat attempt
router.post('/cheat-report', authenticateParticipant, async (req, res) => {
  try {
    const { cheatType } = req.body;
    const participant = req.participant;

    // Update cheat warnings
    const newWarningCount = participant.cheat_warnings + 1;
    
    let penaltyScore = 0;
    let status = 'active';

    if (newWarningCount === 1) {
      penaltyScore = 10;
    } else if (newWarningCount === 2) {
      penaltyScore = 15;
    } else if (newWarningCount >= 3) {
      status = 'flagged'; // Flag for organizer attention
    }

    await db.runAsync(
      `UPDATE participants SET
       cheat_warnings = $1,
       total_score = total_score - $2,
       status = $3
       WHERE id = $4`,
      [newWarningCount, penaltyScore, status, participant.id]
    );

    res.json({
      warning: newWarningCount,
      penalty: penaltyScore,
      status: status
    });
  } catch (error) {
    console.error('Cheat report error:', error);
    res.status(500).json({ error: 'Failed to report cheat' });
  }
});

// Re-admit eliminated participant
router.post('/re-admit/:participantId', async (req, res) => {
  try {
    const { participantId } = req.params;
    const { organizerId } = req.body; // Organizer ID passed from frontend

    // Verify the organizer owns the game
    const participant = await db.getAsync(
      `SELECT p.*, g.organizer_id FROM participants p
       JOIN games g ON p.game_id = g.id
       WHERE p.id = $1`,
      [participantId]
    );

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    if (participant.organizer_id !== organizerId) {
      return res.status(403).json({ error: 'Unauthorized to re-admit this participant' });
    }

    if (participant.status !== 'eliminated') {
      return res.status(400).json({ error: 'Participant is not eliminated' });
    }

    // Re-admit the participant
    await db.runAsync(
      'UPDATE participants SET status = $1 WHERE id = $2',
      ['active', participantId]
    );

    // Get updated participant list for the game
    const updatedParticipants = await db.allAsync(
      `SELECT id, name, avatar, total_score, current_rank, status, qualified, cheat_warnings, joined_at
       FROM participants WHERE game_id = $1 ORDER BY total_score DESC`,
      [participant.game_id]
    );

    res.json({
      message: 'Participant re-admitted successfully',
      participants: updatedParticipants
    });
  } catch (error) {
    console.error('Re-admit participant error:', error);
    res.status(500).json({ error: 'Failed to re-admit participant' });
  }
});

// Get participant analytics
router.get('/analytics', authenticateParticipant, async (req, res) => {
  try {
    const participant = req.participant;

    // Get all answers for this participant with detailed scoring information
    const answers = await db.allAsync(
      `SELECT a.*, q.question_text, q.correct_answer, q.marks, q.question_type, q.evaluation_mode
       FROM answers a
       JOIN questions q ON a.question_id = q.id
       WHERE a.participant_id = $1
       ORDER BY q.question_order`,
      [participant.id]
    );

    // Calculate statistics
    const totalQuestions = answers.length;
    const correctAnswers = answers.filter(a => a.is_correct).length;
    const totalScore = answers.reduce((sum, a) => sum + a.score_earned, 0);
    const averageTime = totalQuestions > 0 ? answers.reduce((sum, a) => sum + a.time_taken, 0) / totalQuestions : 0;

    // Calculate code-specific statistics
    const codeQuestions = answers.filter(a => a.question_type === 'code');
    const codeStats = {
      totalCodeQuestions: codeQuestions.length,
      codeCorrectAnswers: codeQuestions.filter(a => a.is_correct).length,
      averageCodeQuality: codeQuestions.length > 0 ? codeQuestions.reduce((sum, a) => sum + (a.code_quality_score || 0), 0) / codeQuestions.length : 0,
      averagePerformance: codeQuestions.length > 0 ? codeQuestions.reduce((sum, a) => sum + (a.performance_score || 0), 0) / codeQuestions.length : 0,
      averageCorrectness: codeQuestions.length > 0 ? codeQuestions.reduce((sum, a) => sum + (a.correctness_score || 0), 0) / codeQuestions.length : 0,
      totalTestCasesPassed: codeQuestions.reduce((sum, a) => sum + (a.test_cases_passed || 0), 0),
      totalTestCases: codeQuestions.reduce((sum, a) => sum + (a.total_test_cases || 0), 0)
    };

    res.json({
      participant: {
        name: participant.name,
        avatar: participant.avatar,
        finalRank: participant.current_rank,
        totalScore: participant.total_score,
        cheatWarnings: participant.cheat_warnings
      },
      stats: {
        totalQuestions,
        correctAnswers,
        accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
        averageTime: Math.round(averageTime),
        totalScore,
        codeStats
      },
      answers: answers.map(a => ({
        questionText: a.question_text,
        yourAnswer: a.answer_text,
        correctAnswer: a.correct_answer,
        isCorrect: a.is_correct,
        scoreEarned: a.score_earned,
        maxScore: a.marks,
        timeTaken: a.time_taken,
        hintUsed: a.hint_used,
        questionType: a.question_type,
        evaluationMode: a.evaluation_mode,
        partialScore: a.partial_score,
        codeQualityScore: a.code_quality_score,
        performanceScore: a.performance_score,
        correctnessScore: a.correctness_score,
        executionTimeMs: a.execution_time_ms,
        memoryUsedKb: a.memory_used_kb,
        testCasesPassed: a.test_cases_passed,
        totalTestCases: a.total_test_cases,
        timeDecayBonus: a.time_decay_bonus,
        executionResults: a.execution_results ? JSON.parse(a.execution_results) : null
      }))
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

export default router;