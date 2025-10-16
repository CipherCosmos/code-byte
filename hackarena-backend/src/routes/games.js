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
    // Return both snake_case and camelCase for frontend compatibility
    res.json({ image_url: imageUrl, imageUrl });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Get all games for organizer
router.get('/', authenticateToken, async (req, res) => {
  try {

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
    // Input validation and authorization
    if (!req.params.gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    const game = await db.getAsync(
      'SELECT * FROM games WHERE id = $1 AND organizer_id = $2',
      [req.params.gameId, req.user.id]
    );

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const questions = await db.allAsync(
      'SELECT * FROM questions WHERE game_id = $1 ORDER BY question_order',
      [game.id]
    );

    // Parse additional fields for each question based on type
    const parsedQuestions = questions.map(question => {
      let parsedOptions = [];
      let parsedCrosswordGrid = null;
      let parsedCrosswordClues = null;
      let parsedCrosswordSize = null;
      let parsedTestCases = null;
      let parsedCodeLanguages = null;

      try {
        if (question.options) {
          if (Array.isArray(question.options)) {
            // Already an array, use as-is
            parsedOptions = [...question.options];
          } else if (typeof question.options === 'string') {
            const trimmedOptions = question.options.trim();

            if (trimmedOptions.startsWith('[') && trimmedOptions.endsWith(']')) {
              // JSON string array
              try {
                parsedOptions = JSON.parse(trimmedOptions);
              } catch (parseError) {
                // Fallback: try splitting by comma
                parsedOptions = trimmedOptions.slice(1, -1).split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
              }
            } else if (trimmedOptions.includes(',')) {
              // Comma-separated string
              parsedOptions = trimmedOptions.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
            } else if (trimmedOptions.length > 0) {
              // Single string value
              parsedOptions = [trimmedOptions];
            } else {
              // Empty string
              parsedOptions = [];
            }
          } else {
            // Other types
            parsedOptions = [];
          }

          // Ensure we always have an array
          if (!Array.isArray(parsedOptions)) {
            parsedOptions = [];
          }

          // Filter out empty strings and trim whitespace
          parsedOptions = parsedOptions
            .filter(opt => opt != null && String(opt).trim().length > 0)
            .map(opt => String(opt).trim());
        }
      } catch (error) {
        console.error('Error parsing options for question', question.id, ':', error);
        parsedOptions = [];
      }

      try {
        if (question.crossword_grid) {
          parsedCrosswordGrid = JSON.parse(question.crossword_grid);
        }
      } catch (error) {
        console.error('Error parsing crossword grid for question', question.id, ':', error);
      }

      try {
        if (question.crossword_clues) {
          if (typeof question.crossword_clues === 'object') {
            // Already parsed object, use directly
            parsedCrosswordClues = question.crossword_clues;
          } else if (typeof question.crossword_clues === 'string') {
            // JSON string, parse it
            parsedCrosswordClues = JSON.parse(question.crossword_clues);
          } else {
            // Invalid type, set to null
            parsedCrosswordClues = null;
          }
        }
      } catch (error) {
        console.error('Error parsing crossword clues for question', question.id, ':', error);
        parsedCrosswordClues = null;
      }

      try {
        if (question.crossword_size) {
          parsedCrosswordSize = JSON.parse(question.crossword_size);
        }
      } catch (error) {
        console.error('Error parsing crossword size for question', question.id, ':', error);
      }

      try {
        if (question.test_cases) {
          parsedTestCases = JSON.parse(question.test_cases);
        }
      } catch (error) {
        console.error('Error parsing test cases for question', question.id, ':', error);
      }

      try {
        if (question.code_languages) {
          parsedCodeLanguages = JSON.parse(question.code_languages);
        }
      } catch (error) {
        console.error('Error parsing code languages for question', question.id, ':', error);
      }

      return {
        ...question,
        options: parsedOptions,
        crosswordGrid: parsedCrosswordGrid,
        crosswordClues: parsedCrosswordClues,
        crosswordSize: parsedCrosswordSize,
        testCases: parsedTestCases,
        codeLanguages: parsedCodeLanguages
      };
    });

    const participants = await db.allAsync(
      `SELECT id, name, avatar, total_score, current_rank, status, qualified, cheat_warnings, joined_at
       FROM participants WHERE game_id = $1 ORDER BY total_score DESC`,
      [game.id]
    );

    const joinUrl = `${process.env.FRONTEND_URL}/join/${game.game_code}`;

    let qrCodeUrl;
    if (game.qr_code_url) {
      // Use existing QR code if available
      qrCodeUrl = game.qr_code_url;
    } else {
      // Generate new QR code if not exists
      qrCodeUrl = await generateAndUploadQRCode(game.game_code);
      // Update game with QR code URL
      await db.runAsync(
        'UPDATE games SET qr_code_url = $1 WHERE id = $2',
        [qrCodeUrl, game.id]
      );
    }

    res.json({
      ...game,
      questions: parsedQuestions,
      participants,
      qrCode: qrCodeUrl,
      joinUrl
    });
  } catch (error) {
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

    // 2. Delete game sessions for this game (before deleting questions)
    await db.runAsync(
      'DELETE FROM game_sessions WHERE game_id = $1',
      [req.params.gameId]
    );

    // 3. Delete answers for this game
    await db.runAsync(
      `DELETE FROM answers
       WHERE question_id IN (
         SELECT id FROM questions WHERE game_id = $1
       )`,
      [req.params.gameId]
    );

    // 4. Delete participants for this game
    await db.runAsync(
      'DELETE FROM participants WHERE game_id = $1',
      [req.params.gameId]
    );

    // 5. Nullify any remaining references to questions in game_sessions before deleting questions
    await db.runAsync(
      'UPDATE game_sessions SET current_question_id = NULL WHERE current_question_id IN (SELECT id FROM questions WHERE game_id = $1)',
      [req.params.gameId]
    );

    // 6. Delete questions for this game
    await db.runAsync(
      'DELETE FROM questions WHERE game_id = $1',
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

// Helper function to parse options
function parseOptions(options) {
  let processedOptions = [];

  try {
    if (Array.isArray(options)) {
      processedOptions = [...options];
    } else if (typeof options === 'string') {
      const trimmed = options.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        processedOptions = JSON.parse(trimmed);
      } else if (trimmed.includes(',')) {
        processedOptions = trimmed.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
      } else if (trimmed.length > 0) {
        processedOptions = [trimmed];
      }
    } else if (options != null) {
      processedOptions = [String(options)];
    }

    processedOptions = processedOptions
      .filter(opt => opt != null && String(opt).trim().length > 0)
      .map(opt => String(opt).trim());
  } catch (error) {
    console.error('Error parsing options:', error);
    processedOptions = [];
  }

  return processedOptions;
}

// Add question to game
router.post('/:gameId/questions', authenticateToken, async (req, res) => {
  let transactionStarted = false;

  try {
    // Input validation and authorization
    if (!req.params.gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    // Verify game exists and user has access
    const game = await db.getAsync('SELECT id FROM games WHERE id = $1 AND organizer_id = $2', [req.params.gameId, req.user.id]);
    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

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
      timeDecayFactor,
      code_languages,
      timeoutLimit: code_timeout,
      memoryLimit: code_memory_limit,
      code_template
    } = req.body;

    // Extract fields from request body

    // Use a mutable variable for correctAnswer processing
    let correctAnswer = initialCorrectAnswer;

    // Normalize incoming payloads for broader frontend compatibility
    // 1) Treat 'code' as 'code_snippet'
    if (questionType === 'code') {
      questionType = 'code_snippet';
    }
    // 2) True/False defaults
    if (questionType === 'true_false') {
      // Force exactly two options regardless of incoming payload
      options = ['True', 'False'];
      if (typeof correctAnswer === 'boolean') {
        correctAnswer = correctAnswer ? 'True' : 'False';
      }
      if (!correctAnswer || String(correctAnswer).trim() === '') {
        correctAnswer = 'True';
      }
    }
    // 3) Image defaults - be lenient to allow creation
    if (questionType === 'image') {
      // Normalize image question payload for robust creation
      options = [];
      evaluationMode = 'mcq';
      if (!imageUrl || String(imageUrl).trim() === '') {
        imageUrl = null;
      }
      if (!correctAnswer || String(correctAnswer).trim() === '') {
        correctAnswer = 'image';
      }
    }
    // 4) Code question defaults
    if (questionType === 'code_snippet') {
      if (!evaluationMode || evaluationMode === 'mcq') {
        evaluationMode = 'compiler';
      }
      // Build code_languages from single selections if missing
      if (!code_languages || String(code_languages).trim() === '') {
        const lang = (req.body.codeLanguage || req.body.ideLanguage || 'javascript');
        code_languages = JSON.stringify([String(lang)]);
      } else if (typeof code_languages !== 'string') {
        try { code_languages = JSON.stringify(code_languages); } catch { code_languages = JSON.stringify(['javascript']); }
      }
      // Provide minimal testCases when required
      if ((evaluationMode === 'compiler' || evaluationMode === 'bugfix')) {
        if (!testCases || String(testCases).trim() === '') {
          testCases = JSON.stringify([{ input: '', expectedOutput: '' }]);
        }
      }
      // If semantic and provided correctAnswer is too short, switch to compiler
      if (evaluationMode === 'semantic' && (!correctAnswer || String(correctAnswer).trim().length < 10)) {
        evaluationMode = 'compiler';
        if (!testCases || String(testCases).trim() === '') {
          testCases = JSON.stringify([{ input: '', expectedOutput: '' }]);
        }
      }
    }

    // Validate required fields
    if (!questionText || !questionType) {
      return res.status(400).json({ error: 'Question text and type are required' });
    }

    // Process options using helper function
    const processedOptions = parseOptions(options);

    // Validate question type specific requirements
    if (questionType === 'mcq' || questionType === 'multiple_choice') {
      if (processedOptions.length < 2) {
        return res.status(400).json({ error: 'MCQ questions must have at least 2 options' });
      }
    }

    if (questionType === 'true_false') {
      if (processedOptions.length !== 2) {
        return res.status(400).json({ error: 'True/False questions must have exactly 2 options' });
      }
    }

    if (questionType === 'multiple_answers') {
      if (processedOptions.length < 2) {
        return res.status(400).json({ error: 'Multiple answers questions must have at least 2 options' });
      }

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
        processedCorrectAnswer = [];
      }

      if (processedCorrectAnswer.length < 1) {
        return res.status(400).json({ error: 'Multiple answers questions must have at least 1 correct answer' });
      }

      // Validate correct answers
      for (const ans of processedCorrectAnswer) {
        const normalizedAns = typeof ans === 'string' ? ans.trim() : ans;
        if (typeof normalizedAns === 'number') {
          if (normalizedAns < 0 || normalizedAns >= processedOptions.length) {
            return res.status(400).json({ error: 'Invalid correct answer index' });
          }
        } else if (typeof normalizedAns === 'string') {
          if (!processedOptions.some(opt => String(opt).trim() === normalizedAns)) {
            return res.status(400).json({ error: 'Invalid correct answer value' });
          }
        } else {
          return res.status(400).json({ error: 'Correct answers must be indices or option values' });
        }
      }

      correctAnswer = JSON.stringify(processedCorrectAnswer);
    }

    if (questionType === 'image') {
      // Relaxed: if imageUrl provided, validate; else allow null. Ensure correctAnswer non-empty (already defaulted).
      if (imageUrl && String(imageUrl).trim() !== '') {
        try {
          const url = new URL(imageUrl);
          if (!['http:', 'https:'].includes(url.protocol)) {
            return res.status(400).json({ error: 'Image URL must be a valid HTTP/HTTPS URL' });
          }
        } catch (error) {
          return res.status(400).json({ error: 'Invalid image URL format' });
        }
      }
    }

    if (questionType === 'crossword') {
      if (!crosswordGrid || !crosswordClues || !crosswordSize) {
        return res.status(400).json({ error: 'Crossword questions must have grid, clues, and size' });
      }
      try {
        const grid = JSON.parse(crosswordGrid);
        if (!Array.isArray(grid) || grid.length === 0) {
          return res.status(400).json({ error: 'Crossword grid must be a non-empty array' });
        }
        const firstRow = grid[0];
        if (!Array.isArray(firstRow)) {
          return res.status(400).json({ error: 'Crossword grid rows must be arrays' });
        }
        const expectedCols = firstRow.length;
        for (let i = 1; i < grid.length; i++) {
          if (!Array.isArray(grid[i]) || grid[i].length !== expectedCols) {
            return res.status(400).json({ error: 'All crossword grid rows must have the same number of columns' });
          }
        }
      } catch (error) {
        return res.status(400).json({ error: 'Invalid crossword grid format' });
      }
      try {
        const clues = JSON.parse(crosswordClues);
        if (typeof clues !== 'object' || clues === null) {
          return res.status(400).json({ error: 'Crossword clues must be a valid object' });
        }
      } catch (error) {
        return res.status(400).json({ error: 'Invalid crossword clues format' });
      }
      try {
        const size = JSON.parse(crosswordSize);
        if (typeof size !== 'object' || size === null || !size.rows || !size.cols) {
          return res.status(400).json({ error: 'Crossword size must be an object with rows and cols properties' });
        }
        if (typeof size.rows !== 'number' || typeof size.cols !== 'number' || size.rows < 1 || size.cols < 1) {
          return res.status(400).json({ error: 'Crossword size rows and cols must be positive numbers' });
        }
      } catch (error) {
        return res.status(400).json({ error: 'Invalid crossword size format' });
      }
    }

    if (questionType === 'code_snippet') {
      // evaluationMode ensured above
      const validEvaluationModes = ['semantic', 'compiler', 'bugfix'];
      if (!validEvaluationModes.includes(evaluationMode)) {
        return res.status(400).json({ error: `Invalid evaluation mode. Must be one of: ${validEvaluationModes.join(', ')}` });
      }
      // code_languages ensured above
      try {
        const languages = JSON.parse(code_languages);
        if (!Array.isArray(languages) || languages.length === 0) {
          return res.status(400).json({ error: 'Code languages must be a non-empty array' });
        }
        const supportedLanguages = ['javascript', 'python', 'java', 'cpp'];
        for (const lang of languages) {
          if (!supportedLanguages.includes(lang)) {
            return res.status(400).json({ error: `Unsupported language: ${lang}. Supported: ${supportedLanguages.join(', ')}` });
          }
        }
      } catch (error) {
        return res.status(400).json({ error: 'Invalid code languages format' });
      }
      if (code_timeout != null) {
        const timeout = Number(code_timeout);
        if (isNaN(timeout) || timeout < 1 || timeout > 300) {
          // Clamp to safe default instead of rejecting
          code_timeout = 30;
        }
      }
      if (code_memory_limit != null) {
        const memoryLimit = Number(code_memory_limit);
        if (isNaN(memoryLimit) || memoryLimit < 32 || memoryLimit > 1024) {
          return res.status(400).json({ error: 'Code memory limit must be between 32MB and 1024MB' });
        }
      }
      if ((evaluationMode === 'compiler' || evaluationMode === 'bugfix') && (!testCases || testCases.trim() === '')) {
        return res.status(400).json({ error: 'Test cases are required for compiler/bugfix evaluation' });
      }
      if (evaluationMode === 'compiler' || evaluationMode === 'bugfix') {
        try {
          const parsedTestCases = JSON.parse(testCases);
          if (!Array.isArray(parsedTestCases) || parsedTestCases.length === 0) {
            return res.status(400).json({ error: 'Test cases must be a non-empty array' });
          }
          for (const testCase of parsedTestCases) {
            if (!testCase.hasOwnProperty('input') || !testCase.hasOwnProperty('expectedOutput')) {
              return res.status(400).json({ error: 'Each test case must have input and expectedOutput properties' });
            }
            if (typeof testCase.input !== 'string' || typeof testCase.expectedOutput !== 'string') {
              return res.status(400).json({ error: 'Test case input and expectedOutput must be strings' });
            }
          }
        } catch (error) {
          return res.status(400).json({ error: 'Invalid test cases format' });
        }
      }
      if (evaluationMode === 'semantic' && (!correctAnswer || correctAnswer.trim().length < 10)) {
        return res.status(400).json({ error: 'Semantic evaluation requires a correct code answer (at least 10 characters)' });
      }
    }

    if (questionType === 'fill_blank' || questionType === 'short_answer') {
      if (!correctAnswer || correctAnswer.trim() === '') {
        return res.status(400).json({ error: `${questionType.replace('_', ' ')} questions must have a correct answer` });
      }
    }

    // Validate marks and time limits
    if (marks != null) {
      const numMarks = Number(marks);
      if (isNaN(numMarks) || numMarks < 0 || numMarks > 100) {
        return res.status(400).json({ error: 'Marks must be between 0 and 100' });
      }
    }
    if (timeLimit != null) {
      const numTimeLimit = Number(timeLimit);
      if (isNaN(numTimeLimit) || numTimeLimit < 10 || numTimeLimit > 3600) {
        return res.status(400).json({ error: 'Time limit must be between 10 and 3600 seconds' });
      }
    }

    // Start transaction
    await db.runAsync('BEGIN TRANSACTION');
    transactionStarted = true;

    // Get next question order atomically
    const maxOrderResult = await db.getAsync(
      'SELECT MAX(question_order) as max_order FROM questions WHERE game_id = $1',
      [req.params.gameId]
    );
    const newQuestionOrder = (maxOrderResult?.max_order || 0) + 1;

    // Generate UUID for question id
    const questionId = uuidv4();

    // Prepare insert parameters
    const safeHintPenalty = hintPenalty != null ? Number(hintPenalty) : 10;
    const safeTimeLimit = timeLimit != null ? Number(timeLimit) : 60;
    const safeMarks = marks != null ? Number(marks) : 10;

    // Discover actual columns in questions table to handle legacy schemas (e.g., 'type', 'language', 'content')
    const existingColumns = await db.allAsync(
      `SELECT column_name, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = 'questions'`
    );
    const existingColumnNames = new Set(existingColumns.map(c => c.column_name));

    const columns = [
      'id',
      'game_id',
      'question_order',
      'question_text',
      'question_type',
      'options',
      'correct_answer',
      'hint',
      'hint_penalty',
      'time_limit',
      'marks',
      'difficulty',
      'explanation',
      'evaluation_mode',
      'test_cases',
      'ai_validation_settings',
      'image_url',
      'crossword_grid',
      'crossword_clues',
      'crossword_size',
      'partial_marking_settings',
      'time_decay_enabled',
      'time_decay_factor',
      'code_languages',
      'code_timeout',
      'code_memory_limit',
      'code_template'
    ];

    const insertParams = [
      questionId,
      req.params.gameId,
      newQuestionOrder,
      questionText,
      questionType,
      JSON.stringify(processedOptions),
      correctAnswer,
      hint,
      safeHintPenalty,
      safeTimeLimit,
      safeMarks,
      (difficulty || 'medium'),
      explanation || null,
      (evaluationMode || 'mcq'),
      (testCases && String(testCases).trim().length ? testCases : null),
      (aiValidationSettings && String(aiValidationSettings).trim().length ? aiValidationSettings : null),
      (imageUrl && String(imageUrl).trim().length ? imageUrl : null),
      (crosswordGrid ? JSON.stringify(crosswordGrid) : null),
      (crosswordClues ? JSON.stringify(crosswordClues) : null),
      (crosswordSize ? JSON.stringify(crosswordSize) : null),
      null, // partial_marking_settings
      Boolean(timeDecayEnabled) || false,
      (typeof timeDecayFactor === 'number' ? timeDecayFactor : 0.1),
      (code_languages ? JSON.stringify(code_languages) : null),
      (code_timeout != null ? Number(code_timeout) : 30),
      (code_memory_limit != null ? Number(code_memory_limit) : 256),
      (code_template && String(code_template).trim().length ? code_template : null)
    ];

    // Include legacy/optional columns if they exist in DB
    if (existingColumnNames.has('type')) {
      columns.push('type');
      insertParams.push(questionType);
    }
    if (existingColumnNames.has('language')) {
      columns.push('language');
      insertParams.push(req.body.codeLanguage || null);
    }
    if (existingColumnNames.has('content')) {
      columns.push('content');
      insertParams.push(questionText);
    }
    if (existingColumnNames.has('code_language')) {
      columns.push('code_language');
      insertParams.push(req.body.codeLanguage || null);
    }
    if (existingColumnNames.has('ide_language')) {
      columns.push('ide_language');
      insertParams.push(req.body.ideLanguage || null);
    }

    // Ensure any NOT NULL w/o default legacy columns are satisfied
    const knownLegacyMappings = {
      content: questionText,
      type: questionType,
      language: req.body.codeLanguage || null,
      code_language: req.body.codeLanguage || null,
      ide_language: req.body.ideLanguage || null,
      title: questionText, // some schemas may use 'title' for question text
      text: questionText
    };

    for (const col of existingColumns) {
      const name = col.column_name;
      const isNotNull = String(col.is_nullable).toLowerCase() === 'no';
      const hasDefault = col.column_default != null;
      if (isNotNull && !hasDefault && !columns.includes(name)) {
        columns.push(name);
        if (Object.prototype.hasOwnProperty.call(knownLegacyMappings, name)) {
          insertParams.push(knownLegacyMappings[name] ?? '');
        } else {
          // Fallback to empty string to satisfy NOT NULL TEXT; booleans/numbers shouldn't appear here usually
          insertParams.push('');
        }
      }
    }


    // Insert question
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    await db.runAsync(
      `INSERT INTO questions (${columns.join(', ')}) VALUES (${placeholders})`,
      insertParams
    );

    // Update total questions in game
    await db.runAsync(
      'UPDATE games SET total_questions = total_questions + 1 WHERE id = $1',
      [req.params.gameId]
    );

    // Commit transaction
    await db.runAsync('COMMIT');
    transactionStarted = false;

    // Retrieve and return the created question
    const question = await db.getAsync('SELECT * FROM questions WHERE id = $1', [questionId]);

    if (!question) {
      throw new Error('Failed to retrieve the created question');
    }

    // Parse fields for response
    let parsedOptions = [];
    let parsedCrosswordGrid = null;
    let parsedCrosswordClues = null;
    let parsedCrosswordSize = null;
    let parsedTestCases = null;
    let parsedCodeLanguages = null;

    try {
      if (question.options) {
        parsedOptions = JSON.parse(question.options);
      }
    } catch (error) {
      console.error('Error parsing options:', error);
    }

    try {
      if (question.crossword_grid) {
        parsedCrosswordGrid = JSON.parse(question.crossword_grid);
      }
    } catch (error) {
      console.error('Error parsing crossword grid:', error);
    }

    try {
      if (question.crossword_clues) {
        parsedCrosswordClues = JSON.parse(question.crossword_clues);
      }
    } catch (error) {
      console.error('Error parsing crossword clues:', error);
    }

    try {
      if (question.crossword_size) {
        parsedCrosswordSize = JSON.parse(question.crossword_size);
      }
    } catch (error) {
      console.error('Error parsing crossword size:', error);
    }

    try {
      if (question.test_cases) {
        parsedTestCases = JSON.parse(question.test_cases);
      }
    } catch (error) {
      console.error('Error parsing test cases:', error);
    }

    try {
      if (question.code_languages) {
        parsedCodeLanguages = JSON.parse(question.code_languages);
      }
    } catch (error) {
      console.error('Error parsing code languages:', error);
    }

    res.status(201).json({
      ...question,
      options: parsedOptions,
      crosswordGrid: parsedCrosswordGrid,
      crosswordClues: parsedCrosswordClues,
      crosswordSize: parsedCrosswordSize,
      testCases: parsedTestCases,
      codeLanguages: parsedCodeLanguages
    });
  } catch (error) {
    console.error('Add question error:', error);

    // Rollback transaction if started
    if (transactionStarted) {
      try {
        await db.runAsync('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }

    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Database constraint violation - check your input data' });
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
      timeDecayFactor,
      code_languages,
      timeoutLimit: code_timeout,
      memoryLimit: code_memory_limit,
      code_template
    } = req.body;

    // Use a mutable variable for correctAnswer processing
    let correctAnswer = initialCorrectAnswer;

    // Validate required fields
    if (!questionText || !questionType) {
      return res.status(400).json({ error: 'Question text and type are required' });
    }


    // Handle options - robust processing with error handling for PUT
    let processedOptions = [];

    try {
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

    } catch (error) {
      processedOptions = [];
    }

    // Validate question type specific requirements
    if (questionType === 'mcq' && (!processedOptions || !Array.isArray(processedOptions) || processedOptions.length < 2)) {
      return res.status(400).json({ error: 'MCQ questions must have at least 2 options' });
    }

    if (questionType === 'multiple_answers') {

      if (!Array.isArray(processedOptions) || processedOptions.length < 2) {
        return res.status(400).json({ error: 'Multiple answers questions must have at least 2 options' });
      }

      // Process correct answer
      let processedCorrectAnswer = correctAnswer;
      if (typeof correctAnswer === 'string') {
        try {
          processedCorrectAnswer = JSON.parse(correctAnswer);
        } catch {
          processedCorrectAnswer = [correctAnswer];
        }
      }


      if (!Array.isArray(processedCorrectAnswer) || processedCorrectAnswer.length < 1) {
        return res.status(400).json({ error: 'Multiple answers questions must have at least 1 correct answer' });
      }

      // Validate that correct answers are valid indices or values
      for (const ans of processedCorrectAnswer) {
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
    }

    if (questionType === 'code_snippet' && !evaluationMode) {
      return res.status(400).json({ error: 'Code questions must specify evaluation mode' });
    }

    // Validate test cases for code questions
    if (questionType === 'code_snippet' && (evaluationMode === 'compiler' || evaluationMode === 'bugfix')) {
      try {
        let parsedTestCases;
        if (typeof testCases === 'string') {
          try {
            parsedTestCases = JSON.parse(testCases);
          } catch {
            // Convert comma-separated string to array format
            const parts = testCases.split(',').map(part => part.trim()).filter(part => part.length > 0);
            parsedTestCases = parts.map(part => ({ input: part, expectedOutput: '', description: '' }));
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
        return res.status(400).json({ error: 'Marks must be between 0 and 100' });
      }
    }

    if (timeLimit != null) {
      const numTimeLimit = Number(timeLimit);
      if (isNaN(numTimeLimit) || numTimeLimit < 10 || numTimeLimit > 3600) {
        return res.status(400).json({ error: 'Time limit must be between 10 and 3600 seconds' });
      }
    }

    // Validation passed, proceeding with update

    await db.runAsync(
      `UPDATE questions SET
        question_text = $1, question_type = $2, options = $3, correct_answer = $4,
        hint = $5, hint_penalty = $6, time_limit = $7, marks = $8, difficulty = $9, explanation = $10,
        evaluation_mode = $11, test_cases = $12, ai_validation_settings = $13, image_url = $14,
        crossword_grid = $15, crossword_clues = $16, crossword_size = $17,
        partial_marking_settings = $18, time_decay_enabled = $19, time_decay_factor = $20,
        code_languages = $21, code_timeout = $22, code_memory_limit = $23, code_template = $24
        WHERE id = $25 AND game_id = $26`,
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
        code_languages ? JSON.stringify(code_languages) : null,
        code_timeout || 30,
        code_memory_limit || 256,
        code_template || null,
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

    // Parse additional fields based on question type for update response
    let parsedCrosswordGrid = null;
    let parsedCrosswordClues = null;
    let parsedCrosswordSize = null;
    let parsedTestCases = null;
    let parsedCodeLanguages = null;

    try {
      if (updatedQuestion.crossword_grid) {
        parsedCrosswordGrid = JSON.parse(updatedQuestion.crossword_grid);
      }
    } catch (error) {
      console.error('Error parsing crossword grid:', error);
    }

    try {
      if (updatedQuestion.crossword_clues) {
        parsedCrosswordClues = JSON.parse(updatedQuestion.crossword_clues);
      }
    } catch (error) {
      console.error('Error parsing crossword clues:', error);
    }

    try {
      if (updatedQuestion.crossword_size) {
        parsedCrosswordSize = JSON.parse(updatedQuestion.crossword_size);
      }
    } catch (error) {
      console.error('Error parsing crossword size:', error);
    }

    try {
      if (updatedQuestion.test_cases) {
        parsedTestCases = JSON.parse(updatedQuestion.test_cases);
      }
    } catch (error) {
      console.error('Error parsing test cases:', error);
    }

    try {
      if (updatedQuestion.code_languages) {
        parsedCodeLanguages = JSON.parse(updatedQuestion.code_languages);
      }
    } catch (error) {
      console.error('Error parsing code languages:', error);
    }

    res.json({
      ...updatedQuestion,
      options: responseOptions,
      crosswordGrid: parsedCrosswordGrid,
      crosswordClues: parsedCrosswordClues,
      crosswordSize: parsedCrosswordSize,
      testCases: parsedTestCases,
      codeLanguages: parsedCodeLanguages
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
      await db.runAsync('UPDATE game_sessions SET current_question_id = NULL WHERE current_question_id = $1', [req.params.questionId]);
    }

    await db.runAsync(
      'DELETE FROM questions WHERE id = $1 AND game_id = $2',
      [req.params.questionId, req.params.gameId]
    );

    // Update question order for remaining questions (ensure sequential ordering)
    // Recalculate sequential orders for all remaining questions
    const remainingQuestions = await db.allAsync(
      'SELECT id, question_order FROM questions WHERE game_id = $1 ORDER BY question_order',
      [req.params.gameId]
    );

    for (let i = 0; i < remainingQuestions.length; i++) {
      const newOrder = i + 1;
      if (remainingQuestions[i].question_order !== newOrder) {
        await db.runAsync(
          'UPDATE questions SET question_order = $1 WHERE id = $2',
          [newOrder, remainingQuestions[i].id]
        );
      }
    }

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
    // Input validation and authorization
    if (!req.params.gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    // Input validation
    if (!req.params.gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    // Verify game exists and user has access
    const game = await db.getAsync('SELECT * FROM games WHERE id = $1 AND organizer_id = $2', [req.params.gameId, req.user.id]);

    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    // Check if game can be started
    if (game.status !== 'draft') {
      // If game is already active, allow restart by resetting status
      if (game.status === 'active') {
        await db.runAsync(
          `UPDATE games SET status = 'draft', current_question_index = 0, started_at = NULL, ended_at = NULL
           WHERE id = $1 AND organizer_id = $2`,
          [req.params.gameId, req.user.id]
        );
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
    if (!game.total_questions || game.total_questions === 0) {
      return res.status(400).json({ error: 'Game cannot be started - no questions found' });
    }

    // First, find the minimum question_order for this game
    const minOrderResult = await db.getAsync(
      'SELECT MIN(question_order) as min_order FROM questions WHERE game_id = $1',
      [req.params.gameId]
    );
    const minQuestionOrder = minOrderResult?.min_order;

    if (!minQuestionOrder) {
      return res.status(400).json({ error: 'Game cannot be started - no questions found' });
    }

    await db.runAsync(
      `UPDATE games SET status = 'active', started_at = CURRENT_TIMESTAMP, current_question_index = $3
        WHERE id = $1 AND organizer_id = $2`,
      [req.params.gameId, req.user.id, minQuestionOrder]
    );

    // Get first question
    const firstQuestion = await db.getAsync(
      'SELECT * FROM questions WHERE game_id = $1 AND question_order = $2',
      [req.params.gameId, minQuestionOrder]
    );

    if (firstQuestion) {
      // Create game session with server-side time tracking
      // Store timestamps in UTC to prevent timezone conversion issues
      const questionStartTime = new Date().toISOString();
      await db.runAsync(
        `INSERT INTO game_sessions (game_id, current_question_id, question_started_at)
         VALUES ($1, $2, $3)`,
        [req.params.gameId, firstQuestion.id, questionStartTime]
      );

      // Emit to all participants
      try {
        // Safely parse options and additional fields
        let parsedOptions = [];
        let parsedCrosswordGrid = null;
        let parsedCrosswordClues = null;
        let parsedCrosswordSize = null;
        let parsedTestCases = null;
        let parsedCodeLanguages = null;

        try {
          if (firstQuestion.options) {
            if (Array.isArray(firstQuestion.options)) {
              // Already an array, use as-is
              parsedOptions = [...firstQuestion.options];
            } else if (typeof firstQuestion.options === 'string') {
              const trimmedOptions = firstQuestion.options.trim();

              if (trimmedOptions.startsWith('[') && trimmedOptions.endsWith(']')) {
                // JSON string array
                try {
                  parsedOptions = JSON.parse(trimmedOptions);
                } catch (parseError) {
                  // Fallback: try splitting by comma
                  parsedOptions = trimmedOptions.slice(1, -1).split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
                }
              } else if (trimmedOptions.includes(',')) {
                // Comma-separated string
                parsedOptions = trimmedOptions.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
              } else if (trimmedOptions.length > 0) {
                // Single string value
                parsedOptions = [trimmedOptions];
              } else {
                // Empty string
                parsedOptions = [];
              }
            } else {
              // Other types
              parsedOptions = [];
            }

            // Ensure we always have an array
            if (!Array.isArray(parsedOptions)) {
              parsedOptions = [];
            }

            // Filter out empty strings and trim whitespace
            parsedOptions = parsedOptions
              .filter(opt => opt != null && String(opt).trim().length > 0)
              .map(opt => String(opt).trim());
          }
        } catch (parseError) {
          console.warn('⚠️ Failed to parse question options, using empty array:', parseError);
          parsedOptions = [];
        }

        try {
          if (firstQuestion.crossword_grid) {
            parsedCrosswordGrid = JSON.parse(firstQuestion.crossword_grid);
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse crossword grid:', error);
        }

        try {
          if (firstQuestion.crossword_clues) {
            parsedCrosswordClues = JSON.parse(firstQuestion.crossword_clues);
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse crossword clues:', error);
        }

        try {
          if (firstQuestion.crossword_size) {
            parsedCrosswordSize = JSON.parse(firstQuestion.crossword_size);
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse crossword size:', error);
        }

        try {
          if (firstQuestion.test_cases) {
            parsedTestCases = JSON.parse(firstQuestion.test_cases);
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse test cases:', error);
        }

        try {
          if (firstQuestion.code_languages) {
            parsedCodeLanguages = JSON.parse(firstQuestion.code_languages);
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse code languages:', error);
        }

        io.to(`game-${req.params.gameId}`).emit('gameStarted', {
          question: {
            ...firstQuestion,
            options: parsedOptions,
            crosswordGrid: parsedCrosswordGrid,
            crosswordClues: parsedCrosswordClues,
            crosswordSize: parsedCrosswordSize,
            testCases: parsedTestCases,
            codeLanguages: parsedCodeLanguages
          },
          questionStartTime: questionStartTime
        });
      } catch (emitError) {
      }
    } else {
      return res.status(400).json({ error: 'Game cannot be started - no questions found' });
    }
    res.json({ message: 'Game started successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start game' });
  }
});

router.post('/:gameId/next-question', authenticateToken, async (req, res) => {
  try {
    // Input validation
    if (!req.params.gameId) {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    const game = await db.getAsync('SELECT * FROM games WHERE id = $1 AND organizer_id = $2', [req.params.gameId, req.user.id]);
    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    // Check if game is active
    if (game.status !== 'active') {
      return res.status(400).json({
        error: 'Game is not active',
        current_status: game.status,
        required_status: 'active'
      });
    }

    const nextQuestionIndex = game.current_question_index + 1;

    // Get next question
    const nextQuestion = await db.getAsync(
        'SELECT * FROM questions WHERE game_id = $1 AND question_order = $2',
        [req.params.gameId, nextQuestionIndex]
      );

    if (!nextQuestion) {
      return res.status(400).json({ error: 'No more questions' });
    }

    // Update game current question index
    await db.runAsync(
      'UPDATE games SET current_question_index = $1 WHERE id = $2',
      [nextQuestionIndex, req.params.gameId]
    );

    // Create or update game session for the new question with server-side time tracking
    // Store timestamps in UTC to prevent timezone conversion issues
    const questionStartTime = new Date().toISOString();
    const existingSession = await db.getAsync('SELECT id FROM game_sessions WHERE game_id = $1', [req.params.gameId]);

    if (existingSession) {
      // Update existing session
      await db.runAsync(
        `UPDATE game_sessions SET
          current_question_id = $1,
          question_started_at = $2,
          answers_revealed = FALSE
         WHERE game_id = $3`,
        [nextQuestion.id, questionStartTime, req.params.gameId]
      );
    } else {
      // Create new session
      await db.runAsync(
        `INSERT INTO game_sessions (game_id, current_question_id, question_started_at)
         VALUES ($1, $2, $3)`,
        [req.params.gameId, nextQuestion.id, questionStartTime]
      );
    }

    // Emit to all participants
    try {
      // Safely parse options and additional fields
      let parsedOptions = [];
      let parsedCrosswordGrid = null;
      let parsedCrosswordClues = null;
      let parsedCrosswordSize = null;
      let parsedTestCases = null;
      let parsedCodeLanguages = null;

      try {
        if (nextQuestion.options) {
          if (Array.isArray(nextQuestion.options)) {
            // Already an array, use as-is
            parsedOptions = [...nextQuestion.options];
          } else if (typeof nextQuestion.options === 'string') {
            const trimmedOptions = nextQuestion.options.trim();

            if (trimmedOptions.startsWith('[') && trimmedOptions.endsWith(']')) {
              // JSON string array
              try {
                parsedOptions = JSON.parse(trimmedOptions);
              } catch (parseError) {
                // Fallback: try splitting by comma
                parsedOptions = trimmedOptions.slice(1, -1).split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
              }
            } else if (trimmedOptions.includes(',')) {
              // Comma-separated string
              parsedOptions = trimmedOptions.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
            } else if (trimmedOptions.length > 0) {
              // Single string value
              parsedOptions = [trimmedOptions];
            } else {
              // Empty string
              parsedOptions = [];
            }
          } else {
            // Other types
            parsedOptions = [];
          }

          // Ensure we always have an array
          if (!Array.isArray(parsedOptions)) {
            parsedOptions = [];
          }

          // Filter out empty strings and trim whitespace
          parsedOptions = parsedOptions
            .filter(opt => opt != null && String(opt).trim().length > 0)
            .map(opt => String(opt).trim());
        }
      } catch (parseError) {
        parsedOptions = [];
      }

      try {
        if (nextQuestion.crossword_grid) {
          parsedCrosswordGrid = JSON.parse(nextQuestion.crossword_grid);
        }
      } catch (error) {
      }

      try {
        if (nextQuestion.crossword_clues) {
          parsedCrosswordClues = JSON.parse(nextQuestion.crossword_clues);
        }
      } catch (error) {
      }

      try {
        if (nextQuestion.crossword_size) {
          parsedCrosswordSize = JSON.parse(nextQuestion.crossword_size);
        }
      } catch (error) {
      }

      try {
        if (nextQuestion.test_cases) {
          parsedTestCases = JSON.parse(nextQuestion.test_cases);
        }
      } catch (error) {
      }

      try {
        if (nextQuestion.code_languages) {
          parsedCodeLanguages = JSON.parse(nextQuestion.code_languages);
        }
      } catch (error) {
      }

      io.to(`game-${req.params.gameId}`).emit('nextQuestion', {
        question: {
          ...nextQuestion,
          options: parsedOptions,
          crosswordGrid: parsedCrosswordGrid,
          crosswordClues: parsedCrosswordClues,
          crosswordSize: parsedCrosswordSize,
          testCases: parsedTestCases,
          codeLanguages: parsedCodeLanguages
        },
        questionStartTime: questionStartTime
      });
    } catch (emitError) {
    }

    res.json({ message: 'Next question started' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start next question' });
  }
});

router.post('/:gameId/reveal-answer', authenticateToken, async (req, res) => {
   try {
     // Input validation
     if (!req.params.gameId) {
       return res.status(400).json({ error: 'Game ID is required' });
     }

     // Verify game exists and user has access
     const game = await db.getAsync('SELECT id, status FROM games WHERE id = $1 AND organizer_id = $2', [req.params.gameId, req.user.id]);

     if (!game) {
       return res.status(404).json({ error: 'Game not found or access denied' });
     }

     // Check if game is active
     if (game.status !== 'active') {
       return res.status(400).json({
         error: 'Game is not active',
         current_status: game.status,
         required_status: 'active'
       });
     }

     // Get current question from game session
     const session = await db.getAsync(
       `SELECT gs.*, q.* FROM game_sessions gs
         JOIN questions q ON gs.current_question_id = q.id
         WHERE gs.game_id = $1`,
       [req.params.gameId]
     );

     if (!session) {
       return res.status(400).json({ error: 'No active question session' });
     }

    // Mark answers as revealed
    await db.runAsync(
      'UPDATE game_sessions SET answers_revealed = TRUE WHERE game_id = $1',
      [req.params.gameId]
    );

    // Calculate and update leaderboard
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
    }

    // Emit answer reveal to all participants
    try {
      io.to(`game-${req.params.gameId}`).emit('answerRevealed', {
        correctAnswer: correctAnswer,
        explanation: session.explanation || ''
      });
    } catch (emitError) {
    }

    res.json({ message: 'Answer revealed successfully' });
  } catch (error) {
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

    // Always generate fresh QR code for public leaderboard to ensure correct URL
    const qrCodeUrl = await generateAndUploadQRCode(req.params.gameCode);

    // Update game with latest QR code URL
    await db.runAsync(
      'UPDATE games SET qr_code_url = $1 WHERE id = $2',
      [qrCodeUrl, game.id]
    );

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