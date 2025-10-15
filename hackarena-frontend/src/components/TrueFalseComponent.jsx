import { useState } from 'react';
import { CheckCircle, XCircle, Lightbulb } from "lucide-react";

const TrueFalseComponent = ({ question, answer, setAnswer, submitted, hintUsed, setHintUsed }) => {
  const [showHint, setShowHint] = useState(false);

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
          <span className="text-lg">⚖️</span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            True/False
          </span>
          <span className="text-sm text-gray-600">Select True or False</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex items-center justify-center space-x-3 p-6 border rounded-lg hover:bg-gray-50 cursor-pointer touch-manipulation min-h-[60px]">
          <input
            type="radio"
            name="tf-answer"
            value="true"
            checked={answer === "true"}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={submitted}
            className="w-5 h-5 text-primary-600 flex-shrink-0"
          />
          <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
          <span className="font-medium text-lg">True</span>
        </label>
        <label className="flex items-center justify-center space-x-3 p-6 border rounded-lg hover:bg-gray-50 cursor-pointer touch-manipulation min-h-[60px]">
          <input
            type="radio"
            name="tf-answer"
            value="false"
            checked={answer === "false"}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={submitted}
            className="w-5 h-5 text-primary-600 flex-shrink-0"
          />
          <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
          <span className="font-medium text-lg">False</span>
        </label>
      </div>
    </div>
  );
};

export default TrueFalseComponent;