import { db } from '../database/init.js';

class AntiCheatService {
  constructor() {
    this.cheatThresholds = {
      HIGH_SEVERITY: 50,
      MEDIUM_SEVERITY: 25,
      LOW_SEVERITY: 10,
      ELIMINATION_THRESHOLD: 100
    };
    
    this.cheatWeights = {
      'dev_tools_opened': 15,
      'persistent_dev_tools': 25,
      'high_suspicious_activity': 20,
      'rapid_keyboard_activity': 10,
      'rapid_clicking': 8,
      'unusual_mouse_movement': 5,
      'frequent_window_switching': 12,
      'console_manipulation': 18,
      'copy_paste_attempt': 5,
      'tab_switch': 3,
      'right_click_attempt': 2,
      'suspicious_shortcut': 8,
      'page_close_attempt': 5,
      'window_focus_lost': 3
    };
  }

  // Process cheat detection event from participant
  async processCheatEvent(participantId, cheatData) {
    try {
      const participant = await db.getAsync(
        'SELECT * FROM participants WHERE id = $1',
        [participantId]
      );

      if (!participant) {
        throw new Error('Participant not found');
      }

      const cheatScore = this.calculateCheatScore(cheatData);
      const currentCheatScore = participant.cheat_score || 0;
      const newCheatScore = currentCheatScore + cheatScore;
      
      const cheatEvent = {
        ...cheatData,
        cheatScore,
        timestamp: new Date().toISOString(),
        participantId
      };

      // Update participant with new cheat data
      await this.updateParticipantCheatData(participantId, newCheatScore, cheatEvent);
      
      // Determine action based on cheat score
      const action = this.determineAction(newCheatScore, participant.cheat_warnings);
      
      return {
        participantId,
        newCheatScore,
        action,
        cheatEvent,
        warningCount: participant.cheat_warnings + (action.type === 'warning' ? 1 : 0)
      };

    } catch (error) {
      console.error('Error processing cheat event:', error);
      throw error;
    }
  }

  calculateCheatScore(cheatData) {
    const baseScore = this.cheatWeights[cheatData.type] || 1;
    
    // Apply multipliers based on severity and frequency
    let multiplier = 1;
    
    if (cheatData.severity === 'high') multiplier *= 2;
    else if (cheatData.severity === 'medium') multiplier *= 1.5;
    
    // Increase penalty for repeated violations
    if (cheatData.frequency && cheatData.frequency > 3) {
      multiplier *= 1.5;
    }
    
    return Math.round(baseScore * multiplier);
  }

  async updateParticipantCheatData(participantId, newCheatScore, cheatEvent) {
    try {
      // Get current cheat events
      const participant = await db.getAsync(
        'SELECT cheat_events FROM participants WHERE id = $1',
        [participantId]
      );

      let cheatEvents = participant.cheat_events || [];
      if (typeof cheatEvents === 'string') {
        cheatEvents = JSON.parse(cheatEvents);
      }
      
      // Add new event
      cheatEvents.push(cheatEvent);
      
      // Keep only last 50 events to prevent database bloat
      if (cheatEvents.length > 50) {
        cheatEvents = cheatEvents.slice(-50);
      }

      // Update participant
      await db.runAsync(
        `UPDATE participants SET 
         cheat_score = $1,
         cheat_events = $2,
         last_cheat_detection = $3,
         is_flagged = $4
         WHERE id = $5`,
        [
          newCheatScore,
          JSON.stringify(cheatEvents),
          new Date().toISOString(),
          newCheatScore > this.cheatThresholds.MEDIUM_SEVERITY,
          participantId
        ]
      );

    } catch (error) {
      console.error('Error updating participant cheat data:', error);
      throw error;
    }
  }

  determineAction(cheatScore, currentWarnings) {
    if (cheatScore >= this.cheatThresholds.ELIMINATION_THRESHOLD) {
      return {
        type: 'eliminate',
        message: 'Multiple severe anti-cheat violations detected. Participant eliminated.',
        penalty: 0 // No penalty for elimination
      };
    } else if (cheatScore >= this.cheatThresholds.HIGH_SEVERITY) {
      return {
        type: 'severe_warning',
        message: 'Severe anti-cheat violations detected. Final warning before elimination.',
        penalty: 20
      };
    } else if (cheatScore >= this.cheatThresholds.MEDIUM_SEVERITY) {
      return {
        type: 'warning',
        message: 'Suspicious activities detected. Please follow the rules.',
        penalty: 10
      };
    } else if (cheatScore >= this.cheatThresholds.LOW_SEVERITY) {
      return {
        type: 'notice',
        message: 'Minor suspicious activity detected.',
        penalty: 5
      };
    } else {
      return {
        type: 'monitor',
        message: 'Activity logged for monitoring.',
        penalty: 0
      };
    }
  }

