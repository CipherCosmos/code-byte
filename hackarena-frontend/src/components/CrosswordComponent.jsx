import { HelpCircle } from "lucide-react";

const CrosswordComponent = ({ question, answer, setAnswer, submitted }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-lg">🔤</span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
          Crossword
        </span>
        <span className="text-sm text-gray-600">Fill in the crossword answers</span>
      </div>
      <div className="text-base text-gray-600 mb-3 leading-relaxed">
        Format: 1A:WORD,2D:WORD,... (use comma to separate entries)
      </div>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={submitted}
        className="input w-full h-40 resize-none text-base py-3 px-4"
        placeholder="1A:EXAMPLE,2D:TEST,..."
      />
      {question.crossword_clues && (
        <div className="bg-gray-50 p-4 rounded-lg">
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
                console.error(
                  "Invalid crossword_clues JSON:",
                  question.crossword_clues,
                  error
                );
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