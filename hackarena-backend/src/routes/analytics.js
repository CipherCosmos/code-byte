import express from 'express';
import { db } from '../database/init.js';
import { authenticateToken } from '../middleware/auth.js';
import PDFDocument from 'pdfkit';

const router = express.Router();

// Get overall game analytics
router.get('/games/:gameId/overview', authenticateToken, async (req, res) => {
  try {
    const game = await db.getAsync(
      'SELECT * FROM games WHERE id = $1 AND organizer_id = $2',
      [req.params.gameId, req.user.id]
    );

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get participant statistics
    const participants = await db.allAsync(
      'SELECT * FROM participants WHERE game_id = $1 AND status = $2',
      [req.params.gameId, 'active']
    );

    // Get qualification statistics
    const qualifiedCount = participants.filter(p => p.qualified).length;
    const qualificationRate = participants.length > 0 ? (qualifiedCount / participants.length) * 100 : 0;

    // Get question statistics
    const questions = await db.allAsync(
      'SELECT * FROM questions WHERE game_id = $1 ORDER BY question_order',
      [req.params.gameId]
    );

    // Get answer statistics
    const answers = await db.allAsync(
      `SELECT a.*, q.question_text, q.marks, q.time_limit
        FROM answers a
        JOIN questions q ON a.question_id = q.id
        WHERE q.game_id = $1`,
      [req.params.gameId]
    );

    // Calculate overall statistics
    const totalParticipants = participants.length;
    const totalQuestions = questions.length;
    const totalAnswers = answers.length;
    const correctAnswers = answers.filter(a => a.is_correct).length;
    const overallAccuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;


    // Average completion time
    const answeredQuestions = answers.length;
    const averageTime = answeredQuestions > 0
      ? answers.reduce((sum, a) => sum + a.time_taken, 0) / answeredQuestions
      : 0;

    // Score distribution
    const scoreDistribution = participants.reduce((acc, p) => {
      const range = Math.floor(p.total_score / 50) * 50;
      acc[range] = (acc[range] || 0) + 1;
      return acc;
    }, {});


    // Game duration
    let gameDuration = null;
    if (game.started_at && game.ended_at) {
      gameDuration = (new Date(game.ended_at) - new Date(game.started_at)) / 1000 / 60; // minutes
    }

    // Prepare response data
    const responseData = {
      game: {
        id: game.id,
        title: game.title,
        status: game.status,
        startedAt: game.started_at,
        endedAt: game.ended_at,
        duration: gameDuration,
        qualificationType: game.qualification_type,
        qualificationThreshold: game.qualification_threshold
      },
      overview: {
        totalParticipants,
        totalQuestions,
        totalAnswers,
        overallAccuracy: Math.round(overallAccuracy),
        averageCompletionTime: Math.round(averageTime),
        scoreDistribution: Object.entries(scoreDistribution).map(([range, count]) => ({
          range: `${range}-${parseInt(range) + 49}`,
          count
        })),
        qualificationStats: {
          qualifiedCount,
          qualificationRate: Math.round(qualificationRate)
        }
      }
    };

    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get per-question analytics
router.get('/games/:gameId/questions', authenticateToken, async (req, res) => {
  try {
    const game = await db.getAsync(
      'SELECT * FROM games WHERE id = $1 AND organizer_id = $2',
      [req.params.gameId, req.user.id]
    );

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

// Get questions with answer statistics
    const questions = await db.allAsync(
      `SELECT q.*,
        COUNT(a.id) as total_attempts,
        COUNT(CASE WHEN a.is_correct THEN 1 END) as correct_attempts,
        AVG(a.time_taken) as avg_time,
        AVG(a.score_earned) as avg_score
        FROM questions q
        LEFT JOIN answers a ON q.id = a.question_id
        WHERE q.game_id = $1
        GROUP BY q.id
        ORDER BY q.question_order`,
      [req.params.gameId]
    );

    const questionAnalytics = questions.map(q => ({
      id: q.id,
      questionOrder: q.question_order,
      questionText: q.question_text,
      questionType: q.question_type,
      marks: q.marks,
      timeLimit: q.time_limit,
      difficulty: q.difficulty,
      totalAttempts: q.total_attempts,
      correctAttempts: q.correct_attempts,
      accuracy: q.total_attempts > 0 ? Math.round((q.correct_attempts / q.total_attempts) * 100) : 0,
      averageTime: Math.round(q.avg_time || 0),
      averageScore: Math.round(q.avg_score || 0)
    }));

    res.json({
      gameId: req.params.gameId,
      questions: questionAnalytics
    });
  } catch (error) {
    console.error('Get question analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch question analytics' });
  }
});

// Get participant performance analytics
router.get('/games/:gameId/participants', authenticateToken, async (req, res) => {
  try {
    const game = await db.getAsync(
      'SELECT * FROM games WHERE id = $1 AND organizer_id = $2',
      [req.params.gameId, req.user.id]
    );

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

// Get participants with detailed statistics
    const participants = await db.allAsync(
      `SELECT p.*,
        COUNT(a.id) as questions_attempted,
        COUNT(CASE WHEN a.is_correct THEN 1 END) as correct_answers,
        AVG(a.time_taken) as avg_time_per_question,
        SUM(a.score_earned) as total_score_earned
        FROM participants p
        LEFT JOIN answers a ON p.id = a.participant_id
        WHERE p.game_id = $1 AND p.status = $2
        GROUP BY p.id
        ORDER BY p.total_score DESC`,
      [req.params.gameId, 'active']
    );

    // Calculate qualification statistics
    const qualifiedParticipants = participants.filter(p => p.qualified);
    const qualificationStats = {
      totalQualified: qualifiedParticipants.length,
      qualificationRate: participants.length > 0 ? Math.round((qualifiedParticipants.length / participants.length) * 100) : 0
    };

    const participantAnalytics = participants.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      finalRank: p.current_rank,
      totalScore: p.total_score,
      questionsAttempted: p.questions_attempted,
      correctAnswers: p.correct_answers,
      accuracy: p.questions_attempted > 0 ? Math.round((p.correct_answers / p.questions_attempted) * 100) : 0,
      averageTime: Math.round(p.avg_time_per_question || 0),
      joinedAt: p.joined_at,
      cheatWarnings: p.cheat_warnings
    }));

    res.json({
      gameId: req.params.gameId,
      participants: participantAnalytics,
      qualificationStats
    });
  } catch (error) {
    console.error('Get participant analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch participant analytics' });
  }
});

