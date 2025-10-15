/**
 * Crossword Service
 * Provides utilities for crossword puzzle validation and processing
 */

export class CrosswordService {
  /**
   * Validate crossword grid structure
   * @param {Array} grid - 2D array representing the crossword grid
   * @param {Object} size - Object with rows and cols properties
   * @returns {Object} - Validation result with isValid and errors
   */
  static validateGrid(grid, size) {
    const errors = [];

    if (!Array.isArray(grid)) {
      errors.push('Grid must be an array');
      return { isValid: false, errors };
    }

    if (grid.length === 0) {
      errors.push('Grid cannot be empty');
      return { isValid: false, errors };
    }

    if (!size || typeof size.rows !== 'number' || typeof size.cols !== 'number') {
      errors.push('Invalid size specification');
      return { isValid: false, errors };
    }

    if (grid.length !== size.rows) {
      errors.push(`Grid rows (${grid.length}) does not match specified size (${size.rows})`);
      return { isValid: false, errors };
    }

    // Check each row
    for (let i = 0; i < grid.length; i++) {
      const row = grid[i];
      if (!Array.isArray(row)) {
        errors.push(`Row ${i} is not an array`);
        continue;
      }

      if (row.length !== size.cols) {
        errors.push(`Row ${i} length (${row.length}) does not match specified columns (${size.cols})`);
      }

      // Validate cell contents
      for (let j = 0; j < row.length; j++) {
        const cell = row[j];
        if (cell !== null && cell !== '' && typeof cell !== 'string') {
          errors.push(`Cell [${i},${j}] must be null, empty string, or string`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate crossword clues structure
   * @param {Object} clues - Object containing across and down clues
   * @returns {Object} - Validation result with isValid and errors
   */
  static validateClues(clues) {
    const errors = [];

    if (!clues || typeof clues !== 'object') {
      errors.push('Clues must be an object');
      return { isValid: false, errors };
    }

    // Check for across and down sections
    if (!clues.across && !clues.down) {
      errors.push('Clues must contain at least across or down sections');
      return { isValid: false, errors };
    }

    // Validate across clues
    if (clues.across) {
      if (!Array.isArray(clues.across)) {
        errors.push('Across clues must be an array');
      } else {
        clues.across.forEach((clue, index) => {
          if (!clue || typeof clue !== 'object') {
            errors.push(`Across clue ${index} must be an object`);
          } else if (!clue.number || !clue.clue || !clue.answer) {
            errors.push(`Across clue ${index} must have number, clue, and answer properties`);
          }
        });
      }
    }

    // Validate down clues
    if (clues.down) {
      if (!Array.isArray(clues.down)) {
        errors.push('Down clues must be an array');
      } else {
        clues.down.forEach((clue, index) => {
          if (!clue || typeof clue !== 'object') {
            errors.push(`Down clue ${index} must be an object`);
          } else if (!clue.number || !clue.clue || !clue.answer) {
            errors.push(`Down clue ${index} must have number, clue, and answer properties`);
          }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a crossword solution is correct
   * @param {Array} userGrid - User's filled grid
   * @param {Array} correctGrid - Correct grid with answers
   * @returns {Object} - Validation result with score and feedback
   */
  static validateSolution(userGrid, correctGrid) {
    const result = {
      isCorrect: false,
      score: 0,
      totalCells: 0,
      correctCells: 0,
      feedback: []
    };

    if (!Array.isArray(userGrid) || !Array.isArray(correctGrid)) {
      result.feedback.push('Invalid grid format');
      return result;
    }

    if (userGrid.length !== correctGrid.length) {
      result.feedback.push('Grid dimensions do not match');
      return result;
    }

    let totalCells = 0;
    let correctCells = 0;

    for (let i = 0; i < correctGrid.length; i++) {
      if (!Array.isArray(userGrid[i]) || !Array.isArray(correctGrid[i])) {
        continue;
      }

      for (let j = 0; j < correctGrid[i].length; j++) {
        const correctCell = correctGrid[i][j];
        const userCell = userGrid[i][j];

        // Only count cells that should have content (not null/empty in correct grid)
        if (correctCell && correctCell.trim() !== '') {
          totalCells++;

          // Normalize for comparison
          const normalizedCorrect = correctCell.toUpperCase().trim();
          const normalizedUser = userCell ? userCell.toUpperCase().trim() : '';

          if (normalizedCorrect === normalizedUser) {
            correctCells++;
          }
        }
      }
    }

    result.totalCells = totalCells;
    result.correctCells = correctCells;
    result.score = totalCells > 0 ? (correctCells / totalCells) * 100 : 0;
    result.isCorrect = result.score === 100;

    if (result.isCorrect) {
      result.feedback.push('Perfect! All answers are correct.');
    } else if (result.score >= 80) {
      result.feedback.push(`Great job! ${correctCells}/${totalCells} cells correct.`);
    } else if (result.score >= 50) {
      result.feedback.push(`Good effort! ${correctCells}/${totalCells} cells correct.`);
    } else {
      result.feedback.push(`Keep trying! ${correctCells}/${totalCells} cells correct.`);
    }

    return result;
  }

  /**
   * Generate an empty crossword grid
   * @param {number} rows - Number of rows
   * @param {number} cols - Number of columns
   * @returns {Array} - Empty grid
   */
  static generateEmptyGrid(rows, cols) {
    return Array(rows).fill().map(() => Array(cols).fill(''));
  }

  /**
   * Check if crossword has valid word placements
   * @param {Array} grid - Crossword grid
   * @param {Object} clues - Crossword clues
   * @returns {Object} - Validation result
   */
  static validateWordPlacement(grid, clues) {
    const errors = [];

    // Check across words
    if (clues.across) {
      for (const clue of clues.across) {
        const word = clue.answer.toUpperCase();
        // This is a simplified check - in a real implementation,
        // you'd need to find the starting position and direction
        if (word.length === 0) {
          errors.push(`Across ${clue.number}: Empty answer`);
        }
      }
    }

    // Check down words
    if (clues.down) {
      for (const clue of clues.down) {
        const word = clue.answer.toUpperCase();
        if (word.length === 0) {
          errors.push(`Down ${clue.number}: Empty answer`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default CrosswordService;