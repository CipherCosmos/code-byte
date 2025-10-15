import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinary from 'cloudinary';
import { db } from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { io } from '../server.js';
import { AppDataSource } from '../database/dataSource.js';
import { generateAndUploadQRCode, deleteQRCode } from '../services/qrCodeService.js';

// Configure Cloudinary
console.log('🔍 Cloudinary Configuration Check:');
console.log('  - CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING');
console.log('  - CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING');
console.log('  - CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING');
console.log('  - CLOUDINARY_URL:', process.env.CLOUDINARY_URL ? 'SET' : 'MISSING');

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for memory storage (for Cloudinary upload)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

const router = express.Router();

export default router;

// Upload image for questions
router.post('/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.v2.uploader.upload_stream(
        {
          folder: 'hackarena/questions',
          public_id: uuidv4(),
          resource_type: 'image',
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    const imageUrl = result.secure_url;
    res.json({ imageUrl });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Get all games for organizer
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('🎮 Games route - GET / - User ID:', req.user.id);

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
      [req.user.id]
    );

    console.log('🎮 Games route - Found games:', games.length);
    res.json(games);
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Create new game
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, maxParticipants, qualificationType, qualificationThreshold } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const gameId = uuidv4();
    const gameCode = uuidv4().substr(0, 8).toUpperCase();

    const result = await db.runAsync(
      `INSERT INTO games (id, title, description, game_code, organizer_id, max_participants, qualification_type, qualification_threshold)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [gameId, title, description, gameCode, req.user.id, maxParticipants || 500, qualificationType || 'none', qualificationThreshold || 0]
    );

    // Generate and upload QR Code to Cloudinary
    console.log('🎮 Creating game - Generating QR code for game:', gameCode);
    const qrCodeUrl = await generateAndUploadQRCode(gameCode);

    // Update game with QR code URL
    await db.runAsync(
      'UPDATE games SET qr_code_url = $1 WHERE id = $2',
      [qrCodeUrl, gameId]
    );

    const game = await db.getAsync('SELECT * FROM games WHERE id = $1', [gameId]);

    if (!game) {
      throw new Error('Game not found after creation');
    }

    const joinUrl = `${process.env.FRONTEND_URL}/join/${gameCode}`;
    res.status(201).json({
      ...game,
      qrCode: qrCodeUrl,
      joinUrl
    });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Get specific game details
router.get('/:gameId', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 GET /api/games/:gameId - Starting request processing');
    console.log('🔍 Request details:');
    console.log('   - gameId:', req.params.gameId);
    console.log('   - user.id:', req.user.id);
    console.log('   - user.email:', req.user.email);
    console.log('   - Environment FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');

    // Add detailed logging for the actual query being executed
    const query = 'SELECT * FROM games WHERE id = $1 AND organizer_id = $2';
    const params = [req.params.gameId, req.user.id];
    console.log('🔍 Database query for game:');
    console.log('   - Query:', query);
    console.log('   - Params:', params);
    console.log('   - Param types:', {
      gameId: typeof params[0],
      userId: typeof params[1]
    });

    console.log('🔍 Executing game lookup query...');
    const game = await db.getAsync(query, params);
    console.log('🔍 Game query result:', game ? 'Game found' : 'Game not found');
    if (game) {
      console.log('   - Game details:', {
        id: game.id,
        title: game.title,
        organizer_id: game.organizer_id,
        status: game.status
      });
    }

    if (!game) {
      console.log('❌ Game not found - returning 404');
      return res.status(404).json({ error: 'Game not found' });
    }

    console.log('🔍 Fetching questions for game...');
    const questionsQuery = 'SELECT * FROM questions WHERE game_id = $1 ORDER BY question_order';
    const questionsParams = [game.id];
    console.log('   - Questions query:', questionsQuery);
    console.log('   - Questions params:', questionsParams);
    const questions = await db.allAsync(questionsQuery, questionsParams);
    console.log('🔍 Questions query result: Found', questions.length, 'questions');

    console.log('🔍 Fetching participants for game...');
    const participantsQuery = `SELECT id, name, avatar, total_score, current_rank, status, qualified, cheat_warnings, joined_at
       FROM participants WHERE game_id = $1 ORDER BY total_score DESC`;
    const participantsParams = [game.id];
    console.log('   - Participants query:', participantsQuery.replace(/\s+/g, ' ').trim());
    console.log('   - Participants params:', participantsParams);
    const participants = await db.allAsync(participantsQuery, participantsParams);
    console.log('🔍 Participants query result: Found', participants.length, 'participants');

    console.log('🔍 Generating QR code...');
    const joinUrl = `${process.env.FRONTEND_URL}/join/${game.game_code}`;
    console.log('   - Join URL:', joinUrl);
    if (!process.env.FRONTEND_URL) {
      console.warn('⚠️  FRONTEND_URL environment variable is not set!');
    }

    let qrCodeUrl;
    if (game.qr_code_url) {
      // Use existing QR code if available
      qrCodeUrl = game.qr_code_url;
      console.log('🔍 Using existing QR code URL:', qrCodeUrl);
    } else {
      // Generate new QR code if not exists
      qrCodeUrl = await generateAndUploadQRCode(game.game_code);
      // Update game with QR code URL
      await db.runAsync(
        'UPDATE games SET qr_code_url = $1 WHERE id = $2',
        [qrCodeUrl, game.id]
      );
      console.log('🔍 New QR code generated and stored:', qrCodeUrl);
    }

    console.log('✅ GET /api/games/:gameId - Request completed successfully');
    res.json({
      ...game,
      questions,
      participants,
      qrCode: qrCodeUrl,
      joinUrl
    });
  } catch (error) {
    console.error('❌ GET /api/games/:gameId - Error occurred:');
    console.error('   - Error message:', error.message);
    console.error('   - Error stack:', error.stack);
    console.error('   - Error code:', error.code);
    console.error('   - Error details:', error);
    res.status(500).json({ error: 'Failed to fetch game details' });
  }
});

// Update game
router.put('/:gameId', authenticateToken, async (req, res) => {
  try {
    const { title, description, maxParticipants, qualificationType, qualificationThreshold } = req.body;

    await db.runAsync(
      `UPDATE games SET title = $1, description = $2, max_participants = $3, qualification_type = $4, qualification_threshold = $5
        WHERE id = $6 AND organizer_id = $7`,
      [title, description, maxParticipants, qualificationType, qualificationThreshold, req.params.gameId, req.user.id]
    );

    const game = await db.getAsync(
      'SELECT * FROM games WHERE id = $1 AND organizer_id = $2',
      [req.params.gameId, req.user.id]
    );

    res.json(game);
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// Delete game
router.delete('/:gameId', authenticateToken, async (req, res) => {
  try {
    // First verify the game exists and user has access
    const game = await db.getAsync(
      'SELECT id FROM games WHERE id = $1 AND organizer_id = $2',
      [req.params.gameId, req.user.id]
    );

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Delete in proper order to avoid foreign key constraints
    // 1. Delete code execution results for answers in this game
    await db.runAsync(
      `DELETE FROM code_execution_results
       WHERE answer_id IN (
         SELECT a.id FROM answers a
         JOIN questions q ON a.question_id = q.id
         WHERE q.game_id = $1
       )`,
      [req.params.gameId]
    );

    // 2. Delete answers for this game
    await db.runAsync(
      `DELETE FROM answers
       WHERE question_id IN (
         SELECT id FROM questions WHERE game_id = $1
       )`,
      [req.params.gameId]
    );

    // 3. Delete participants for this game
    await db.runAsync(
      'DELETE FROM participants WHERE game_id = $1',
      [req.params.gameId]
    );

    // 4. Delete questions for this game
    await db.runAsync(
      'DELETE FROM questions WHERE game_id = $1',
      [req.params.gameId]
    );

    // 5. Delete game sessions for this game
    await db.runAsync(
      'DELETE FROM game_sessions WHERE game_id = $1',
      [req.params.gameId]
    );

    // Get QR code URL before deleting game
    const gameToDelete = await db.getAsync('SELECT qr_code_url FROM games WHERE id = $1', [req.params.gameId]);

    // 6. Finally delete the game itself
    await db.runAsync(
      'DELETE FROM games WHERE id = $1 AND organizer_id = $2',
      [req.params.gameId, req.user.id]
    );

    // Delete QR code from Cloudinary if it exists
    if (gameToDelete && gameToDelete.qr_code_url) {
      await deleteQRCode(gameToDelete.qr_code_url);
    }

    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// Add question to game
router.post('/:gameId/questions', authenticateToken, async (req, res) => {
  try {
    // Input validation and sanitization
    if (!req.params.gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    // Verify game exists and user has access
    const game = await db.getAsync('SELECT id FROM games WHERE id = $1 AND organizer_id = $2', [req.params.gameId, req.user.id]);
    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }
    // console.log('🔍 Backend - POST /:gameId/questions - Request body:', JSON.stringify(req.body, null, 2));
    // console.log('🔍 Backend - options type:', typeof req.body.options);
    // console.log('🔍 Backend - options value:', req.body.options);

    let {
      questionText,
      questionType,
      options,
      correctAnswer: initialCorrectAnswer,
      hint,
      hintPenalty,
      timeLimit,
      marks,
      difficulty,
      explanation,
      evaluationMode,
      testCases,
      aiValidationSettings,
      imageUrl,
      crosswordGrid,
      crosswordClues,
      crosswordSize,
      timeDecayEnabled,
      timeDecayFactor
    } = req.body;

    // Use a mutable variable for correctAnswer processing
    let correctAnswer = initialCorrectAnswer;

    // Validate required fields
    if (!questionText || !questionType) {
      console.error('Validation error: Missing questionText or questionType');
      return res.status(400).json({ error: 'Question text and type are required' });
    }

    console.log('🔍 Backend - About to process options');
    console.log('🔍 Backend - Raw options:', options);
    console.log('🔍 Backend - Options type:', typeof options);

    // Handle options - robust processing with error handling
    // Arrays may be serialized as comma-separated strings, JSON strings, or already arrays
    let processedOptions = [];

    try {
      console.log('🔍 DEBUG: Options processing - Input options:', options, 'Type:', typeof options);

      if (Array.isArray(options)) {
        // Already an array, use as-is
        console.log('🔍 DEBUG: Options already an array');
        processedOptions = [...options]; // Create a copy to avoid mutations
      } else if (typeof options === 'string') {
        const trimmedOptions = options.trim();

        if (trimmedOptions.startsWith('[') && trimmedOptions.endsWith(']')) {
          // JSON string array
          console.log('🔍 DEBUG: Detected JSON string array, parsing...');
          try {
            processedOptions = JSON.parse(trimmedOptions);
            console.log('🔍 DEBUG: After JSON parse, processedOptions:', processedOptions);
          } catch (parseError) {
            console.log('🔍 DEBUG: JSON parse failed, falling back to comma split:', parseError.message);
            processedOptions = trimmedOptions.slice(1, -1).split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
          }
        } else if (trimmedOptions.includes(',')) {
          // Comma-separated string
          console.log('🔍 DEBUG: Detected comma-separated string, splitting...');
          processedOptions = trimmedOptions.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
          console.log('🔍 DEBUG: After split, processedOptions:', processedOptions);
        } else if (trimmedOptions.length > 0) {
          // Single string value
          console.log('🔍 DEBUG: Single string option, wrapping in array');
          processedOptions = [trimmedOptions];
        } else {
          // Empty string
          console.log('🔍 DEBUG: Empty options string, using empty array');
          processedOptions = [];
        }
      } else if (options == null || options === undefined) {
        // Null/undefined
        console.log('🔍 DEBUG: Options is null/undefined, using empty array');
        processedOptions = [];
      } else {
        // Other types (numbers, objects, etc.)
        console.log('🔍 DEBUG: Unknown options type, converting to string then array');
        processedOptions = [String(options)];
      }

      // Ensure we always have an array
      if (!Array.isArray(processedOptions)) {
        console.warn('🔍 DEBUG: processedOptions is not an array after processing, forcing to array');
        processedOptions = [];
      }

      // Filter out empty strings and trim whitespace
      processedOptions = processedOptions
        .filter(opt => opt != null && String(opt).trim().length > 0)
        .map(opt => String(opt).trim());

      console.log('🔍 DEBUG: Final processedOptions:', processedOptions, 'isArray:', Array.isArray(processedOptions));

    } catch (error) {
      console.error('🔍 DEBUG: Error processing options:', error);
      console.error('🔍 DEBUG: Original options value:', options, 'Type:', typeof options);
      processedOptions = [];
    }

    console.log('🔍 Backend - processedOptions after processing:', processedOptions);

    console.log('🔍 Backend - Final processedOptions:', processedOptions, 'isArray:', Array.isArray(processedOptions));

    // Validate question type specific requirements
    if (questionType === 'mcq') {
      if (!Array.isArray(processedOptions)) {
        console.error('Validation error: processedOptions is not an array for MCQ question');
        console.error('processedOptions:', processedOptions, 'type:', typeof processedOptions);
        return res.status(400).json({ error: 'MCQ questions must have valid options array' });
      }
      if (processedOptions.length < 2) {
        console.error('Validation error: MCQ questions must have at least 2 options');
        console.error('processedOptions length:', processedOptions.length, 'values:', processedOptions);
        return res.status(400).json({ error: 'MCQ questions must have at least 2 options' });
      }
    }

    if (questionType === 'multiple_answers') {
      if (!Array.isArray(processedOptions) || processedOptions.length < 2) {
        console.error('Validation error: Multiple answers questions must have at least 2 options');
        console.error('processedOptions:', processedOptions, 'length:', processedOptions?.length);
        return res.status(400).json({ error: 'Multiple answers questions must have at least 2 options' });
      }

      // Process correct answer with robust error handling
      let processedCorrectAnswer = [];
      try {
        if (Array.isArray(correctAnswer)) {
          processedCorrectAnswer = [...correctAnswer];
        } else if (typeof correctAnswer === 'string') {
          if (correctAnswer.trim().startsWith('[')) {
            processedCorrectAnswer = JSON.parse(correctAnswer);
          } else if (correctAnswer.includes(',')) {
            processedCorrectAnswer = correctAnswer.split(',').map(ans => ans.trim());
          } else {
            processedCorrectAnswer = [correctAnswer.trim()];
          }
        } else if (correctAnswer != null) {
          processedCorrectAnswer = [String(correctAnswer)];
        }
      } catch (error) {
        console.error('Error processing correct answer for multiple_answers:', error);
        processedCorrectAnswer = [];
      }

      if (!Array.isArray(processedCorrectAnswer) || processedCorrectAnswer.length < 1) {
        console.error('Validation error: Multiple answers questions must have at least 1 correct answer');
        console.error('processedCorrectAnswer:', processedCorrectAnswer);
        return res.status(400).json({ error: 'Multiple answers questions must have at least 1 correct answer' });
      }

      // Validate that correct answers are valid indices or values
      for (const ans of processedCorrectAnswer) {
        const normalizedAns = typeof ans === 'string' ? ans.trim() : ans;
        if (typeof normalizedAns === 'number') {
          if (normalizedAns < 0 || normalizedAns >= processedOptions.length) {
            console.error('Invalid correct answer index:', normalizedAns, 'options length:', processedOptions.length);
            return res.status(400).json({ error: 'Invalid correct answer index' });
          }
        } else if (typeof normalizedAns === 'string') {
          if (!processedOptions.some(opt => String(opt).trim() === normalizedAns)) {
            console.error('Invalid correct answer value:', normalizedAns, 'available options:', processedOptions);
            return res.status(400).json({ error: 'Invalid correct answer value' });
          }
        } else {
          console.error('Invalid correct answer type:', typeof normalizedAns, 'value:', normalizedAns);
          return res.status(400).json({ error: 'Correct answers must be indices or option values' });
        }
      }

      // Store processed correct answer for later use
      correctAnswer = JSON.stringify(processedCorrectAnswer);
    }

    if (questionType === 'code_snippet' && !evaluationMode) {
      console.error('Validation error: Code questions must specify evaluation mode');
      return res.status(400).json({ error: 'Code questions must specify evaluation mode' });
    }

    // Validate test cases for code questions
    if (questionType === 'code_snippet' && (evaluationMode === 'compiler' || evaluationMode === 'bugfix')) {
      if (!testCases || testCases.trim() === '') {
        console.error('Validation error: Test cases are required for compiler/bugfix evaluation');
        return res.status(400).json({ error: 'Test cases are required for compiler/bugfix evaluation' });
      }
      try {
        console.log('Parsing test cases:', testCases);
        JSON.parse(testCases);
      } catch (parseError) {
        console.error('Validation error: Invalid test cases format', parseError);
        return res.status(400).json({ error: 'Invalid test cases format' });
      }
    }

    // Validate marks and time limits with robust type checking
    if (marks != null) {
      const numMarks = Number(marks);
      if (isNaN(numMarks) || numMarks < 0 || numMarks > 100) {
        console.error('Validation error: Marks must be a number between 0 and 100, got:', marks, 'type:', typeof marks);
        return res.status(400).json({ error: 'Marks must be between 0 and 100' });
      }
    }

    if (timeLimit != null) {
      const numTimeLimit = Number(timeLimit);
      if (isNaN(numTimeLimit) || numTimeLimit < 10 || numTimeLimit > 3600) {
        console.error('Validation error: Time limit must be a number between 10 and 3600 seconds, got:', timeLimit, 'type:', typeof timeLimit);
        return res.status(400).json({ error: 'Time limit must be between 10 and 3600 seconds' });
      }
    }

    // Get current question count
    const questionCount = await db.getAsync(
      'SELECT COUNT(*) as count FROM questions WHERE game_id = $1',
      [req.params.gameId]
    );

    // Get existing question orders to validate sequential numbering
    const existingOrders = await db.allAsync(
      'SELECT question_order FROM questions WHERE game_id = $1 ORDER BY question_order',
      [req.params.gameId]
    );

    console.log('🔍 QUESTION ORDER DEBUG - Current question count:', questionCount.count);
    console.log('🔍 QUESTION ORDER DEBUG - Existing question orders:', existingOrders.map(q => q.question_order));
    console.log('🔍 QUESTION ORDER DEBUG - Expected next order:', questionCount.count + 1);

    // Check for gaps in ordering
    const expectedOrders = Array.from({ length: questionCount.count }, (_, i) => i + 1);
    const actualOrders = existingOrders.map(q => q.question_order);
    const hasGaps = !expectedOrders.every(order => actualOrders.includes(order));

    if (hasGaps) {
      console.warn('⚠️ QUESTION ORDER WARNING - Gaps detected in question ordering!');
      console.warn('⚠️ Expected sequential orders:', expectedOrders);
      console.warn('⚠️ Actual orders:', actualOrders);

      // FIX: Recalculate all question orders to be sequential
      console.log('🔧 QUESTION ORDER FIX - Recalculating all question orders for game:', req.params.gameId);
      const questionsToReorder = await db.allAsync(
        'SELECT id FROM questions WHERE game_id = $1 ORDER BY question_order',
        [req.params.gameId]
      );

      // Update each question with sequential order
      for (let i = 0; i < questionsToReorder.length; i++) {
        const newOrder = i + 1;
        await db.runAsync(
          'UPDATE questions SET question_order = $1 WHERE id = $2',
          [newOrder, questionsToReorder[i].id]
        );
        console.log(`🔧 Updated question ${questionsToReorder[i].id} to order ${newOrder}`);
      }

      console.log('✅ QUESTION ORDER FIX - All question orders recalculated sequentially');
    }

    // Generate UUID for question id
    const questionId = uuidv4();
    console.log('Generated questionId:', questionId);

    console.log('🔍 Backend - About to create insertParams');
    console.log('🔍 Backend - processedOptions before stringify:', processedOptions);
    console.log('🔍 Backend - processedOptions type:', typeof processedOptions, 'isArray:', Array.isArray(processedOptions));

    // Ensure processedOptions is always an array before stringifying
    const safeOptions = Array.isArray(processedOptions) ? processedOptions : [];
    const optionsJson = JSON.stringify(safeOptions);
    console.log('🔍 Backend - optionsJson:', optionsJson);

    // Safely handle numeric parameters
    const safeHintPenalty = hintPenalty != null ? Number(hintPenalty) : 10;
    const safeTimeLimit = timeLimit != null ? Number(timeLimit) : 60;
    const safeMarks = marks != null ? Number(marks) : 10;

    // After potential reordering above, get the correct next order
    const maxOrderResult = await db.getAsync(
      'SELECT MAX(question_order) as max_order FROM questions WHERE game_id = $1',
      [req.params.gameId]
    );

    const newQuestionOrder = (maxOrderResult?.max_order || 0) + 1;
    console.log('🔍 QUESTION ORDER DEBUG - Max question order after reordering:', maxOrderResult?.max_order || 0);
    console.log('🔍 QUESTION ORDER DEBUG - Assigning question_order:', newQuestionOrder);

    const insertParams = [
      questionId,
      req.params.gameId,
      newQuestionOrder,
      questionText,
      questionType,
      questionType, // for type
      questionText, // for content
      optionsJson,
      correctAnswer,
      hint,
      safeHintPenalty,
      safeTimeLimit,
      safeMarks,
      difficulty || 'medium',
      explanation,
      evaluationMode || 'mcq',
      testCases || null,
      aiValidationSettings || null,
      imageUrl || null,
      crosswordGrid ? JSON.stringify(crosswordGrid) : null,
      crosswordClues ? JSON.stringify(crosswordClues) : null,
      JSON.stringify(crosswordSize) || null,
      null, // partial_marking_settings
      timeDecayEnabled || false, // time_decay_enabled
      timeDecayFactor || 0.1 // time_decay_factor
    ];
    console.log('🔍 Backend - INSERT query params:', insertParams);
    console.log('🔍 Backend - Options param (index 7):', insertParams[7]);

    const result = await db.runAsync(
      `INSERT INTO questions (id, game_id, question_order, question_text, question_type, type, content, options, correct_answer, hint, hint_penalty, time_limit, marks, difficulty, explanation, evaluation_mode, test_cases, ai_validation_settings, image_url, crossword_grid, crossword_clues, crossword_size, partial_marking_settings, time_decay_enabled, time_decay_factor) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
      insertParams
    );

    // Update total questions in game
    await db.runAsync(
      'UPDATE games SET total_questions = $1 WHERE id = $2',
      [questionCount.count + 1, req.params.gameId]
    );

    const question = await db.getAsync('SELECT * FROM questions WHERE id = $1', [questionId]);

    if (!question) {
      console.error('Error: Question not found after insertion');
      return res.status(500).json({ error: 'Failed to retrieve the created question' });
    }

    // Safely parse options from database response
    let parsedOptions = [];
    try {
      if (Array.isArray(question.options)) {
        parsedOptions = question.options;
      } else if (typeof question.options === 'string') {
        parsedOptions = JSON.parse(question.options || '[]');
      } else {
        parsedOptions = [];
      }
      // Ensure it's always an array
      if (!Array.isArray(parsedOptions)) {
        parsedOptions = [];
      }
    } catch (parseError) {
      console.error('Error parsing question options from database:', parseError);
      parsedOptions = [];
    }

    res.status(201).json({
      ...question,
      options: parsedOptions
    });
  } catch (error) {
    console.error('Add question error:', error);
    // Provide more specific error messages based on error type
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Database constraint violation - check your input data' });
    } else if (error.message && error.message.includes('validation')) {
      return res.status(400).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Failed to add question' });
    }
  }
});

