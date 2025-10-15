import MCQComponent from './MCQComponent';
import TrueFalseComponent from './TrueFalseComponent';
import MultipleChoiceComponent from './MultipleChoiceComponent';
import CodeComponent from './CodeComponent';
import TextInputComponent from './TextInputComponent';
import CrosswordComponent from './CrosswordComponent';
import ImageComponent from './ImageComponent';
import FillBlankComponent from './FillBlankComponent';
import ShortAnswerComponent from './ShortAnswerComponent';

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
  setCodeHints,
  hintUsed,
  setHintUsed
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
          hintUsed={hintUsed}
          setHintUsed={setHintUsed}
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
          hintUsed={hintUsed}
          setHintUsed={setHintUsed}
        />
      );

    case "multiple":
    case "multiple_choice":
    case "multiple_answers":
      return (
        <MultipleChoiceComponent
          question={question}
          answer={answer}
          setAnswer={setAnswer}
          submitted={submitted}
          hintUsed={hintUsed}
          setHintUsed={setHintUsed}
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
          hintUsed={hintUsed}
          setHintUsed={setHintUsed}
        />
      );

    case "image":
      return (
        <ImageComponent
          question={question}
          answer={answer}
          setAnswer={setAnswer}
          submitted={submitted}
          hintUsed={hintUsed}
          setHintUsed={setHintUsed}
        />
      );

    case "fill_blank":
      return (
        <FillBlankComponent
          question={question}
          answer={answer}
          setAnswer={setAnswer}
          submitted={submitted}
          hintUsed={hintUsed}
          setHintUsed={setHintUsed}
        />
      );

    case "short_answer":
      return (
        <ShortAnswerComponent
          question={question}
          answer={answer}
          setAnswer={setAnswer}
          submitted={submitted}
          hintUsed={hintUsed}
          setHintUsed={setHintUsed}
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