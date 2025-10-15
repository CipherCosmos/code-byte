import { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle, X, RefreshCw } from 'lucide-react';

const CrosswordComponent = ({ question, answer, setAnswer, submitted }) => {
  const [grid, setGrid] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [direction, setDirection] = useState('across'); // 'across' or 'down'
  const [showHints, setShowHints] = useState(false);

  useEffect(() => {
    // Initialize grid and parse existing answer
    initializeGrid();
    parseExistingAnswer();
  }, [question]);

  const initializeGrid = () => {
    try {
      const gridData = question.crossword_grid ?
        (typeof question.crossword_grid === 'string' ?
          JSON.parse(question.crossword_grid) :
          question.crossword_grid) : [];

      const size = question.crossword_size ?
        (typeof question.crossword_size === 'string' ?
          JSON.parse(question.crossword_size) :
          question.crossword_size) : { rows: 10, cols: 10 };

      // Create grid with proper structure
      const newGrid = [];
      for (let row = 0; row < size.rows; row++) {
        const gridRow = [];
        for (let col = 0; col < size.cols; col++) {
          const cellData = gridData[row]?.[col];
          if (cellData === '#' || cellData === null || cellData === '') {
            gridRow.push({ type: 'black', letter: '' });
          } else {
            gridRow.push({
              type: 'white',
              letter: '',
              number: typeof cellData === 'string' && cellData.match(/^\d+[A-Z]$/) ? cellData : null
            });
          }
        }
        newGrid.push(gridRow);
      }
      setGrid(newGrid);
    } catch (error) {
      console.error('Error initializing crossword grid:', error);
      setGrid([]);
    }
  };

  const parseExistingAnswer = () => {
    if (!answer) return;

    try {
      // Parse format like "1A:WORD,2D:TEST"
      const entries = answer.split(',').map(entry => entry.trim());
      const answers = {};

      entries.forEach(entry => {
        const match = entry.match(/^(\d+)([AD]):(.+)$/);
        if (match) {
          const [, number, direction, word] = match;
          answers[`${number}${direction}`] = word;
        }
      });

      setUserAnswers(answers);
    } catch (error) {
      console.error('Error parsing crossword answer:', error);
    }
  };

  const updateAnswer = (newAnswers) => {
    // Convert back to format "1A:WORD,2D:TEST"
    const entries = Object.entries(newAnswers)
      .filter(([, word]) => word.trim())
      .map(([key, word]) => `${key}:${word}`)
      .join(',');

    setAnswer(entries);
    setUserAnswers(newAnswers);
  };

  const handleCellClick = (row, col) => {
    if (submitted) return;

    const cell = grid[row]?.[col];
    if (cell?.type === 'white') {
      setSelectedCell({ row, col });
    }
  };

  const handleKeyPress = (e) => {
    if (!selectedCell || submitted) return;

    const { row, col } = selectedCell;
    const cell = grid[row]?.[col];

    if (!cell || cell.type !== 'white') return;

    if (e.key === 'Backspace' || e.key === 'Delete') {
      // Clear current cell and move to previous
      const newAnswers = { ...userAnswers };
      const currentWord = findCurrentWord();
      if (currentWord) {
        const updatedWord = currentWord.word.substring(0, currentWord.position - 1) +
                           currentWord.word.substring(currentWord.position);
        newAnswers[currentWord.key] = updatedWord;
        updateAnswer(newAnswers);

        // Move to previous cell
        moveToPreviousCell();
      }
    } else if (e.key.length === 1 && e.key.match(/[A-Z]/i)) {
      // Add letter to current cell
      const newAnswers = { ...userAnswers };
      const currentWord = findCurrentWord();
      if (currentWord) {
        const updatedWord = currentWord.word.substring(0, currentWord.position) +
                           e.key.toUpperCase() +
                           currentWord.word.substring(currentWord.position + 1);
        newAnswers[currentWord.key] = updatedWord;
        updateAnswer(newAnswers);

        // Move to next cell
        moveToNextCell();
      }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      handleArrowKey(e.key);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      toggleDirection();
    }
  };

  const findCurrentWord = () => {
    if (!selectedCell) return null;

    // Find which word this cell belongs to
    for (const [key, word] of Object.entries(userAnswers)) {
      const positions = getWordPositions(key);
      const position = positions.findIndex(pos => pos.row === selectedCell.row && pos.col === selectedCell.col);
      if (position !== -1) {
        return { key, word, position, positions };
      }
    }
    return null;
  };

  const getWordPositions = (key) => {
    const match = key.match(/^(\d+)([AD])$/);
    if (!match) return [];

    const [, number, dir] = match;
    const positions = [];

    // Find starting position
    let startRow = -1, startCol = -1;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c].number === `${number}${dir}`) {
          startRow = r;
          startCol = c;
          break;
        }
      }
      if (startRow !== -1) break;
    }

    if (startRow === -1) return [];

    // Calculate positions based on direction
    const isAcross = dir === 'A';
    let r = startRow, c = startCol;

    while (r < grid.length && c < grid[r].length && grid[r][c].type === 'white') {
      positions.push({ row: r, col: c });
      if (isAcross) {
        c++;
      } else {
        r++;
      }
    }

    return positions;
  };

  const moveToNextCell = () => {
    if (!selectedCell) return;

    const currentWord = findCurrentWord();
    if (currentWord && currentWord.position < currentWord.positions.length - 1) {
      const nextPos = currentWord.positions[currentWord.position + 1];
      setSelectedCell({ row: nextPos.row, col: nextPos.col });
    }
  };

  const moveToPreviousCell = () => {
    if (!selectedCell) return;

    const currentWord = findCurrentWord();
    if (currentWord && currentWord.position > 0) {
      const prevPos = currentWord.positions[currentWord.position - 1];
      setSelectedCell({ row: prevPos.row, col: prevPos.col });
    }
  };

  const handleArrowKey = (key) => {
    if (!selectedCell) return;

    let { row, col } = selectedCell;

    switch (key) {
      case 'ArrowUp':
        row = Math.max(0, row - 1);
        break;
      case 'ArrowDown':
        row = Math.min(grid.length - 1, row + 1);
        break;
      case 'ArrowLeft':
        col = Math.max(0, col - 1);
        break;
      case 'ArrowRight':
        col = Math.min(grid[row]?.length - 1 || 0, col + 1);
        break;
    }

    if (grid[row]?.[col]?.type === 'white') {
      setSelectedCell({ row, col });
    }
  };

  const toggleDirection = () => {
    setDirection(prev => prev === 'across' ? 'down' : 'across');
  };

  const clearGrid = () => {
    setUserAnswers({});
    setAnswer('');
    setSelectedCell(null);
  };

  const getCellLetter = (row, col) => {
    for (const [key, word] of Object.entries(userAnswers)) {
      const positions = getWordPositions(key);
      const position = positions.findIndex(pos => pos.row === row && pos.col === col);
      if (position !== -1 && position < word.length) {
        return word[position];
      }
    }
    return '';
  };

  const getCellNumber = (row, col) => {
    const cell = grid[row]?.[col];
    if (cell?.number) {
      return cell.number.replace(/[AD]$/, '');
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-lg">🔤</span>
        <span className={`px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800`}>
          Crossword Puzzle
        </span>
        <span className="text-sm text-gray-600">
          Fill in the crossword grid
        </span>
      </div>

      <div className="text-base text-gray-600 mb-3 leading-relaxed">
        Click on cells to fill them. Use Tab to switch between across/down mode.
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Direction:</span>
            <button
              onClick={toggleDirection}
              className={`px-3 py-1 rounded text-sm font-medium ${
                direction === 'across'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {direction === 'across' ? 'Across' : 'Down'}
            </button>
          </div>
          <button
            onClick={() => setShowHints(!showHints)}
            className="btn btn-secondary text-sm flex items-center"
          >
            <HelpCircle className="h-4 w-4 mr-1" />
            {showHints ? 'Hide' : 'Show'} Hints
          </button>
        </div>
        <button
          onClick={clearGrid}
          disabled={submitted}
          className="btn btn-secondary text-sm flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Clear
        </button>
      </div>

      {/* Crossword Grid */}
      <div className="flex justify-center">
        <div
          className="inline-grid gap-1 p-4 bg-gray-900 rounded-lg shadow-lg"
          style={{
            gridTemplateColumns: `repeat(${grid[0]?.length || 10}, 1fr)`,
            gridTemplateRows: `repeat(${grid.length}, 1fr)`
          }}
          tabIndex={0}
          onKeyDown={handleKeyPress}
        >
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
              const letter = getCellLetter(rowIndex, colIndex);
              const number = getCellNumber(rowIndex, colIndex);

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`relative w-10 h-10 border-2 flex items-center justify-center text-lg font-bold cursor-pointer transition-all duration-200 ${
                    cell.type === 'black'
                      ? 'bg-gray-900 border-gray-900'
                      : isSelected
                      ? 'bg-blue-200 border-blue-500 shadow-lg'
                      : letter
                      ? 'bg-white border-gray-400 hover:border-blue-400'
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                >
                  {cell.type === 'white' && (
                    <>
                      {number && (
                        <span className="absolute top-0 left-0 text-xs font-bold text-gray-600 p-0.5">
                          {number}
                        </span>
                      )}
                      <span className="text-black">
                        {letter}
                      </span>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Answer Format Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Answer Format:</h4>
        <p className="text-sm text-blue-800">
          Your answers will be saved in the format: <code>1A:WORD,2D:TEST</code>
        </p>
        <div className="mt-2 text-xs text-blue-700">
          Current answer: <code>{answer || 'No answers yet'}</code>
        </div>
      </div>

      {/* Clues */}
      {question.crossword_clues && showHints && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h4 className="font-medium text-gray-800 mb-3 text-lg flex items-center">
            <HelpCircle className="h-5 w-5 mr-2" />
            Clues:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-base">
            {(() => {
              let clues = {};
              try {
                clues = JSON.parse(question.crossword_clues);
                if (typeof clues !== "object" || clues === null) {
                  clues = {};
                }
              } catch (error) {
                console.error("Invalid crossword_clues JSON:", question.crossword_clues, error);
                clues = {};
              }
              return Object.entries(clues).map(([clueNum, clueData]) => (
                <div key={clueNum} className="flex">
                  <span className="font-medium w-14 flex-shrink-0">
                    {clueNum}:
                  </span>
                  <span className="leading-relaxed">
                    {clueData?.clue || "No clue available"}
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CrosswordComponent;