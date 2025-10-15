import { CheckCircle, XCircle } from "lucide-react";

const TrueFalseComponent = ({ question, answer, setAnswer, submitted }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-lg">⚖️</span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          True/False
        </span>
        <span className="text-sm text-gray-600">Select True or False</span>
      </div>
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