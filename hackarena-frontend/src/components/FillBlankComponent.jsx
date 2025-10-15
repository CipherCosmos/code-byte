import { useState, useEffect } from 'react';
import { Edit3, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';

const FillBlankComponent = ({ question, answer, setAnswer, submitted, hintUsed, setHintUsed }) => {
  const [showHint, setShowHint] = useState(false);

  const handleUseHint = () => {
    if (!hintUsed && question.hint) {
      setHintUsed(true);
      setShowHint(true);
    }
  };
  const [blanks, setBlanks] = useState([]);
  const [questionParts, setQuestionParts] = useState([]);

  useEffect(() => {
    parseQuestionText();
  }, [question.question_text]);

  const parseQuestionText = () => {
    if (!question.question_text) return;

    // Look for blanks marked with underscores, brackets, or common fill-in-the-blank indicators
    const text = question.question_text;

    // Common patterns: ___ , [blank], ______, {blank}, etc.
    const blankPatterns = [
      /_{3,}/g,           // Three or more underscores
      /\[.*?\]/g,         // Square brackets
      /\{.*?\}/g,         // Curly brackets
      /\(.*?\)/g,         // Parentheses (if they contain hint text)
    ];

    let parts = [text];
    let foundBlanks = [];

    blankPatterns.forEach((pattern, patternIndex) => {
      const newParts = [];
      parts.forEach(part => {
        if (typeof part === 'string') {
          const matches = [...part.matchAll(pattern)];
          if (matches.length > 0) {
            let lastIndex = 0;
            matches.forEach((match, matchIndex) => {
              // Add text before blank
              if (match.index > lastIndex) {
                newParts.push(part.substring(lastIndex, match.index));
              }

              // Add blank
              const blankId = `${patternIndex}-${matchIndex}`;
              const placeholder = match[0].replace(/[\[\]{}()]/g, '').trim() || '_____';
              foundBlanks.push({
                id: blankId,
                placeholder: placeholder,
                original: match[0]
              });
              newParts.push({ type: 'blank', id: blankId });

              lastIndex = match.index + match[0].length;
            });

            // Add remaining text
            if (lastIndex < part.length) {
              newParts.push(part.substring(lastIndex));
            }
          } else {
            newParts.push(part);
          }
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });

    setQuestionParts(parts);
    setBlanks(foundBlanks);

    // If no blanks found, provide a fallback input field
    if (foundBlanks.length === 0) {
      setBlanks([{ id: 'fallback', placeholder: 'Your answer', original: '' }]);
      setQuestionParts([text, ' ', { type: 'blank', id: 'fallback' }]);
    }
  };

  const handleBlankChange = (blankId, value) => {
    const updatedBlanks = blanks.map(blank =>
      blank.id === blankId ? { ...blank, value: value } : blank
    );
    setBlanks(updatedBlanks);

    // Update the answer string
    const answers = updatedBlanks
      .filter(blank => blank.value?.trim())
      .map(blank => blank.value.trim())
      .join(' | ');

    setAnswer(answers);
  };

  const getBlankValue = (blankId) => {
    return blanks.find(blank => blank.id === blankId)?.value || '';
  };

  const getBlankPlaceholder = (blankId) => {
    return blanks.find(blank => blank.id === blankId)?.placeholder || '_____';
  };

  const filledBlanks = blanks.filter(blank => blank.value?.trim()).length;
  const totalBlanks = blanks.length;

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg">📝</span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            Fill in the Blanks
          </span>
        </div>
        {question.hint && !submitted && (
          <button
            onClick={handleUseHint}
            disabled={hintUsed}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              hintUsed
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            }`}
          >
            <Lightbulb className="h-4 w-4" />
            <span>{hintUsed ? 'Hint Used (-10 pts)' : 'Use Hint'}</span>
          </button>
        )}
      </div>

      {showHint && question.hint && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <Lightbulb className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-medium">Hint:</p>
              <p className="text-yellow-700">{question.hint}</p>
            </div>
          </div>
        </div>
      )}

      <div className="text-lg leading-relaxed text-gray-800">
        {questionParts.map((part, index) => {
          if (typeof part === 'string') {
            return <span key={index}>{part}</span>;
          } else if (part.type === 'blank') {
            const blankId = part.id;
            const value = getBlankValue(blankId);
            const placeholder = getBlankPlaceholder(blankId);

            return (
              <span key={index} className="inline-block mx-1 align-baseline">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleBlankChange(blankId, e.target.value)}
                  disabled={submitted}
                  placeholder={placeholder}
                  className={`inline-block px-3 py-1 border-b-2 text-center font-medium min-w-[80px] transition-all duration-200 ${
                    submitted
                      ? 'border-gray-300 bg-gray-50 text-gray-600'
                      : value.trim()
                      ? 'border-green-400 bg-green-50 text-green-800'
                      : 'border-blue-400 bg-blue-50 focus:border-blue-600 focus:bg-blue-100'
                  } rounded-t-md`}
                  style={{ width: `${Math.max(placeholder.length * 8, 80)}px` }}
                  aria-label={`Fill in blank ${blankId.split('-')[1]}`}
                />
              </span>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default FillBlankComponent;