const TextInputComponent = ({ question, answer, setAnswer, submitted }) => {
  const getQuestionTypeInfo = (type) => {
    switch (type) {
      case "fill_blank":
        return { label: "Fill in the Blank", icon: "✏️", color: "bg-yellow-100 text-yellow-800", placeholder: "Fill in the blank..." };
      case "short_answer":
        return { label: "Short Answer", icon: "📝", color: "bg-indigo-100 text-indigo-800", placeholder: "Provide a short answer..." };
      case "image":
        return { label: "Image Based", icon: "🖼️", color: "bg-pink-100 text-pink-800", placeholder: "Describe what you see..." };
      default:
        return { label: "Text Input", icon: "📝", color: "bg-gray-100 text-gray-800", placeholder: "Type your answer..." };
    }
  };

  const typeInfo = getQuestionTypeInfo(question.question_type);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-lg">{typeInfo.icon}</span>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
          {typeInfo.label}
        </span>
        <span className="text-sm text-gray-600">
          {question.question_type === 'fill_blank' ? 'Fill in the blank' :
           question.question_type === 'short_answer' ? 'Provide a short answer' :
           'Describe what you see'}
        </span>
      </div>

      {/* Display image for image-based questions */}
      {question.question_type === "image" && question.image_url && (
        <div className="mb-4">
          <img
            src={`http://localhost:3001${question.image_url}`}
            alt="Question"
            className="max-w-full h-48 sm:h-64 object-contain border rounded-lg shadow-sm"
          />
        </div>
      )}

      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={submitted}
        className="input w-full text-base py-3 px-4 min-h-[44px]"
        placeholder={typeInfo.placeholder}
      />
    </div>
  );
};

export default TextInputComponent;