// Update question
router.put('/:gameId/questions/:questionId', authenticateToken, async (req, res) => {
  try {
    // Input validation and sanitization
    if (!req.params.gameId || !req.params.questionId) {
      return res.status(400).json({ error: 'Game ID and Question ID are required' });
    }

    // Verify game and question exist and user has access
    const existingQuestion = await db.getAsync('SELECT id FROM questions WHERE id = $1 AND game_id = $2', [req.params.questionId, req.params.gameId]);
    if (!existingQuestion) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const game = await db.getAsync('SELECT id FROM games WHERE id = $1 AND organizer_id = $2', [req.params.gameId, req.user.id]);
    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }
    // console.log('🔍 Backend - PUT /:gameId/questions/:questionId - Request body:', JSON.stringify(req.body, null, 2));
    // console.log('🔍 Backend - PUT - Options type:', typeof req.body.options);
    // console.log('🔍 Backend - PUT - Options value:', req.body.options);
    // console.log('🔍 Backend - PUT - Test cases type:', typeof req.body.testCases);

    let {
      questionText,
      questionType,
      options,
      correctAnswer: initialCorrectAnswer,
      hint,
      hintPenalty,
      timeLimit,
      marks,
      difficulty,
      explanation,
      evaluationMode,
      testCases,
      aiValidationSettings,
      imageUrl,
      crosswordGrid,
      crosswordClues,
      crosswordSize,
      timeDecayEnabled,
      timeDecayFactor
    } = req.body;

    // Use a mutable variable for correctAnswer processing
    let correctAnswer = initialCorrectAnswer;

    // Validate required fields
    if (!questionText || !questionType) {
      return res.status(400).json({ error: 'Question text and type are required' });
    }

    console.log('🔍 Backend - PUT - About to process options');
    console.log('🔍 Backend - PUT - Raw options:', options);
    console.log('🔍 Backend - PUT - Options type:', typeof options);

    // Handle options - robust processing with error handling for PUT
    let processedOptions = [];

    try {
      console.log('🔍 Backend - PUT - Raw options:', options, 'Type:', typeof options);

      if (Array.isArray(options)) {
        processedOptions = [...options];
      } else if (typeof options === 'string') {
        const trimmedOptions = options.trim();

        if (trimmedOptions.startsWith('[') && trimmedOptions.endsWith(']')) {
          try {
            processedOptions = JSON.parse(trimmedOptions);
          } catch (parseError) {
            processedOptions = trimmedOptions.slice(1, -1).split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
          }
        } else if (trimmedOptions.includes(',')) {
          processedOptions = trimmedOptions.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
        } else if (trimmedOptions.length > 0) {
          processedOptions = [trimmedOptions];
        } else {
          processedOptions = [];
        }
      } else if (options == null || options === undefined) {
        processedOptions = [];
      } else {
        processedOptions = [String(options)];
      }

      // Ensure we always have an array
      if (!Array.isArray(processedOptions)) {
        processedOptions = [];
      }

      // Filter out empty strings and trim whitespace
      processedOptions = processedOptions
        .filter(opt => opt != null && String(opt).trim().length > 0)
        .map(opt => String(opt).trim());

      console.log('🔍 Backend - PUT - Final processedOptions:', processedOptions, 'isArray:', Array.isArray(processedOptions));

    } catch (error) {
      console.error('🔍 Backend - PUT - Error processing options:', error);
      processedOptions = [];
    }

    // Validate question type specific requirements
    if (questionType === 'mcq' && (!processedOptions || !Array.isArray(processedOptions) || processedOptions.length < 2)) {
      return res.status(400).json({ error: 'MCQ questions must have at least 2 options' });
    }

    if (questionType === 'multiple_answers') {
      console.log('🔍 Backend - Processing multiple_answers question');
      console.log('🔍 Backend - processedOptions:', processedOptions);
      console.log('🔍 Backend - correctAnswer:', correctAnswer, 'type:', typeof correctAnswer);

      if (!Array.isArray(processedOptions) || processedOptions.length < 2) {
        console.error('Validation error: Multiple answers questions must have at least 2 options');
        return res.status(400).json({ error: 'Multiple answers questions must have at least 2 options' });
      }

      // Process correct answer
      let processedCorrectAnswer = correctAnswer;
      if (typeof correctAnswer === 'string') {
        try {
          processedCorrectAnswer = JSON.parse(correctAnswer);
          console.log('🔍 Backend - parsed correctAnswer from JSON:', processedCorrectAnswer);
        } catch {
          processedCorrectAnswer = [correctAnswer];
          console.log('🔍 Backend - converted correctAnswer to array:', processedCorrectAnswer);
        }
      }

      console.log('🔍 Backend - processedCorrectAnswer:', processedCorrectAnswer, 'isArray:', Array.isArray(processedCorrectAnswer));

      if (!Array.isArray(processedCorrectAnswer) || processedCorrectAnswer.length < 1) {
        console.error('Validation error: Multiple answers questions must have at least 1 correct answer');
        return res.status(400).json({ error: 'Multiple answers questions must have at least 1 correct answer' });
      }

      // Validate that correct answers are valid indices or values
      for (const ans of processedCorrectAnswer) {
        console.log('🔍 Backend - validating answer:', ans, 'type:', typeof ans);
        if (typeof ans === 'number') {
          if (ans < 0 || ans >= processedOptions.length) {
            return res.status(400).json({ error: 'Invalid correct answer index' });
          }
        } else if (typeof ans === 'string') {
          if (!processedOptions.includes(ans)) {
            return res.status(400).json({ error: 'Invalid correct answer value' });
          }
        } else {
          return res.status(400).json({ error: 'Correct answers must be indices or option values' });
        }
      }

      // Store processed correct answer for later use
      correctAnswer = JSON.stringify(processedCorrectAnswer);
      console.log('🔍 Backend - final correctAnswer to store:', correctAnswer);
    }

    if (questionType === 'code_snippet' && !evaluationMode) {
      return res.status(400).json({ error: 'Code questions must specify evaluation mode' });
    }

    // Validate test cases for code questions
    if (questionType === 'code_snippet' && (evaluationMode === 'compiler' || evaluationMode === 'bugfix')) {
      console.log('🔍 UPDATE QUESTION - testCases type:', typeof testCases);
      console.log('🔍 UPDATE QUESTION - testCases value:', testCases);
      try {
        let parsedTestCases;
        if (typeof testCases === 'string') {
          try {
            parsedTestCases = JSON.parse(testCases);
            console.log('🔍 UPDATE QUESTION - testCases parsed as JSON');
          } catch {
            console.log('🔍 UPDATE QUESTION - testCases not valid JSON, converting comma-separated to array');
            // Convert comma-separated string to array format
            const parts = testCases.split(',').map(part => part.trim()).filter(part => part.length > 0);
            parsedTestCases = parts.map(part => ({ input: part, expectedOutput: '', description: '' }));
            console.log('🔍 UPDATE QUESTION - parsedTestCases after conversion:', parsedTestCases);
          }
        } else if (Array.isArray(testCases)) {
          parsedTestCases = testCases;
        } else {
          parsedTestCases = null;
        }

        if (!Array.isArray(parsedTestCases) || parsedTestCases.length === 0) {
          return res.status(400).json({ error: 'Code questions with compiler/bugfix evaluation must have test cases' });
        }

        // Validate test case structure
        for (const testCase of parsedTestCases) {
          if (!testCase.hasOwnProperty('input') || !testCase.hasOwnProperty('expectedOutput')) {
            return res.status(400).json({ error: 'Test cases must have input and expectedOutput fields' });
          }
        }
      } catch (parseError) {
        return res.status(400).json({ error: 'Invalid test cases format' });
      }
    }

    // Validate marks and time limits with robust type checking for PUT
    if (marks != null) {
      const numMarks = Number(marks);
      if (isNaN(numMarks) || numMarks < 0 || numMarks > 100) {
        console.error('Validation error: Marks must be a number between 0 and 100, got:', marks, 'type:', typeof marks);
        return res.status(400).json({ error: 'Marks must be between 0 and 100' });
      }
    }

    if (timeLimit != null) {
      const numTimeLimit = Number(timeLimit);
      if (isNaN(numTimeLimit) || numTimeLimit < 10 || numTimeLimit > 3600) {
        console.error('Validation error: Time limit must be a number between 10 and 3600 seconds, got:', timeLimit, 'type:', typeof timeLimit);
        return res.status(400).json({ error: 'Time limit must be between 10 and 3600 seconds' });
      }
    }

    console.log('🔍 PUT /:gameId/questions/:questionId - Validation passed, proceeding with update');

    console.log('🔍 PUT /:gameId/questions/:questionId - About to update question with params:');
    console.log('  - questionText:', questionText);
    console.log('  - questionType:', questionType);
    console.log('  - processedOptions:', processedOptions);
    console.log('  - testCases:', testCases);

    await db.runAsync(
      `UPDATE questions SET
        question_text = $1, question_type = $2, options = $3, correct_answer = $4,
        hint = $5, hint_penalty = $6, time_limit = $7, marks = $8, difficulty = $9, explanation = $10,
        evaluation_mode = $11, test_cases = $12, ai_validation_settings = $13, image_url = $14,
        crossword_grid = $15, crossword_clues = $16, crossword_size = $17,
        partial_marking_settings = $18, time_decay_enabled = $19, time_decay_factor = $20
        WHERE id = $21 AND game_id = $22`,
      [
        questionText, questionType, JSON.stringify(processedOptions), correctAnswer,
        hint, hintPenalty, timeLimit, marks, difficulty, explanation,
        evaluationMode, testCases ? JSON.stringify(testCases) : null, aiValidationSettings, imageUrl,
        crosswordGrid ? JSON.stringify(crosswordGrid) : null,
        crosswordClues ? JSON.stringify(crosswordClues) : null,
        JSON.stringify(crosswordSize),
        null, // partial_marking_settings
        timeDecayEnabled || false, // time_decay_enabled
        timeDecayFactor || 0.1, // time_decay_factor
        req.params.questionId, req.params.gameId
      ]
    );

    const updatedQuestion = await db.getAsync('SELECT * FROM questions WHERE id = $1', [req.params.questionId]);

    // Safely parse options for response
    let responseOptions = [];
    try {
      if (Array.isArray(question.options)) {
        responseOptions = question.options;
      } else if (typeof question.options === 'string') {
        responseOptions = JSON.parse(question.options || '[]');
      } else {
        responseOptions = [];
      }
      // Ensure it's always an array
      if (!Array.isArray(responseOptions)) {
        responseOptions = [];
      }
    } catch (parseError) {
      console.error('Error parsing question options for response:', parseError);
      responseOptions = [];
    }

    res.json({
      ...updatedQuestion,
      options: responseOptions
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Delete question
router.delete('/:gameId/questions/:questionId', authenticateToken, async (req, res) => {
  try {
    // Input validation
    if (!req.params.gameId || !req.params.questionId) {
      return res.status(400).json({ error: 'Game ID and Question ID are required' });
    }

    // Verify game exists and user has access
    const game = await db.getAsync('SELECT id FROM games WHERE id = $1 AND organizer_id = $2', [req.params.gameId, req.user.id]);
    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    // Verify question exists
    const question = await db.getAsync('SELECT id FROM questions WHERE id = $1 AND game_id = $2', [req.params.questionId, req.params.gameId]);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if question is currently referenced in game_sessions and log for debugging
    const sessionCheck = await db.getAsync('SELECT id FROM game_sessions WHERE current_question_id = $1', [req.params.questionId]);
    if (sessionCheck) {
      console.log('🛠️ QUESTION DELETION - Question is currently referenced in game_sessions, nullifying reference before deletion');
      await db.runAsync('UPDATE game_sessions SET current_question_id = NULL WHERE current_question_id = $1', [req.params.questionId]);
    }

    await db.runAsync(
      'DELETE FROM questions WHERE id = $1 AND game_id = $2',
      [req.params.questionId, req.params.gameId]
    );

    // Update question order for remaining questions (ensure sequential ordering)
    console.log('🔧 QUESTION ORDER FIX - Adjusting orders after deletion for game:', req.params.gameId);

    // Get all remaining questions ordered by current question_order
    const remainingQuestions = await db.allAsync(
      'SELECT id, question_order FROM questions WHERE game_id = $1 ORDER BY question_order',
      [req.params.gameId]
    );

    console.log('🔧 QUESTION ORDER FIX - Remaining questions before reordering:', remainingQuestions.map(q => ({ id: q.id, order: q.question_order })));

    // Recalculate sequential orders for all remaining questions
    for (let i = 0; i < remainingQuestions.length; i++) {
      const newOrder = i + 1;
      if (remainingQuestions[i].question_order !== newOrder) {
        await db.runAsync(
          'UPDATE questions SET question_order = $1 WHERE id = $2',
          [newOrder, remainingQuestions[i].id]
        );
        console.log(`🔧 Updated question ${remainingQuestions[i].id} from order ${remainingQuestions[i].question_order} to ${newOrder}`);
      }
    }

    console.log('✅ QUESTION ORDER FIX - All remaining questions reordered sequentially');

    // Update total questions count
    const questionCount = await db.getAsync(
      'SELECT COUNT(*) as count FROM questions WHERE game_id = $1',
      [req.params.gameId]
    );

    await db.runAsync(
      'UPDATE games SET total_questions = $1 WHERE id = $2',
      [questionCount.count, req.params.gameId]
    );

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Game control actions
router.post('/:gameId/start', authenticateToken, async (req, res) => {
  try {
    console.log('🎮 START GAME - Request received');
    console.log('🎮 START GAME - gameId:', req.params.gameId);
    console.log('🎮 START GAME - user.id:', req.user.id);

    // Input validation
    if (!req.params.gameId) {
      console.log('🎮 START GAME - ERROR: Game ID is required');
      return res.status(400).json({ error: 'Game ID is required' });
    }

    // Verify game exists and user has access
    console.log('🎮 START GAME - Checking game existence and access...');
    const game = await db.getAsync('SELECT * FROM games WHERE id = $1 AND organizer_id = $2', [req.params.gameId, req.user.id]);
    console.log('🎮 START GAME - Game query result:', game ? 'Found' : 'Not found');
    if (game) {
      console.log('🎮 START GAME - Game details:', {
        id: game.id,
        title: game.title,
        status: game.status,
        organizer_id: game.organizer_id,
        total_questions: game.total_questions
      });
    }

    if (!game) {
      console.log('🎮 START GAME - ERROR: Game not found or access denied');
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    // Check if game can be started
    console.log('🎮 START GAME - Checking game status:', game.status);
    console.log('🎮 START GAME - Expected status: draft');

    if (game.status !== 'draft') {
      console.log('🎮 START GAME - ERROR: Game cannot be started - invalid status:', game.status);

      // If game is already active, allow restart by resetting status
      if (game.status === 'active') {
        console.log('🎮 START GAME - Game is already active, allowing restart by resetting to draft');
        await db.runAsync(
          `UPDATE games SET status = 'draft', current_question_index = 0, started_at = NULL, ended_at = NULL
           WHERE id = $1 AND organizer_id = $2`,
          [req.params.gameId, req.user.id]
        );
        console.log('🎮 START GAME - Game status reset to draft for restart');
        game.status = 'draft'; // Update local variable for continued processing
      } else {
        return res.status(400).json({
          error: `Game cannot be started - invalid status: ${game.status}`,
          current_status: game.status,
          expected_status: 'draft',
          suggestion: game.status === 'pending' ? 'Game needs to be set to draft status first' : 'Check game status transition logic'
        });
      }
    }

    // Check if game has questions
    console.log('🎮 START GAME - Checking total questions:', game.total_questions);
    if (!game.total_questions || game.total_questions === 0) {
      console.log('🎮 START GAME - ERROR: Game has no questions');
      return res.status(400).json({ error: 'Game cannot be started - no questions found' });
    }
    console.log('🎮 START GAME - Updating game status to active...');

    // First, find the minimum question_order for this game
    const minOrderResult = await db.getAsync(
      'SELECT MIN(question_order) as min_order FROM questions WHERE game_id = $1',
      [req.params.gameId]
    );
    const minQuestionOrder = minOrderResult?.min_order;
    console.log('🎮 START GAME - Minimum question order found:', minQuestionOrder);

    if (!minQuestionOrder) {
      console.log('🎮 START GAME - ERROR: No questions found for game');
      return res.status(400).json({ error: 'Game cannot be started - no questions found' });
    }

    await db.runAsync(
      `UPDATE games SET status = 'active', started_at = CURRENT_TIMESTAMP, current_question_index = $3
        WHERE id = $1 AND organizer_id = $2`,
      [req.params.gameId, req.user.id, minQuestionOrder]
    );
    console.log('🎮 START GAME - Game status updated successfully');

    // Get first question
    console.log('🎮 START GAME - Fetching first question...');
    console.log('🎮 START GAME - Game ID:', req.params.gameId);
    console.log('🎮 START GAME - Querying for question_order =', minQuestionOrder);

    // First, let's verify what questions exist for this game
    const allQuestions = await db.allAsync(
      'SELECT id, question_order, question_text FROM questions WHERE game_id = $1 ORDER BY question_order',
      [req.params.gameId]
    );
    console.log('🎮 START GAME - All questions for game:', allQuestions.length);
    console.log('🎮 START GAME - Question details:', allQuestions.map(q => ({
      id: q.id,
      order: q.question_order,
      text: q.question_text?.substring(0, 50) + '...'
    })));

    const firstQuestion = await db.getAsync(
      'SELECT * FROM questions WHERE game_id = $1 AND question_order = $2',
      [req.params.gameId, minQuestionOrder]
    );
    console.log('🎮 START GAME - First question query result:', firstQuestion ? 'Found' : 'Not found');
    console.log('🎮 START GAME - First question ID:', firstQuestion?.id);
    console.log('🎮 START GAME - First question order:', firstQuestion?.question_order);

    if (firstQuestion) {
      console.log('🎮 START GAME - First question details:', {
        id: firstQuestion.id,
        question_text: firstQuestion.question_text,
        time_limit: firstQuestion.time_limit
      });

      // Create game session (no server-side time tracking)
      console.log('🎮 START GAME - Creating game session...');
      await db.runAsync(
        `INSERT INTO game_sessions (game_id, current_question_id, question_started_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        [req.params.gameId, firstQuestion.id]
      );
      console.log('🎮 START GAME - Game session created successfully');

      // Emit to all participants
      console.log('📡 Emitting gameStarted event to room:', `game-${req.params.gameId}`);
      try {
        // Safely parse options
        let parsedOptions = [];
        try {
          parsedOptions = firstQuestion.options ? JSON.parse(firstQuestion.options) : [];
          if (!Array.isArray(parsedOptions)) {
            parsedOptions = [];
          }
        } catch (parseError) {
          console.warn('⚠️ Failed to parse question options, using empty array:', parseError);
          parsedOptions = [];
        }

        console.log('📡 Emitting gameStarted with options:', parsedOptions, 'length:', parsedOptions.length);
        io.to(`game-${req.params.gameId}`).emit('gameStarted', {
          question: {
            ...firstQuestion,
            options: parsedOptions
          }
        });
        console.log('✅ Game started event emitted successfully - timer starts now for all participants');
      } catch (emitError) {
        console.error('❌ Error emitting gameStarted event:', emitError);
      }
    } else {
      console.log('❌ No first question found for game:', req.params.gameId);
      console.log('❌ Available questions:', allQuestions);
      return res.status(400).json({ error: 'Game cannot be started - no questions found' });
    }

    console.log('🎮 START GAME - Game started successfully');
    res.json({ message: 'Game started successfully' });
  } catch (error) {
    console.error('🎮 START GAME - ERROR occurred:', error);
    console.error('🎮 START GAME - Error message:', error.message);
    console.error('🎮 START GAME - Error stack:', error.stack);
    console.error('🎮 START GAME - Error code:', error.code);
    console.error('🎮 START GAME - Error details:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

router.post('/:gameId/next-question', authenticateToken, async (req, res) => {
  try {
    console.log('🎯 NEXT QUESTION - Request received');
    console.log('🎯 NEXT QUESTION - gameId:', req.params.gameId);
    console.log('🎯 NEXT QUESTION - user.id:', req.user.id);

    // Input validation
    if (!req.params.gameId) {
      console.log('🎯 NEXT QUESTION - ERROR: Game ID is required');
      return res.status(400).json({ error: 'Game ID is required' });
    }

    console.log('🎯 NEXT QUESTION - Fetching game details...');
    const game = await db.getAsync('SELECT * FROM games WHERE id = $1 AND organizer_id = $2', [req.params.gameId, req.user.id]);
    console.log('🎯 NEXT QUESTION - Game query result:', game ? 'Found' : 'Not found');

    if (!game) {
      console.log('🎯 NEXT QUESTION - ERROR: Game not found or access denied');
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    // Check if game is active
    console.log('🎯 NEXT QUESTION - Game status:', game.status);
    if (game.status !== 'active') {
      console.log('🎯 NEXT QUESTION - ERROR: Game is not active, current status:', game.status);
      return res.status(400).json({
        error: 'Game is not active',
        current_status: game.status,
        required_status: 'active'
      });
    }

    const nextQuestionIndex = game.current_question_index + 1;
    console.log('🎯 NEXT QUESTION - Current question index:', game.current_question_index);
    console.log('🎯 NEXT QUESTION - Next question index:', nextQuestionIndex);

    // Get next question
    console.log('🎯 NEXT QUESTION - Fetching next question...');
    const nextQuestion = await db.getAsync(
        'SELECT * FROM questions WHERE game_id = $1 AND question_order = $2',
        [req.params.gameId, nextQuestionIndex]
      );
    console.log('🎯 NEXT QUESTION - Next question query result:', nextQuestion ? 'Found' : 'Not found');

    if (!nextQuestion) {
      console.log('🎯 NEXT QUESTION - ERROR: No more questions available');
      return res.status(400).json({ error: 'No more questions' });
    }

    console.log('🎯 NEXT QUESTION - Next question details:', {
      id: nextQuestion.id,
      question_order: nextQuestion.question_order,
      question_text: nextQuestion.question_text?.substring(0, 50) + '...'
    });

    // Update game current question index
    console.log('🎯 NEXT QUESTION - Updating game current_question_index...');
    await db.runAsync(
      'UPDATE games SET current_question_index = $1 WHERE id = $2',
      [nextQuestionIndex, req.params.gameId]
    );

    // Create or update game session for the new question (no server-side time tracking)
    console.log('🎯 NEXT QUESTION - Creating/updating game session...');

    // Check if session exists
    const existingSession = await db.getAsync('SELECT id FROM game_sessions WHERE game_id = $1', [req.params.gameId]);
    console.log('🎯 NEXT QUESTION - Existing session:', existingSession ? 'Found' : 'Not found');

    if (existingSession) {
      // Update existing session
      await db.runAsync(
        `UPDATE game_sessions SET
          current_question_id = $1,
          question_started_at = CURRENT_TIMESTAMP,
          answers_revealed = FALSE
         WHERE game_id = $2`,
        [nextQuestion.id, req.params.gameId]
      );
      console.log('🎯 NEXT QUESTION - Game session updated');
    } else {
      // Create new session
      await db.runAsync(
        `INSERT INTO game_sessions (game_id, current_question_id, question_started_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        [req.params.gameId, nextQuestion.id]
      );
      console.log('🎯 NEXT QUESTION - Game session created');
    }

    // Emit to all participants
    console.log('📡 NEXT QUESTION - Emitting nextQuestion event to room:', `game-${req.params.gameId}`);
    try {
      // Safely parse options
      let parsedOptions = [];
      try {
        parsedOptions = nextQuestion.options ? JSON.parse(nextQuestion.options) : [];
        if (!Array.isArray(parsedOptions)) {
          parsedOptions = [];
        }
      } catch (parseError) {
        console.warn('⚠️ Failed to parse question options, using empty array:', parseError);
        parsedOptions = [];
      }

      console.log('📡 Emitting nextQuestion with options:', parsedOptions, 'length:', parsedOptions.length);
      io.to(`game-${req.params.gameId}`).emit('nextQuestion', {
        question: {
          ...nextQuestion,
          options: parsedOptions
        }
      });
      console.log('✅ NEXT QUESTION - nextQuestion event emitted successfully - timer starts now for all participants');
    } catch (emitError) {
      console.error('❌ NEXT QUESTION - Error emitting nextQuestion event:', emitError);
    }

    console.log('🎯 NEXT QUESTION - Request completed successfully');
    res.json({ message: 'Next question started' });
  } catch (error) {
    console.error('🎯 NEXT QUESTION - ERROR occurred:', error);
    console.error('🎯 NEXT QUESTION - Error message:', error.message);
    console.error('🎯 NEXT QUESTION - Error stack:', error.stack);
    console.error('🎯 NEXT QUESTION - Error code:', error.code);
    console.error('🎯 NEXT QUESTION - Error details:', error);
    res.status(500).json({ error: 'Failed to start next question' });
  }
});

router.post('/:gameId/reveal-answer', authenticateToken, async (req, res) => {
  try {
    console.log('👁️ REVEAL ANSWER - Request received');
    console.log('👁️ REVEAL ANSWER - gameId:', req.params.gameId);
    console.log('👁️ REVEAL ANSWER - user.id:', req.user.id);

    // Input validation
    if (!req.params.gameId) {
      console.log('👁️ REVEAL ANSWER - ERROR: Game ID is required');
      return res.status(400).json({ error: 'Game ID is required' });
    }

    // Verify game exists and user has access
    console.log('👁️ REVEAL ANSWER - Verifying game access...');
    const game = await db.getAsync('SELECT id, status FROM games WHERE id = $1 AND organizer_id = $2', [req.params.gameId, req.user.id]);
    console.log('👁️ REVEAL ANSWER - Game query result:', game ? 'Found' : 'Not found');

    if (!game) {
      console.log('👁️ REVEAL ANSWER - ERROR: Game not found or access denied');
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    // Check if game is active
    console.log('👁️ REVEAL ANSWER - Game status:', game.status);
    if (game.status !== 'active') {
      console.log('👁️ REVEAL ANSWER - ERROR: Game is not active, current status:', game.status);
      return res.status(400).json({
        error: 'Game is not active',
        current_status: game.status,
        required_status: 'active'
      });
    }

    // Get current question from game session
    console.log('👁️ REVEAL ANSWER - Fetching current question from session...');
    const session = await db.getAsync(
      `SELECT gs.*, q.* FROM game_sessions gs
        JOIN questions q ON gs.current_question_id = q.id
        WHERE gs.game_id = $1`,
      [req.params.gameId]
    );
    console.log('👁️ REVEAL ANSWER - Session query result:', session ? 'Found' : 'Not found');

    if (!session) {
      console.log('👁️ REVEAL ANSWER - ERROR: No active question session');
      return res.status(400).json({ error: 'No active question session' });
    }

    console.log('👁️ REVEAL ANSWER - Current question details:', {
      id: session.current_question_id,
      question_text: session.question_text?.substring(0, 50) + '...',
      correct_answer: session.correct_answer?.substring(0, 50) + '...'
    });

    // Mark answers as revealed
    console.log('👁️ REVEAL ANSWER - Marking answers as revealed...');
    await db.runAsync(
      'UPDATE game_sessions SET answers_revealed = TRUE WHERE game_id = $1',
      [req.params.gameId]
    );

    // Calculate and update leaderboard
    console.log('👁️ REVEAL ANSWER - Updating leaderboard...');
    await updateLeaderboard(req.params.gameId);

    // Prepare correct answer for emission
    let correctAnswer = session.correct_answer;
    try {
      // Try to parse if it's JSON (for multiple answers)
      const parsed = JSON.parse(session.correct_answer);
      if (Array.isArray(parsed)) {
        correctAnswer = parsed;
      }
    } catch (parseError) {
      // It's a simple string answer, use as-is
      console.log('👁️ REVEAL ANSWER - Correct answer is a simple string');
    }

    console.log('👁️ REVEAL ANSWER - Correct answer to emit:', typeof correctAnswer, Array.isArray(correctAnswer) ? correctAnswer.length + ' items' : correctAnswer?.substring(0, 50) + '...');

    // Emit answer reveal to all participants
    console.log('📡 REVEAL ANSWER - Emitting answerRevealed event to room:', `game-${req.params.gameId}`);
    try {
      io.to(`game-${req.params.gameId}`).emit('answerRevealed', {
        correctAnswer: correctAnswer,
        explanation: session.explanation || ''
      });
      console.log('✅ REVEAL ANSWER - answerRevealed event emitted successfully');
    } catch (emitError) {
      console.error('❌ REVEAL ANSWER - Error emitting answerRevealed event:', emitError);
    }

    console.log('👁️ REVEAL ANSWER - Request completed successfully');
    res.json({ message: 'Answer revealed successfully' });
  } catch (error) {
    console.error('👁️ REVEAL ANSWER - ERROR occurred:', error);
    console.error('👁️ REVEAL ANSWER - Error message:', error.message);
    console.error('👁️ REVEAL ANSWER - Error stack:', error.stack);
    console.error('👁️ REVEAL ANSWER - Error code:', error.code);
    console.error('👁️ REVEAL ANSWER - Error details:', error);
    res.status(500).json({ error: 'Failed to reveal answer' });
  }
});

router.post('/:gameId/end', authenticateToken, async (req, res) => {
  try {
    // Input validation
    if (!req.params.gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    // Verify game exists and user has access
    const game = await db.getAsync('SELECT * FROM games WHERE id = $1 AND organizer_id = $2', [req.params.gameId, req.user.id]);
    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    // Check if game can be ended
    if (game.status !== 'active') {
      return res.status(400).json({
        error: 'Game is not active',
        current_status: game.status,
        required_status: 'active'
      });
    }

    await db.runAsync(
      `UPDATE games SET status = 'completed', ended_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND organizer_id = $2`,
      [req.params.gameId, req.user.id]
    );

    // Calculate final rankings
    await updateLeaderboard(req.params.gameId);

    // Apply qualification rules
    await applyQualificationRules(req.params.gameId);

    // Emit game end to all participants
    io.to(`game-${req.params.gameId}`).emit('gameEnded');

    res.json({ message: 'Game ended successfully' });
  } catch (error) {
    console.error('End game error:', error);
    res.status(500).json({ error: 'Failed to end game' });
  }
});

router.post('/:gameId/pause', authenticateToken, async (req, res) => {
  try {
    // Input validation
    if (!req.params.gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    const game = await db.getAsync('SELECT * FROM games WHERE id = $1 AND organizer_id = $2', [req.params.gameId, req.user.id]);

    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    if (game.status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }

    // Update game status to paused
    await db.runAsync(
      'UPDATE games SET status = $1 WHERE id = $2',
      ['paused', req.params.gameId]
    );

    // Record pause time in game session
    await db.runAsync(
      'UPDATE game_sessions SET paused_at = CURRENT_TIMESTAMP WHERE game_id = $1',
      [req.params.gameId]
    );

    // Emit pause event to all participants
    io.to(`game-${req.params.gameId}`).emit('gamePaused');

    res.json({ message: 'Game paused successfully' });
  } catch (error) {
    console.error('Pause game error:', error);
    res.status(500).json({ error: 'Failed to pause game' });
  }
});

router.post('/:gameId/resume', authenticateToken, async (req, res) => {
  try {
    // Input validation
    if (!req.params.gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    const game = await db.getAsync('SELECT * FROM games WHERE id = $1 AND organizer_id = $2', [req.params.gameId, req.user.id]);

    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    if (game.status !== 'paused') {
      return res.status(400).json({
        error: 'Game is not paused',
        current_status: game.status,
        required_status: 'paused'
      });
    }

    // Get current session
    const session = await db.getAsync(
      'SELECT * FROM game_sessions WHERE game_id = $1',
      [req.params.gameId]
    );

    // Clear pause state (no server-side time tracking)
    await db.runAsync(
      'UPDATE game_sessions SET paused_at = NULL WHERE game_id = $1',
      [req.params.gameId]
    );

    // Update game status back to active
    await db.runAsync(
      'UPDATE games SET status = $1 WHERE id = $2',
      ['active', req.params.gameId]
    );

    // Emit resume event to all participants
    io.to(`game-${req.params.gameId}`).emit('gameResumed');

    res.json({ message: 'Game resumed successfully' });
  } catch (error) {
    console.error('Resume game error:', error);
    res.status(500).json({ error: 'Failed to resume game' });
  }
});

// Public leaderboard
router.get('/:gameCode/leaderboard', async (req, res) => {
  try {
    // Input validation
    if (!req.params.gameCode) {
      return res.status(400).json({ error: 'Game code is required' });
    }

    const game = await db.getAsync('SELECT id, qr_code_url FROM games WHERE game_code = $1', [req.params.gameCode]);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    let qrCodeUrl = game.qr_code_url;
    if (!qrCodeUrl) {
      // Generate QR code if it doesn't exist
      qrCodeUrl = await generateAndUploadQRCode(req.params.gameCode);
      // Update game with QR code URL
      await db.runAsync(
        'UPDATE games SET qr_code_url = $1 WHERE id = $2',
        [qrCodeUrl, game.id]
      );
    }

    const leaderboard = await db.allAsync(
      `SELECT name, avatar, total_score, current_rank, status
       FROM participants
       WHERE game_id = $1 AND status = 'active'
       ORDER BY total_score DESC, joined_at ASC`,
      [game.id]
    );

    res.json({
      leaderboard,
      qrCodeUrl: qrCodeUrl
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Helper function to update leaderboard
// This function recalculates participant rankings based on their total scores
// and broadcasts the updated leaderboard to all connected clients in real-time
async function updateLeaderboard(gameId) {
  try {
    // Input validation
    if (!gameId) {
      console.error('updateLeaderboard: gameId is required');
      return;
    }

    const participantRepository = AppDataSource.getRepository('Participant');

    // Fetch all active participants ordered by score (highest first)
    const participants = await participantRepository.find({
      where: { game_id: gameId, status: 'active' },
      order: { total_score: 'DESC' },
      select: ['id', 'total_score']
    });

    // Rank is 1-indexed (1st place, 2nd place, etc.)
    for (let i = 0; i < participants.length; i++) {
      try {
        await participantRepository.update(
          { id: participants[i].id },
          { current_rank: i + 1 }
        );
      } catch (updateError) {
        console.error(`Error updating rank for participant ${participants[i].id}:`, updateError);
      }
    }

    // Fetch complete leaderboard data for broadcasting
    // Includes participant names, avatars, scores, and ranks
    const leaderboard = await participantRepository.find({
      where: { game_id: gameId, status: 'active' },
      order: { total_score: 'DESC' },
      select: ['name', 'avatar', 'total_score', 'current_rank']
    });

    // Emit real-time leaderboard update to all game participants
    io.to(`game-${gameId}`).emit('leaderboardUpdate', leaderboard);
  } catch (error) {
    console.error('Error in updateLeaderboard:', error);
  }
}

// Helper function to apply qualification rules
// This function implements different qualification strategies based on game settings:
// - top_n: Top N highest scoring participants qualify
// - top_percentage: Top X% of participants qualify
// - custom_threshold: Participants above a score threshold qualify
// - none: No qualification rules applied
async function applyQualificationRules(gameId) {
  try {
    // Input validation
    if (!gameId) {
      console.error('applyQualificationRules: gameId is required');
      return;
    }

    const gameRepository = AppDataSource.getRepository('Game');
    const participantRepository = AppDataSource.getRepository('Participant');

    // Fetch game qualification settings
    const game = await gameRepository.findOne({
      where: { id: gameId },
      select: ['qualification_type', 'qualification_threshold']
    });

    // Skip if no qualification rules are set
    if (!game || game.qualification_type === 'none') {
      return;
    }

    // Validate qualification settings
    if (game.qualification_type === 'top_n' && (!game.qualification_threshold || game.qualification_threshold < 1)) {
      console.error('Invalid qualification_threshold for top_n:', game.qualification_threshold);
      return;
    }
    if (game.qualification_type === 'top_percentage' &&
        (!game.qualification_threshold || game.qualification_threshold < 0 || game.qualification_threshold > 100)) {
      console.error('Invalid qualification_threshold for top_percentage:', game.qualification_threshold);
      return;
    }
    if (game.qualification_type === 'custom_threshold' && game.qualification_threshold == null) {
      console.error('Missing qualification_threshold for custom_threshold');
      return;
    }

    // Get all active participants sorted by score (highest first)
    const participants = await participantRepository.find({
      where: { game_id: gameId, status: 'active' },
      order: { total_score: 'DESC' },
      select: ['id', 'total_score']
    });

    let qualifiedCount = 0;

    // Calculate number of qualified participants based on qualification type
    if (game.qualification_type === 'top_n') {
      // Top N participants qualify (capped at total participants)
      qualifiedCount = Math.min(game.qualification_threshold, participants.length);
    } else if (game.qualification_type === 'top_percentage') {
      // Top X% of participants qualify (rounded up)
      qualifiedCount = Math.ceil((game.qualification_threshold / 100) * participants.length);
    } else if (game.qualification_type === 'custom_threshold') {
      // Count participants who meet or exceed the score threshold
      qualifiedCount = participants.filter(p => p.total_score >= game.qualification_threshold).length;
    }

    // Update qualification status for qualified participants (top of the leaderboard)
    for (let i = 0; i < qualifiedCount; i++) {
      try {
        await participantRepository.update(
          { id: participants[i].id },
          { qualified: true }
        );
      } catch (updateError) {
        console.error(`Error updating qualification for participant ${participants[i].id}:`, updateError);
      }
    }

    // Mark remaining participants as unqualified
    for (let i = qualifiedCount; i < participants.length; i++) {
      try {
        await participantRepository.update(
          { id: participants[i].id },
          { qualified: false }
        );
      } catch (updateError) {
        console.error(`Error updating qualification for participant ${participants[i].id}:`, updateError);
      }
    }
  } catch (error) {
    console.error('Error in applyQualificationRules:', error);
  }
}