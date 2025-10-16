import { db } from '../database/init.js';

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    // Join game room
    socket.on('joinGameRoom', async (data) => {
      try {
        const { gameCode, participantId, role } = data;

        if (role === 'organizer') {
          const game = await db.getAsync(
            'SELECT * FROM games WHERE game_code = $1',
            [gameCode]
          );

          if (game) {
            socket.join(`game-${game.id}`);
            socket.join(`organizer-${game.id}`);
          }
        } else if (role === 'participant' && participantId) {
          const participant = await db.getAsync(
            'SELECT * FROM participants WHERE id = $1',
            [participantId]
          );

          if (participant) {
            // Update socket ID for reconnection handling
            await db.runAsync(
              'UPDATE participants SET socket_id = $1 WHERE id = $2',
              [socket.id, participantId]
            );

            socket.join(`game-${participant.game_id}`);
            socket.participantId = participantId;
            socket.gameId = participant.game_id;

            // Emit participant count update to organizers
            const participantCount = await db.getAsync(
              'SELECT COUNT(*) as count FROM participants WHERE game_id = $1 AND status = $2',
              [participant.game_id, 'active']
            );

            io.to(`organizer-${participant.game_id}`).emit('participantCountUpdate', {
              count: participantCount.count
            });
          }
        } else if (role === 'viewer') {
          const game = await db.getAsync(
            'SELECT * FROM games WHERE game_code = $1',
            [gameCode]
          );

          if (game) {
            socket.join(`game-${game.id}`);
          }
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to join game room' });
      }
    });

    // Handle real-time cheat detection
    // Implements progressive penalty system for maintaining game integrity
    // Warning levels: 1st warning (10pts), 2nd warning (15pts), 3rd+ warning (flagged)
    socket.on('cheatDetected', async (data) => {
      try {
        // Only process cheat detection for authenticated participants
        if (!socket.participantId) return;

        const { type, timestamp } = data;

        // Validate input data
        if (!type || typeof type !== 'string') {
          return;
        }

        // Fetch participant details for penalty calculation
        const participant = await db.getAsync(
          'SELECT * FROM participants WHERE id = $1',
          [socket.participantId]
        );

        if (!participant) {
          return;
        }

        // Calculate new warning count and determine penalty
        const newWarningCount = (participant.cheat_warnings || 0) + 1;
        let penaltyScore = 0;
        let status = 'active';

        // Progressive penalty system:
        // - 1st violation: 10 point deduction (warning)
        // - 2nd violation: 15 point deduction (severe warning)
        // - 3rd+ violation: Participant flagged for organizer review (no longer active)
        if (newWarningCount === 1) {
          penaltyScore = 10;
        } else if (newWarningCount === 2) {
          penaltyScore = 15;
        } else if (newWarningCount >= 3) {
          status = 'flagged';

          // Alert organizer about severely flagged participant
          io.to(`organizer-${socket.gameId}`).emit('participantFlagged', {
            participantId: socket.participantId,
            name: participant.name,
            cheatType: type,
            warningCount: newWarningCount
          });
        }

        // Ensure penalty doesn't make score negative
        const currentScore = participant.total_score || 0;
        const finalPenalty = Math.min(penaltyScore, currentScore);

        // Apply penalty and update participant status
        await db.runAsync(
          `UPDATE participants SET
           cheat_warnings = $1,
           total_score = total_score - $2,
           status = $3
           WHERE id = $4`,
          [newWarningCount, finalPenalty, status, socket.participantId]
        );

        // Notify the participant of their penalty
        socket.emit('cheatPenalty', {
          warningCount: newWarningCount,
          penalty: finalPenalty,
          message: getCheatMessage(newWarningCount)
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to process cheat detection' });
      }
    });

    // Handle organizer actions
    socket.on('eliminateParticipant', async (data) => {
      try {
        const { participantId, gameId } = data;
        
        await db.runAsync(
          'UPDATE participants SET status = $1 WHERE id = $2 AND game_id = $3',
          ['eliminated', participantId, gameId]
        );

        // Get participant socket and disconnect
        const participant = await db.getAsync(
          'SELECT * FROM participants WHERE id = $1',
          [participantId]
        );
        
        if (participant && participant.socket_id) {
          io.to(participant.socket_id).emit('eliminated', {
            message: 'You have been eliminated by the organizer'
          });
        }

        // Update organizer with new participant list
        const participants = await db.allAsync(
          'SELECT id, name, avatar, total_score, current_rank, status, cheat_warnings FROM participants WHERE game_id = $1 ORDER BY total_score DESC',
          [gameId]
        );

        io.to(`organizer-${gameId}`).emit('participantsUpdate', participants);
        
      } catch (error) {
      }
    });

    socket.on('warnParticipant', async (data) => {
      try {
        const { participantId, gameId, customPenalty } = data;

        const penalty = customPenalty || 5;

        await db.runAsync(
          'UPDATE participants SET total_score = total_score - $1, cheat_warnings = cheat_warnings + 1 WHERE id = $2 AND game_id = $3',
          [penalty, participantId, gameId]
        );

        const participant = await db.getAsync(
          'SELECT * FROM participants WHERE id = $1',
          [participantId]
        );

        if (participant && participant.socket_id) {
          io.to(participant.socket_id).emit('organiserWarning', {
            penalty,
            message: `You received a warning from the organizer. ${penalty} points deducted.`
          });
        }

      } catch (error) {
      }
    });

    socket.on('reAdmitParticipant', async (data) => {
      try {
        const { participantId, gameId } = data;

        // Re-admit the participant
        await db.runAsync(
          'UPDATE participants SET status = $1 WHERE id = $2 AND game_id = $3',
          ['active', participantId, gameId]
        );

        // Get updated participant info
        const participant = await db.getAsync(
          'SELECT * FROM participants WHERE id = $1',
          [participantId]
        );

        // Notify the re-admitted participant
        if (participant && participant.socket_id) {
          io.to(participant.socket_id).emit('reAdmitted', {
            message: 'You have been re-admitted to the game by the organizer'
          });
        }

        // Update organizer with new participant list
        const participants = await db.allAsync(
          'SELECT id, name, avatar, total_score, current_rank, status, cheat_warnings FROM participants WHERE game_id = $1 ORDER BY total_score DESC',
          [gameId]
        );

        io.to(`organizer-${gameId}`).emit('participantsUpdate', participants);

      } catch (error) {
      }
    });

    // Handle question time expiry with enhanced synchronization and duplicate prevention
    socket.on('questionTimeExpired', async (data) => {
      try {
        const { gameId, questionId } = data;

        console.log('[SERVER SOCKET] questionTimeExpired received', {
          gameId,
          questionId,
          socketId: socket.id,
          participantId: socket.participantId,
          timestamp: new Date().toISOString()
        });

        // Validate input data
        if (!gameId || !questionId) {
          console.log('[SERVER SOCKET] Invalid data - missing gameId or questionId');
          return;
        }

        // Check if auto-submit has already been processed for this question
        const session = await db.getAsync(
          'SELECT auto_submitted_at FROM game_sessions WHERE game_id = $1 AND current_question_id = $2',
          [gameId, questionId]
        );

        if (session?.auto_submitted_at) {
          console.log('[SERVER SOCKET] Auto-submit already processed for this question', {
            gameId,
            questionId,
            autoSubmittedAt: session.auto_submitted_at
          });
          return;
        }

        // Get question details to determine time limit
        const question = await db.getAsync('SELECT * FROM questions WHERE id = $1', [questionId]);

        // DIAGNOSTIC: Log current server time vs question timing
        if (question) {
          const currentTime = new Date().toISOString();
          console.log('[SERVER SOCKET] DIAGNOSTIC - Question timing check', {
            questionId,
            timeLimit: question.time_limit,
            currentServerTime: currentTime,
            questionCreatedAt: question.created_at,
            gameId
          });
        }
        if (!question) {
          console.log('[SERVER SOCKET] Question not found', { questionId });
          return;
        }

        // Get current UTC timestamp for consistent time tracking
        const currentTimeUTC = new Date().toISOString();

        // Auto-submit blank answers for participants who haven't manually submitted answers
        const unansweredParticipants = await db.allAsync(
          `SELECT p.id FROM participants p
            WHERE p.game_id = $1 AND p.status = 'active'
            AND p.id NOT IN (
              SELECT a.participant_id FROM answers a WHERE a.question_id = $2 AND a.auto_submitted = false
            )`,
          [gameId, questionId]
        );

        console.log('[SERVER SOCKET] Unanswered participants found', {
          gameId,
          questionId,
          unansweredCount: unansweredParticipants.length,
          unansweredIds: unansweredParticipants.map(p => p.id)
        });

        if (unansweredParticipants.length > 0) {
          // Mark auto-submit as processed to prevent duplicates
          console.log('[SERVER SOCKET] Marking auto-submit as processed');
          await db.runAsync(
            'UPDATE game_sessions SET auto_submitted_at = $1 WHERE game_id = $2 AND current_question_id = $3',
            [currentTimeUTC, gameId, questionId]
          );
  
          // Reset auto_submitted_at after a short delay to allow for legitimate auto-submissions
          // This prevents the flag from blocking future auto-submissions if the event is triggered multiple times
          setTimeout(async () => {
            try {
              await db.runAsync(
                'UPDATE game_sessions SET auto_submitted_at = NULL WHERE game_id = $1 AND current_question_id = $2 AND auto_submitted_at = $3',
                [gameId, questionId, currentTimeUTC]
              );
              console.log('[SERVER SOCKET] Reset auto-submit flag for future submissions');
            } catch (resetError) {
              console.warn('[SERVER SOCKET] Failed to reset auto-submit flag:', resetError);
            }
          }, 2000); // Reset after 2 seconds

          for (const participant of unansweredParticipants) {
            console.log('[SERVER SOCKET] Auto-submitting for participant', {
              participantId: participant.id,
              questionId,
              gameId
            });

            // Auto-submit with time_taken equal to time_limit (indicating time expired)
            // Use the same scoring logic as manual submission but with autoSubmit=true
            const timeTaken = question.time_limit;
            let isCorrect = false;
            let scoreEarned = 0;
            let timeDecayBonus = 0;

            // For auto-submitted answers, always 0 points and incorrect
            scoreEarned = 0;
            isCorrect = false;

            await db.runAsync(
              'INSERT INTO answers (participant_id, question_id, answer, answer_text, is_correct, score_earned, time_taken, time_decay_bonus, auto_submitted, auto_submitted_at, submitted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
              [participant.id, questionId, '', '', isCorrect, scoreEarned, timeTaken, timeDecayBonus, true, currentTimeUTC, currentTimeUTC]
            );

            // Update participant total score
            await db.runAsync(
              'UPDATE participants SET total_score = total_score + $1 WHERE id = $2',
              [scoreEarned, participant.id]
            );
          }

          // Update session answered count and mark as auto-submitted
          await db.runAsync(
            'UPDATE game_sessions SET answered_participants = answered_participants + $1, auto_submitted_at = $2 WHERE current_question_id = $3',
            [unansweredParticipants.length, currentTimeUTC, questionId]
          );
        }

        // Emit time expired to all participants with synchronized timestamp
        console.log('[SERVER SOCKET] Emitting questionTimeExpired to all participants', {
          gameId,
          timestamp: currentTimeUTC,
          autoSubmittedCount: unansweredParticipants.length
        });
        io.to(`game-${gameId}`).emit('questionTimeExpired', {
          timestamp: currentTimeUTC,
          autoSubmittedCount: unansweredParticipants.length
        });

      } catch (error) {
        console.error('questionTimeExpired handler error:', error);
      }
    });

    // Handle live analytics requests
    socket.on('requestLiveAnalytics', async (data) => {
      try {
        const { gameId } = data;

        // Validate input
        if (!gameId) {
          return;
        }

        // Get current question analytics
        const session = await db.getAsync(
          'SELECT * FROM game_sessions WHERE game_id = $1',
          [gameId]
        );

        if (session && session.current_question_id) {
          const questionAnalytics = await db.getAsync(
            `SELECT
               q.question_text,
               q.marks,
               COUNT(a.id) as total_attempts,
               COUNT(CASE WHEN a.is_correct = true THEN 1 END) as correct_attempts,
               AVG(a.time_taken) as avg_time,
               AVG(a.score_earned) as avg_score
             FROM questions q
             LEFT JOIN answers a ON q.id = a.question_id
             WHERE q.id = $1
             GROUP BY q.id`,
            [session.current_question_id]
          );

          socket.emit('liveAnalytics', {
            currentQuestion: questionAnalytics,
            totalParticipants: session.total_participants || 0,
            answeredParticipants: session.answered_participants || 0
          });
        }

      } catch (error) {
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      // Update participant socket status
    if (socket.participantId) {
      db.runAsync(
        'UPDATE participants SET socket_id = $1 WHERE id = $2',
        [null, socket.participantId]
      ).catch(error => {
        console.error('Error updating participant socket status:', error);
      });

        // Notify organizer about disconnection if game is active
        if (socket.gameId) {
          io.to(`organizer-${socket.gameId}`).emit('participantDisconnected', {
            participantId: socket.participantId,
            reason: reason
          });
        }
      }
    });
  });
}

function getCheatMessage(warningCount) {
  switch (warningCount) {
    case 1:
      return 'First warning: Avoid suspicious activities. 10 points deducted.';
    case 2:
      return 'Second warning: Please follow game rules. 15 points deducted.';
    default:
      return 'Multiple violations detected. You have been flagged for organizer review.';
  }
}