  // Get flagged participants for organizer view
  async getFlaggedParticipants(gameId) {
    try {
      const participants = await db.allAsync(
        `SELECT p.*, 
         CASE 
           WHEN p.cheat_score >= $1 THEN 'CRITICAL'
           WHEN p.cheat_score >= $2 THEN 'HIGH'
           WHEN p.cheat_score >= $3 THEN 'MEDIUM'
           ELSE 'LOW'
         END as risk_level
         FROM participants p 
         WHERE p.game_id = $4 AND (p.is_flagged = true OR p.cheat_score > 0)
         ORDER BY p.cheat_score DESC, p.last_cheat_detection DESC`,
        [
          this.cheatThresholds.ELIMINATION_THRESHOLD,
          this.cheatThresholds.HIGH_SEVERITY,
          this.cheatThresholds.MEDIUM_SEVERITY,
          gameId
        ]
      );

      return participants.map(p => ({
        ...p,
        cheat_events: typeof p.cheat_events === 'string' ? JSON.parse(p.cheat_events) : p.cheat_events
      }));

    } catch (error) {
      console.error('Error getting flagged participants:', error);
      throw error;
    }
  }

  // Apply penalty to participant
  async applyPenalty(participantId, penaltyType, penaltyPoints, reason) {
    try {
      const participant = await db.getAsync(
        'SELECT * FROM participants WHERE id = $1',
        [participantId]
      );

      if (!participant) {
        throw new Error('Participant not found');
      }

      const newScore = Math.max(0, participant.total_score - penaltyPoints);
      const newWarnings = participant.cheat_warnings + 1;

      await db.runAsync(
        `UPDATE participants SET 
         total_score = $1,
         cheat_warnings = $2,
         cheat_score = cheat_score + $3,
         status = CASE 
           WHEN cheat_warnings >= 3 THEN 'flagged'
           ELSE status
         END
         WHERE id = $4`,
        [newScore, newWarnings, penaltyPoints / 2, participantId]
      );

      // Log the penalty event
      const penaltyEvent = {
        type: 'manual_penalty',
        penaltyType,
        penaltyPoints,
        reason,
        timestamp: new Date().toISOString(),
        appliedBy: 'organizer'
      };

      await this.updateParticipantCheatData(participantId, penaltyPoints / 2, penaltyEvent);

      return {
        participantId,
        newScore,
        newWarnings,
        penaltyApplied: penaltyPoints
      };

    } catch (error) {
      console.error('Error applying penalty:', error);
      throw error;
    }
  }

  // Reset participant cheat data (for re-admission)
  async resetParticipantCheatData(participantId) {
    try {
      await db.runAsync(
        `UPDATE participants SET 
         cheat_score = 0,
         cheat_events = NULL,
         is_flagged = false,
         cheat_warnings = 0,
         status = 'active',
         last_cheat_detection = NULL
         WHERE id = $1`,
        [participantId]
      );

      return { success: true };

    } catch (error) {
      console.error('Error resetting participant cheat data:', error);
      throw error;
    }
  }

  // Get cheat statistics for a game
  async getGameCheatStats(gameId) {
    try {
      const stats = await db.getAsync(
        `SELECT 
         COUNT(*) as total_participants,
         SUM(CASE WHEN cheat_score > 0 THEN 1 ELSE 0 END) as flagged_count,
         SUM(CASE WHEN cheat_score >= $1 THEN 1 ELSE 0 END) as critical_count,
         SUM(CASE WHEN cheat_score >= $2 THEN 1 ELSE 0 END) as high_risk_count,
         AVG(cheat_score) as average_cheat_score,
         MAX(cheat_score) as highest_cheat_score
         FROM participants 
         WHERE game_id = $3`,
        [
          this.cheatThresholds.ELIMINATION_THRESHOLD,
          this.cheatThresholds.HIGH_SEVERITY,
          gameId
        ]
      );

      return stats;

    } catch (error) {
      console.error('Error getting game cheat stats:', error);
      throw error;
    }
  }
}

export default new AntiCheatService();