// Get top performers
router.get('/games/:gameId/top-performers', authenticateToken, async (req, res) => {
  try {
    const game = await db.getAsync(
      'SELECT * FROM games WHERE id = $1 AND organizer_id = $2',
      [req.params.gameId, req.user.id]
    );

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const limit = parseInt(req.query.limit) || 10;

    const topPerformers = await db.allAsync(
      `SELECT p.name, p.avatar, p.total_score, p.current_rank,
        COUNT(a.id) as questions_answered,
        COUNT(CASE WHEN a.is_correct THEN 1 END) as correct_answers,
        ROUND(AVG(a.time_taken)) as avg_time
        FROM participants p
        LEFT JOIN answers a ON p.id = a.participant_id
        WHERE p.game_id = $1 AND p.status = $2
        GROUP BY p.id
        ORDER BY p.total_score DESC, p.joined_at ASC
        LIMIT $3`,
      [req.params.gameId, 'active', limit]
    );

    res.json({
      gameId: req.params.gameId,
      topPerformers: topPerformers.map(p => ({
        name: p.name,
        avatar: p.avatar,
        score: p.total_score,
        rank: p.current_rank,
        questionsAnswered: p.questions_answered,
        correctAnswers: p.correct_answers,
        accuracy: p.questions_answered > 0 ? Math.round((p.correct_answers / p.questions_answered) * 100) : 0,
        averageTime: p.avg_time
      }))
    });
  } catch (error) {
    console.error('Get top performers error:', error);
    res.status(500).json({ error: 'Failed to fetch top performers' });
  }
});

// Get performance breakdown by time periods
router.get('/games/:gameId/performance-breakdown', authenticateToken, async (req, res) => {
  try {
    const game = await db.getAsync(
      'SELECT * FROM games WHERE id = $1 AND organizer_id = $2',
      [req.params.gameId, req.user.id]
    );

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get answers with timestamps
    const answers = await db.allAsync(
      `SELECT a.*, q.question_order, q.marks, p.name as participant_name
       FROM answers a
       JOIN questions q ON a.question_id = q.id
       JOIN participants p ON a.participant_id = p.id
       WHERE q.game_id = $1
       ORDER BY a.submitted_at`,
      [req.params.gameId]
    );

    // Group by time periods (assuming game started at game.started_at)
    const gameStart = new Date(game.started_at);
    const timeBreakdown = {
      early: [], // First 25% of game time
      mid: [],   // 25-75% of game time
      late: []   // Last 25% of game time
    };

    if (game.ended_at) {
      const gameEnd = new Date(game.ended_at);
      const totalDuration = gameEnd - gameStart;

      answers.forEach(answer => {
        const answerTime = new Date(answer.submitted_at);
        const timeFromStart = answerTime - gameStart;
        const percentage = timeFromStart / totalDuration;

        if (percentage <= 0.25) {
          timeBreakdown.early.push(answer);
        } else if (percentage <= 0.75) {
          timeBreakdown.mid.push(answer);
        } else {
          timeBreakdown.late.push(answer);
        }
      });
    }

    // Calculate statistics for each period
    const calculatePeriodStats = (periodAnswers) => {
      if (periodAnswers.length === 0) return { accuracy: 0, avgTime: 0, avgScore: 0, count: 0 };

      const correct = periodAnswers.filter(a => a.is_correct).length;
      const accuracy = Math.round((correct / periodAnswers.length) * 100);
      const avgTime = Math.round(periodAnswers.reduce((sum, a) => sum + a.time_taken, 0) / periodAnswers.length);
      const avgScore = Math.round(periodAnswers.reduce((sum, a) => sum + a.score_earned, 0) / periodAnswers.length);

      return { accuracy, avgTime, avgScore, count: periodAnswers.length };
    };

    res.json({
      gameId: req.params.gameId,
      performanceBreakdown: {
        earlyGame: calculatePeriodStats(timeBreakdown.early),
        midGame: calculatePeriodStats(timeBreakdown.mid),
        lateGame: calculatePeriodStats(timeBreakdown.late)
      }
    });
  } catch (error) {
    console.error('Get performance breakdown error:', error);
    res.status(500).json({ error: 'Failed to fetch performance breakdown' });
  }
});

