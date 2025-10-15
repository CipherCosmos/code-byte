import { useState } from 'react';
import { CheckCircle, XCircle, Lightbulb } from "lucide-react";

const MCQComponent = ({ question, answer, setAnswer, submitted, hintUsed, setHintUsed }) => {
  const [showHint, setShowHint] = useState(false);

  let options = [];
  if (Array.isArray(question.options)) {
    options = question.options;
  } else if (typeof question.options === "string") {
    try {
      options = JSON.parse(question.options || "[]");
      if (!Array.isArray(options)) {
        options = [];
      }
    } catch (error) {
      console.error("Invalid options JSON for MCQ question:", question.options, error);
      if (question.options.trim()) {
        options = question.options.split(",").map((opt) => opt.trim()).filter((opt) => opt);
      } else {
        options = [];
      }
    }
  } else {
    options = [];
  }

  const handleUseHint = () => {
    if (!hintUsed && question.hint) {
      setHintUsed(true);
      setShowHint(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg">📝</span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Multiple Choice
          </span>
          <span className="text-sm text-gray-600">Select one correct answer</span>
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
      {options.map((option, index) => (
        <label
          key={index}
          className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer touch-manipulation min-h-[44px]"
        >
          <input
            type="radio"
            name="mcq-answer"
            value={option}
            checked={answer === option}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={submitted}
            className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0"
          />
          <span className="font-medium text-gray-700 text-base flex-shrink-0">
            {String.fromCharCode(65 + index)}.
          </span>
          <span className="text-gray-900 text-base leading-relaxed">
            {option}
          </span>
        </label>
      ))}
      {/* Allow empty answer selection for auto-submit scenarios */}
      <label className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer touch-manipulation min-h-[44px] border-dashed border-gray-300">
        <input
          type="radio"
          name="mcq-answer"
          value=""
          checked={answer === ""}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={submitted}
          className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0"
        />
        <span className="font-medium text-gray-500 text-base flex-shrink-0">
          No answer
        </span>
        <span className="text-gray-500 text-base leading-relaxed italic">
          (Leave blank - will auto-submit when time expires)
        </span>
      </label>
    </div>
  );
};

export default MCQComponent;