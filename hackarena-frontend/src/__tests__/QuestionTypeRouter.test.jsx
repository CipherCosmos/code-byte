import { render, screen } from '@testing-library/react';
import QuestionTypeRouter from '../components/QuestionTypeRouter';
import MCQComponent from '../components/MCQComponent';
import TrueFalseComponent from '../components/TrueFalseComponent';
import MultipleChoiceComponent from '../components/MultipleChoiceComponent';
import CodeComponent from '../components/CodeComponent';
import TextInputComponent from '../components/TextInputComponent';
import CrosswordComponent from '../components/CrosswordComponent';
import ImageComponent from '../components/ImageComponent';
import FillBlankComponent from '../components/FillBlankComponent';
import ShortAnswerComponent from '../components/ShortAnswerComponent';

// Mock all components
jest.mock('../components/MCQComponent', () => jest.fn(() => <div data-testid="mcq-component">MCQ Component</div>));
jest.mock('../components/TrueFalseComponent', () => jest.fn(() => <div data-testid="true-false-component">True False Component</div>));
jest.mock('../components/MultipleChoiceComponent', () => jest.fn(() => <div data-testid="multiple-choice-component">Multiple Choice Component</div>));
jest.mock('../components/CodeComponent', () => jest.fn(() => <div data-testid="code-component">Code Component</div>));
jest.mock('../components/TextInputComponent', () => jest.fn(() => <div data-testid="text-input-component">Text Input Component</div>));
jest.mock('../components/CrosswordComponent', () => jest.fn(() => <div data-testid="crossword-component">Crossword Component</div>));
jest.mock('../components/ImageComponent', () => jest.fn(() => <div data-testid="image-component">Image Component</div>));
jest.mock('../components/FillBlankComponent', () => jest.fn(() => <div data-testid="fill-blank-component">Fill Blank Component</div>));
jest.mock('../components/ShortAnswerComponent', () => jest.fn(() => <div data-testid="short-answer-component">Short Answer Component</div>));

describe('QuestionTypeRouter Component', () => {
  const mockProps = {
    answer: '',
    setAnswer: jest.fn(),
    selectedLanguage: 'javascript',
    setSelectedLanguage: jest.fn(),
    submitted: false,
    showInstructions: true,
    setShowInstructions: jest.fn(),
    codeHints: [],
    setCodeHints: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null when no question is provided', () => {
    const { container } = render(<QuestionTypeRouter {...mockProps} question={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders MCQComponent for mcq question type', () => {
    const question = { question_type: 'mcq' };
    render(<QuestionTypeRouter {...mockProps} question={question} />);

    expect(screen.getByTestId('mcq-component')).toBeInTheDocument();
    expect(MCQComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        question,
        answer: mockProps.answer,
        setAnswer: mockProps.setAnswer,
        submitted: mockProps.submitted
      }),
      expect.any(Object)
    );
  });

  it('renders MCQComponent for multiple_choice_single question type', () => {
    const question = { question_type: 'multiple_choice_single' };
    render(<QuestionTypeRouter {...mockProps} question={question} />);

    expect(screen.getByTestId('mcq-component')).toBeInTheDocument();
    expect(MCQComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        question,
        answer: mockProps.answer,
        setAnswer: mockProps.setAnswer,
        submitted: mockProps.submitted
      }),
      expect.any(Object)
    );
  });

  it('renders TrueFalseComponent for truefalse question type', () => {
    const question = { question_type: 'truefalse' };
    render(<QuestionTypeRouter {...mockProps} question={question} />);

    expect(screen.getByTestId('true-false-component')).toBeInTheDocument();
    expect(TrueFalseComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        question,
        answer: mockProps.answer,
        setAnswer: mockProps.setAnswer,
        submitted: mockProps.submitted
      }),
      expect.any(Object)
    );
  });

  it('renders TrueFalseComponent for true_false question type', () => {
    const question = { question_type: 'true_false' };
    render(<QuestionTypeRouter {...mockProps} question={question} />);

    expect(screen.getByTestId('true-false-component')).toBeInTheDocument();
    expect(TrueFalseComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        question,
        answer: mockProps.answer,
        setAnswer: mockProps.setAnswer,
        submitted: mockProps.submitted
      }),
      expect.any(Object)
    );
  });

  it('renders MultipleChoiceComponent for multiple question type', () => {
    const question = { question_type: 'multiple' };
    render(<QuestionTypeRouter {...mockProps} question={question} />);

    expect(screen.getByTestId('multiple-choice-component')).toBeInTheDocument();
    expect(MultipleChoiceComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        question,
        answer: mockProps.answer,
        setAnswer: mockProps.setAnswer,
        submitted: mockProps.submitted
      }),
      expect.any(Object)
    );
  });

  it('renders MultipleChoiceComponent for multiple_choice question type', () => {
    const question = { question_type: 'multiple_choice' };
    render(<QuestionTypeRouter {...mockProps} question={question} />);

    expect(screen.getByTestId('multiple-choice-component')).toBeInTheDocument();
    expect(MultipleChoiceComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        question,
        answer: mockProps.answer,
        setAnswer: mockProps.setAnswer,
        submitted: mockProps.submitted
      }),
      expect.any(Object)
    );
  });

  it('renders MultipleChoiceComponent for multiple_answers question type', () => {
    const question = { question_type: 'multiple_answers' };
    render(<QuestionTypeRouter {...mockProps} question={question} />);

    expect(screen.getByTestId('multiple-choice-component')).toBeInTheDocument();
    expect(MultipleChoiceComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        question,
        answer: mockProps.answer,
        setAnswer: mockProps.setAnswer,
        submitted: mockProps.submitted
      }),
      expect.any(Object)
    );
  });

  it('renders CodeComponent for code question type', () => {
    const question = { question_type: 'code' };
    render(<QuestionTypeRouter {...mockProps} question={question} />);

    expect(screen.getByTestId('code-component')).toBeInTheDocument();
    expect(CodeComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        question,
        answer: mockProps.answer,
        setAnswer: mockProps.setAnswer,
        selectedLanguage: mockProps.selectedLanguage,
        setSelectedLanguage: mockProps.setSelectedLanguage,
        submitted: mockProps.submitted,
        showInstructions: mockProps.showInstructions,
        setShowInstructions: mockProps.setShowInstructions,
        codeHints: mockProps.codeHints,
        setCodeHints: mockProps.setCodeHints
      }),
      expect.any(Object)
    );
  });

  it('renders FillBlankComponent for fill_blank question type', () => {
    const question = { question_type: 'fill_blank' };
    render(<QuestionTypeRouter {...mockProps} question={question} />);

    expect(screen.getByTestId('fill-blank-component')).toBeInTheDocument();
    expect(FillBlankComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        question,
        answer: mockProps.answer,
        setAnswer: mockProps.setAnswer,
        submitted: mockProps.submitted
      }),
      expect.any(Object)
    );
  });

  it('renders ShortAnswerComponent for short_answer question type', () => {
    const question = { question_type: 'short_answer' };
    render(<QuestionTypeRouter {...mockProps} question={question} />);

    expect(screen.getByTestId('short-answer-component')).toBeInTheDocument();
    expect(ShortAnswerComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        question,
        answer: mockProps.answer,
        setAnswer: mockProps.setAnswer,
        submitted: mockProps.submitted
      }),
      expect.any(Object)
    );
  });

  it('renders ImageComponent for image question type', () => {
    const question = { question_type: 'image' };
    render(<QuestionTypeRouter {...mockProps} question={question} />);

    expect(screen.getByTestId('image-component')).toBeInTheDocument();
    expect(ImageComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        question,
        answer: mockProps.answer,
        setAnswer: mockProps.setAnswer,
        submitted: mockProps.submitted
      }),
      expect.any(Object)
    );
  });

  it('renders CrosswordComponent for crossword question type', () => {
    const question = { question_type: 'crossword' };
    render(<QuestionTypeRouter {...mockProps} question={question} />);

    expect(screen.getByTestId('crossword-component')).toBeInTheDocument();
    expect(CrosswordComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        question,
        answer: mockProps.answer,
        setAnswer: mockProps.setAnswer,
        submitted: mockProps.submitted
      }),
      expect.any(Object)
    );
  });

  it('renders CrosswordComponent for crossword_puzzle question type', () => {
    const question = { question_type: 'crossword_puzzle' };
    render(<QuestionTypeRouter {...mockProps} question={question} />);

    expect(screen.getByTestId('crossword-component')).toBeInTheDocument();
    expect(CrosswordComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        question,
        answer: mockProps.answer,
        setAnswer: mockProps.setAnswer,
        submitted: mockProps.submitted
      }),
      expect.any(Object)
    );
  });

  it('renders TextInputComponent for unknown question types', () => {
    const question = { question_type: 'unknown_type' };
    render(<QuestionTypeRouter {...mockProps} question={question} />);

    expect(screen.getByTestId('text-input-component')).toBeInTheDocument();
    expect(TextInputComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        question,
        answer: mockProps.answer,
        setAnswer: mockProps.setAnswer,
        submitted: mockProps.submitted
      }),
      expect.any(Object)
    );
  });

  it('passes all required props to components', () => {
    const question = { question_type: 'mcq' };
    const customProps = {
      ...mockProps,
      answer: 'test answer',
      selectedLanguage: 'python',
      submitted: true,
      showInstructions: false
    };

    render(<QuestionTypeRouter {...customProps} question={question} />);

    expect(MCQComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        question,
        answer: 'test answer',
        setAnswer: customProps.setAnswer,
        submitted: true
      }),
      expect.any(Object)
    );
  });
});