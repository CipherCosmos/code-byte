import { useState } from 'react';
import { FileText, CheckCircle, AlertCircle, Lightbulb, MessageSquare } from 'lucide-react';

const ShortAnswerComponent = ({ question, answer, setAnswer, submitted, hintUsed, setHintUsed }) => {
  const [showHint, setShowHint] = useState(false);

  const handleUseHint = () => {
    if (!hintUsed && question.hint) {
      setHintUsed(true);
      setShowHint(true);
    }
  };
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const handleAnswerChange = (value) => {
    setAnswer(value);
    setCharCount(value.length);
    setWordCount(value.trim() ? value.trim().split(/\s+/).length : 0);
  };

  const maxWords = 50; // Reasonable limit for short answers
  const maxChars = 500;
  const isOverLimit = wordCount > maxWords || charCount > maxChars;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg">📝</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800`}>
            Short Answer
          </span>
          <span className="text-sm text-gray-600">
            Provide a concise answer to the question
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

      {/* Answer Input */}
      <div className="space-y-4">
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
          <label className="block text-base font-medium text-gray-800 mb-4 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-indigo-600" />
            Your Answer:
          </label>

          <textarea
            value={answer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            disabled={submitted}
            className={`input w-full h-32 resize-none text-base py-3 px-4 min-h-[120px] transition-all duration-200 ${
              isOverLimit
                ? 'border-red-300 focus:border-red-500 bg-red-50/50'
                : submitted
                ? 'border-gray-300 bg-gray-50 text-gray-600'
                : 'border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 bg-white'
            }`}
            placeholder="Write your short answer here... Be concise but complete."
            aria-label="Short answer input"
            aria-describedby="answer-limits"
          />

          {/* Character and Word Count */}
          <div id="answer-limits" className="flex items-center justify-between mt-3 text-sm">
            <div className="flex items-center space-x-4">
              <span className={`flex items-center ${
                charCount > maxChars ? 'text-red-600' : 'text-gray-600'
              }`}>
                <span className="font-medium">{charCount}</span>
                <span className="mx-1">/</span>
                <span>{maxChars} characters</span>
              </span>
              <span className={`flex items-center ${
                wordCount > maxWords ? 'text-red-600' : 'text-gray-600'
              }`}>
                <span className="font-medium">{wordCount}</span>
                <span className="mx-1">/</span>
                <span>{maxWords} words</span>
              </span>
            </div>

            {/* Progress Bar */}
            <div className="flex-1 max-w-32 ml-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    charCount > maxChars ? 'bg-red-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min((charCount / maxChars) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Limit Warning */}
        {isOverLimit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-fade-in">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Answer Too Long</p>
                <p className="text-red-700 text-sm">
                  Please keep your answer under {maxWords} words and {maxChars} characters.
                  Current: {wordCount} words, {charCount} characters.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success Indicator */}
        {answer.trim() && !isOverLimit && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-green-800 font-medium">Good Length</p>
                <p className="text-green-700 text-sm">
                  Your answer is within the recommended limits.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3 flex items-center">
          <Lightbulb className="h-4 w-4 mr-2" />
          Short Answer Guidelines:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h5 className="font-medium mb-2">✅ Do:</h5>
            <ul className="space-y-1">
              <li>• Answer directly and concisely</li>
              <li>• Use complete sentences</li>
              <li>• Include key facts and details</li>
              <li>• Stay focused on the question</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">❌ Don't:</h5>
            <ul className="space-y-1">
              <li>• Write lengthy paragraphs</li>
              <li>• Include irrelevant information</li>
              <li>• Use vague or incomplete answers</li>
              <li>• Repeat the question in your answer</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Example Structure */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3 flex items-center">
          <FileText className="h-4 w-4 mr-2" />
          Answer Structure Tips:
        </h4>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>For factual questions:</strong> State the key fact first, then add brief explanation if needed.</p>
          <p><strong>For analysis questions:</strong> Identify main points, provide evidence, draw conclusion.</p>
          <p><strong>For definition questions:</strong> Give the definition, then key characteristics.</p>
          <p><strong>For process questions:</strong> Outline main steps in logical order.</p>
        </div>
      </div>

      {/* Preview */}
      {answer.trim() && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2">Answer Preview:</h4>
          <div className="text-gray-700 p-3 bg-gray-50 rounded border-l-4 border-indigo-400">
            {answer}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortAnswerComponent;