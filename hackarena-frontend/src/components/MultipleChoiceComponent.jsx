const MultipleChoiceComponent = ({ question, answer, setAnswer, submitted }) => {
  let multipleOptions = [];
  if (Array.isArray(question.options)) {
    multipleOptions = question.options;
  } else if (typeof question.options === "string") {
    try {
      multipleOptions = JSON.parse(question.options || "[]");
      if (!Array.isArray(multipleOptions)) {
        multipleOptions = [];
      }
    } catch (error) {
      console.error(
        "Invalid options JSON for multiple answers question:",
        question.options,
        error
      );
      if (question.options.trim()) {
        multipleOptions = question.options
          .split(",")
          .map((opt) => opt.trim())
          .filter((opt) => opt);
      } else {
        multipleOptions = [];
      }
    }
  } else {
    multipleOptions = [];
  }

  // Handle answer as array for multiple selections
  const selectedAnswers = Array.isArray(answer) ? answer : (answer ? answer.split(',').map(a => a.trim()) : []);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-lg">☑️</span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          Multiple Answers
        </span>
        <span className="text-sm text-gray-600">Select all that apply</span>
      </div>
      {multipleOptions.map((option, index) => {
        const isSelected = selectedAnswers.includes(option);
        return (
          <label
            key={index}
            className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer touch-manipulation min-h-[44px] transition-colors ${
              isSelected ? 'bg-purple-50 border-purple-300' : 'hover:bg-gray-50'
            }`}
          >
            <input
              type="checkbox"
              name="multiple-answer"
              value={option}
              checked={isSelected}
              onChange={(e) => {
                const value = e.target.value;
                let newSelected;
                if (e.target.checked) {
                  newSelected = [...selectedAnswers, value];
                } else {
                  newSelected = selectedAnswers.filter(a => a !== value);
                }
                setAnswer(newSelected);
              }}
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
        );
      })}
      {/* Allow empty answer selection for auto-submit scenarios */}
      <label className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer touch-manipulation min-h-[44px] border-dashed border-gray-300 transition-colors ${
        selectedAnswers.length === 0 ? 'bg-gray-50' : ''
      }`}>
        <input
          type="checkbox"
          name="multiple-answer"
          value=""
          checked={selectedAnswers.length === 0}
          onChange={(e) => {
            if (e.target.checked) {
              setAnswer([]);
            }
          }}
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

export default MultipleChoiceComponent;