import { CheckCircle, XCircle } from "lucide-react";

const MCQComponent = ({ question, answer, setAnswer, submitted }) => {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-lg">📝</span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Multiple Choice
        </span>
        <span className="text-sm text-gray-600">Select one correct answer</span>
      </div>
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