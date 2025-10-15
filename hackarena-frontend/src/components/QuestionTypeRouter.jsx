import MCQComponent from './MCQComponent';
import TrueFalseComponent from './TrueFalseComponent';
import MultipleChoiceComponent from './MultipleChoiceComponent';
import CodeComponent from './CodeComponent';
import TextInputComponent from './TextInputComponent';
import CrosswordComponent from './CrosswordComponent';

const QuestionTypeRouter = ({
  question,
  answer,
  setAnswer,
  selectedLanguage,
  setSelectedLanguage,
  submitted,
  showInstructions,
  setShowInstructions,
  codeHints,
  setCodeHints
}) => {
  if (!question) return null;

  const questionType = question.question_type;

  switch (questionType) {
    case "mcq":
    case "multiple_choice_single":
      return (
        <MCQComponent
          question={question}
          answer={answer}
          setAnswer={setAnswer}
          submitted={submitted}
        />
      );

    case "truefalse":
    case "true_false":
      return (
        <TrueFalseComponent
          question={question}
          answer={answer}
          setAnswer={setAnswer}
          submitted={submitted}
        />
      );

    case "multiple":
    case "multiple_choice":
      return (
        <MultipleChoiceComponent
          question={question}
          answer={answer}
          setAnswer={setAnswer}
          submitted={submitted}
        />
      );

    case "code":
      return (
        <CodeComponent
          question={question}
          answer={answer}
          setAnswer={setAnswer}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
          submitted={submitted}
          showInstructions={showInstructions}
          setShowInstructions={setShowInstructions}
          codeHints={codeHints}
          setCodeHints={setCodeHints}
        />
      );

    case "fill_blank":
    case "short_answer":
    case "image":
      return (
        <TextInputComponent
          question={question}
          answer={answer}
          setAnswer={setAnswer}
          submitted={submitted}
        />
      );

    case "crossword":
    case "crossword_puzzle":
      return (
        <CrosswordComponent
          question={question}
          answer={answer}
          setAnswer={setAnswer}
          submitted={submitted}
        />
      );

    default:
      // Default to text input for unknown question types
      return (
        <TextInputComponent
          question={question}
          answer={answer}
          setAnswer={setAnswer}
          submitted={submitted}
        />
      );
  }
};

export default QuestionTypeRouter;