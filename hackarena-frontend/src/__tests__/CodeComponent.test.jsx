import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CodeComponent from '../components/CodeComponent';

// Mock Prism.js
jest.mock('prismjs', () => ({
  highlight: jest.fn((code) => `<span>${code}</span>`),
  languages: {
    javascript: {},
    python: {},
    java: {},
    cpp: {}
  }
}));

describe('CodeComponent', () => {
  const defaultProps = {
    question: {
      evaluation_mode: 'ide',
      code_language: 'javascript'
    },
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

  it('renders language selector', () => {
    render(<CodeComponent {...defaultProps} />);

    expect(screen.getByText('Programming Language:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('🟨 JavaScript')).toBeInTheDocument();
  });

  it('handles language selection', async () => {
    const user = userEvent.setup();
    render(<CodeComponent {...defaultProps} />);

    const select = screen.getByDisplayValue('🟨 JavaScript');
    await user.selectOptions(select, '🐍 Python');

    expect(defaultProps.setSelectedLanguage).toHaveBeenCalledWith('python');
    expect(defaultProps.setCodeHints).toHaveBeenCalled();
  });

  it('loads template when language changes and answer is empty', async () => {
    const user = userEvent.setup();
    render(<CodeComponent {...defaultProps} />);

    const select = screen.getByDisplayValue('🟨 JavaScript');
    await user.selectOptions(select, '🐍 Python');

    expect(defaultProps.setAnswer).toHaveBeenCalledWith(expect.stringContaining('def solution():'));
  });

  it('renders IDE mode correctly', () => {
    render(<CodeComponent {...defaultProps} />);

    expect(screen.getByText('Your Solution (javascript):')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Write your complete solution...')).toBeInTheDocument();
  });

  it('renders MCQ mode with code snippet', () => {
    const mcqProps = {
      ...defaultProps,
      question: {
        ...defaultProps.question,
        evaluation_mode: 'mcq',
        code_snippet: 'console.log("test");',
        options: ['Option A', 'Option B']
      }
    };

    render(<CodeComponent {...mcqProps} />);

    expect(screen.getByText('Code Snippet (javascript):')).toBeInTheDocument();
    expect(screen.getByText('Answer Options:')).toBeInTheDocument();
  });

  it('renders bugfix mode with buggy code', () => {
    const bugfixProps = {
      ...defaultProps,
      question: {
        ...defaultProps.question,
        evaluation_mode: 'bugfix',
        bug_fix_code: 'console.log("buggy");',
        bug_fix_instructions: 'Fix this code'
      }
    };

    render(<CodeComponent {...bugfixProps} />);

    expect(screen.getByText('Buggy Code (javascript):')).toBeInTheDocument();
    expect(screen.getByText('Your Fixed Code:')).toBeInTheDocument();
    expect(screen.getByText('Fix this code')).toBeInTheDocument();
  });

  it('renders compiler mode with test cases', () => {
    const testCases = [
      { input: '2 3', expected_output: '5', description: 'Add two numbers' }
    ];

    const compilerProps = {
      ...defaultProps,
      question: {
        ...defaultProps.question,
        evaluation_mode: 'compiler',
        test_cases: JSON.stringify(testCases)
      }
    };

    render(<CodeComponent {...compilerProps} />);

    expect(screen.getByText('Code Solution (javascript):')).toBeInTheDocument();
    expect(screen.getByText('Test Cases:')).toBeInTheDocument();
    expect(screen.getByText('Test Case 1')).toBeInTheDocument();
    expect(screen.getByText('2 3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('handles code input in IDE mode', async () => {
    const user = userEvent.setup();
    render(<CodeComponent {...defaultProps} />);

    const editor = screen.getByPlaceholderText('Write your complete solution...');
    await user.type(editor, 'console.log("hello");');

    expect(defaultProps.setAnswer).toHaveBeenCalledWith('console.log("hello");');
  });

  it('disables inputs when submitted', () => {
    render(<CodeComponent {...defaultProps} submitted={true} />);

    const select = screen.getByDisplayValue('🟨 JavaScript');
    expect(select).toBeDisabled();
  });

  it('shows load template button when answer is empty', () => {
    render(<CodeComponent {...defaultProps} />);

    expect(screen.getByText('Load Basic Template')).toBeInTheDocument();
  });

  it('loads template when button is clicked', async () => {
    const user = userEvent.setup();
    render(<CodeComponent {...defaultProps} />);

    const loadButton = screen.getByText('Load Basic Template');
    await user.click(loadButton);

    expect(defaultProps.setAnswer).toHaveBeenCalledWith(expect.stringContaining('function solution()'));
  });

  it('handles invalid test cases JSON gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const invalidTestCasesProps = {
      ...defaultProps,
      question: {
        ...defaultProps.question,
        evaluation_mode: 'compiler',
        test_cases: '{"invalid": "json"'
      }
    };

    render(<CodeComponent {...invalidTestCasesProps} />);

    expect(consoleSpy).toHaveBeenCalledWith('Invalid test cases JSON:', expect.any(Error));
    expect(screen.getByText('Test cases format is invalid.')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('renders starter template in IDE mode when provided', () => {
    const templateProps = {
      ...defaultProps,
      question: {
        ...defaultProps.question,
        ide_template: 'console.log("template");'
      }
    };

    render(<CodeComponent {...templateProps} />);

    expect(screen.getByText('Starter Template (javascript):')).toBeInTheDocument();
    expect(screen.getByText('Load Template')).toBeInTheDocument();
  });

  it('loads starter template when button is clicked', async () => {
    const user = userEvent.setup();
    const templateProps = {
      ...defaultProps,
      question: {
        ...defaultProps.question,
        ide_template: 'console.log("template");'
      }
    };

    render(<CodeComponent {...templateProps} />);

    const loadButton = screen.getByText('Load Template');
    await user.click(loadButton);

    expect(defaultProps.setAnswer).toHaveBeenCalledWith('console.log("template");');
  });

  it('shows correct placeholder text for different evaluation modes', () => {
    // IDE mode
    render(<CodeComponent {...defaultProps} />);
    expect(screen.getByPlaceholderText('Write your complete solution...')).toBeInTheDocument();

    // Compiler mode
    const compilerProps = {
      ...defaultProps,
      question: { ...defaultProps.question, evaluation_mode: 'compiler' }
    };
    const { rerender } = render(<CodeComponent {...compilerProps} />);
    expect(screen.getByPlaceholderText('Write your code. It will be tested against provided test cases...')).toBeInTheDocument();

    // Bugfix mode
    const bugfixProps = {
      ...defaultProps,
      question: { ...defaultProps.question, evaluation_mode: 'bugfix' }
    };
    rerender(<CodeComponent {...bugfixProps} />);
    expect(screen.getByPlaceholderText('Fix the buggy code above...')).toBeInTheDocument();
  });

  it('displays character count', () => {
    render(<CodeComponent {...defaultProps} answer="test code" />);

    expect(screen.getByText('9 characters')).toBeInTheDocument();
  });

  it('shows evaluation mode indicators', () => {
    const compilerProps = {
      ...defaultProps,
      question: { ...defaultProps.question, evaluation_mode: 'compiler' }
    };

    render(<CodeComponent {...compilerProps} />);

    expect(screen.getByText('Code will be tested against multiple cases')).toBeInTheDocument();
  });

  it('shows evaluation mode indicators', () => {
    const compilerProps = {
      ...defaultProps,
      question: { ...defaultProps.question, evaluation_mode: 'compiler' }
    };

    render(<CodeComponent {...compilerProps} />);

    expect(screen.getByText('Code will be tested against multiple cases')).toBeInTheDocument();
  });

  it('handles empty question object gracefully', () => {
    const emptyQuestionProps = {
      ...defaultProps,
      question: {}
    };

    render(<CodeComponent {...emptyQuestionProps} />);

    // Should default to IDE mode
    expect(screen.getByText('Code Solution (javascript):')).toBeInTheDocument();
  });

  it('maintains answer value after re-render', () => {
    const { rerender } = render(<CodeComponent {...defaultProps} answer="test code" />);

    expect(screen.getByDisplayValue('test code')).toBeInTheDocument();

    rerender(<CodeComponent {...defaultProps} answer="test code" />);
    expect(screen.getByDisplayValue('test code')).toBeInTheDocument();
  });
});