// Export game results as CSV
router.get('/games/:gameId/export/csv', authenticateToken, async (req, res) => {
  try {
    const game = await db.getAsync(
      'SELECT * FROM games WHERE id = $1 AND organizer_id = $2',
      [req.params.gameId, req.user.id]
    );

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get participant data with rankings
    const participants = await db.allAsync(
      `SELECT p.*,
          COUNT(a.id) as questions_attempted,
          COUNT(CASE WHEN a.is_correct THEN 1 END) as correct_answers,
          AVG(a.time_taken) as avg_time_per_question,
          SUM(a.score_earned) as total_score_earned
          FROM participants p
          LEFT JOIN answers a ON p.id = a.participant_id
          WHERE p.game_id = $1 AND p.status = $2
          GROUP BY p.id
          ORDER BY p.total_score DESC, p.joined_at ASC`,
      [req.params.gameId, 'active']
    );

    // Get qualification statistics
    const qualifiedCount = participants.filter(p => p.qualified).length;

    // Get question performance data
    const questions = await db.allAsync(
      `SELECT q.*,
        COUNT(a.id) as total_attempts,
        COUNT(CASE WHEN a.is_correct THEN 1 END) as correct_attempts,
        AVG(a.time_taken) as avg_time,
        AVG(a.score_earned) as avg_score
        FROM questions q
        LEFT JOIN answers a ON q.id = a.question_id
        WHERE q.game_id = $1
        GROUP BY q.id
        ORDER BY q.question_order`,
      [req.params.gameId]
    );

    // Generate CSV content
    let csvContent = 'Game Results Export\n';
    csvContent += `Game: ${game.title}\n`;
    csvContent += `Game Code: ${game.game_code}\n`;
    csvContent += `Qualification Type: ${game.qualification_type}\n`;
    csvContent += `Qualification Threshold: ${game.qualification_threshold}\n`;
    csvContent += `Export Date: ${new Date().toISOString()}\n\n`;

    // Participants section
    csvContent += 'PARTICIPANT RANKINGS\n';
    csvContent += 'Rank,Name,Total Score,Questions Attempted,Correct Answers,Accuracy %,Average Time (sec),Joined At,Qualified\n';

    participants.forEach((participant, index) => {
      const accuracy = participant.questions_attempted > 0
        ? Math.round((participant.correct_answers / participant.questions_attempted) * 100)
        : 0;
      const qualified = participant.qualified ? 'Yes' : 'No';
      csvContent += `${index + 1},${participant.name},${participant.total_score},${participant.questions_attempted},${participant.correct_answers},${accuracy},${Math.round(participant.avg_time_per_question || 0)},${participant.joined_at},${qualified}\n`;
    });

    csvContent += '\nQUESTION PERFORMANCE\n';
    csvContent += 'Question Order,Question Text,Marks,Time Limit,Total Attempts,Correct Attempts,Accuracy %,Average Time (sec),Average Score\n';

    questions.forEach(question => {
      const accuracy = question.total_attempts > 0
        ? Math.round((question.correct_attempts / question.total_attempts) * 100)
        : 0;
      csvContent += `${question.question_order},"${question.question_text.replace(/"/g, '""')}",${question.marks},${question.time_limit},${question.total_attempts},${question.correct_attempts},${accuracy},${Math.round(question.avg_time || 0)},${Math.round(question.avg_score || 0)}\n`;
    });

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${game.title.replace(/[^a-zA-Z0-9]/g, '_')}_results.csv"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Export game results as PDF
router.get('/games/:gameId/export/pdf', authenticateToken, async (req, res) => {
  try {
    const game = await db.getAsync(
      'SELECT * FROM games WHERE id = $1 AND organizer_id = $2',
      [req.params.gameId, req.user.id]
    );

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get participant data
    const participants = await db.allAsync(
      `SELECT p.*,
        COUNT(a.id) as questions_attempted,
        COUNT(CASE WHEN a.is_correct THEN 1 END) as correct_answers,
        AVG(a.time_taken) as avg_time_per_question,
        SUM(a.score_earned) as total_score_earned
        FROM participants p
        LEFT JOIN answers a ON p.id = a.participant_id
        WHERE p.game_id = $1 AND p.status = $2
        GROUP BY p.id
        ORDER BY p.total_score DESC, p.joined_at ASC`,
      [req.params.gameId, 'active']
    );

    // Get question performance data
    const questions = await db.allAsync(
      `SELECT q.*,
        COUNT(a.id) as total_attempts,
        COUNT(CASE WHEN a.is_correct THEN 1 END) as correct_attempts,
        AVG(a.time_taken) as avg_time,
        AVG(a.score_earned) as avg_score
        FROM questions q
        LEFT JOIN answers a ON q.id = a.question_id
        WHERE q.game_id = $1
        GROUP BY q.id
        ORDER BY q.question_order`,
      [req.params.gameId]
    );

    // Get overall statistics
    const totalParticipants = participants.length;
    const totalQuestions = questions.length;
    const totalAnswers = questions.reduce((sum, q) => sum + q.total_attempts, 0);
    const correctAnswers = questions.reduce((sum, q) => sum + q.correct_attempts, 0);
    const overallAccuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

    // Create PDF document
    const doc = new PDFDocument();
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${game.title.replace(/[^a-zA-Z0-9]/g, '_')}_results.pdf"`);
      res.send(pdfData);
    });

    // PDF Content
    doc.fontSize(20).text('Code Byte Game Results', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Game: ${game.title}`);
    doc.text(`Game Code: ${game.game_code}`);
    doc.text(`Qualification Type: ${game.qualification_type}`);
    doc.text(`Qualification Threshold: ${game.qualification_threshold}`);
    doc.text(`Export Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Overall Statistics
    doc.fontSize(14).text('Overall Statistics');
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Total Participants: ${totalParticipants}`);
    doc.text(`Total Questions: ${totalQuestions}`);
    doc.text(`Total Answers: ${totalAnswers}`);
    doc.text(`Overall Accuracy: ${Math.round(overallAccuracy)}%`);
    doc.moveDown();

    // Participant Rankings
    doc.fontSize(14).text('Participant Rankings');
    doc.moveDown(0.5);

    const participantTableTop = doc.y;
    doc.fontSize(10);

    // Table headers
    doc.text('Rank', 50, participantTableTop, { width: 40, align: 'left' });
    doc.text('Name', 100, participantTableTop, { width: 120, align: 'left' });
    doc.text('Score', 230, participantTableTop, { width: 50, align: 'right' });
    doc.text('Accuracy', 290, participantTableTop, { width: 60, align: 'right' });
    doc.text('Questions', 360, participantTableTop, { width: 60, align: 'right' });
    doc.text('Qualified', 430, participantTableTop, { width: 60, align: 'center' });

    doc.moveTo(50, participantTableTop + 15).lineTo(490, participantTableTop + 15).stroke();

    let yPosition = participantTableTop + 25;
    participants.slice(0, 20).forEach((participant, index) => {
      if (yPosition > 700) { // New page if needed
        doc.addPage();
        yPosition = 50;
      }

      const accuracy = participant.questions_attempted > 0
        ? Math.round((participant.correct_answers / participant.questions_attempted) * 100)
        : 0;

      doc.text(`${index + 1}`, 50, yPosition, { width: 40, align: 'left' });
      doc.text(participant.name, 100, yPosition, { width: 120, align: 'left' });
      doc.text(participant.total_score.toString(), 230, yPosition, { width: 50, align: 'right' });
      doc.text(`${accuracy}%`, 290, yPosition, { width: 60, align: 'right' });
      doc.text(participant.questions_attempted.toString(), 360, yPosition, { width: 60, align: 'right' });
      doc.text(participant.qualified ? 'Yes' : 'No', 430, yPosition, { width: 60, align: 'center' });

      yPosition += 20;
    });

    doc.addPage();

    // Question Performance
    doc.fontSize(14).text('Question Performance');
    doc.moveDown(0.5);

    const questionTableTop = doc.y;
    doc.fontSize(10);

    // Table headers
    doc.text('Q#', 50, questionTableTop, { width: 30, align: 'left' });
    doc.text('Question', 90, questionTableTop, { width: 200, align: 'left' });
    doc.text('Attempts', 300, questionTableTop, { width: 50, align: 'right' });
    doc.text('Accuracy', 360, questionTableTop, { width: 60, align: 'right' });
    doc.text('Avg Time', 430, questionTableTop, { width: 60, align: 'right' });

    doc.moveTo(50, questionTableTop + 15).lineTo(490, questionTableTop + 15).stroke();

    yPosition = questionTableTop + 25;
    questions.forEach((question) => {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      const accuracy = question.total_attempts > 0
        ? Math.round((question.correct_attempts / question.total_attempts) * 100)
        : 0;

      // Truncate long question text
      const questionText = question.question_text.length > 50
        ? question.question_text.substring(0, 47) + '...'
        : question.question_text;

      doc.text(question.question_order.toString(), 50, yPosition, { width: 30, align: 'left' });
      doc.text(questionText, 90, yPosition, { width: 200, align: 'left' });
      doc.text(question.total_attempts.toString(), 300, yPosition, { width: 50, align: 'right' });
      doc.text(`${accuracy}%`, 360, yPosition, { width: 60, align: 'right' });
      doc.text(`${Math.round(question.avg_time || 0)}s`, 430, yPosition, { width: 60, align: 'right' });

      yPosition += 25; // More space for questions
    });

    doc.end();

  } catch (error) {
    console.error('📊 PDF EXPORT - ERROR occurred:', error);
    console.error('📊 PDF EXPORT - Error message:', error.message);
    console.error('📊 PDF EXPORT - Error stack:', error.stack);
    console.error('📊 PDF EXPORT - Error code:', error.code);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

export default router;