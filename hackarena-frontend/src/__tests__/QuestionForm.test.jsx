import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionForm from '../components/QuestionForm';

// Mock fetch for image upload
global.fetch = jest.fn();

describe('QuestionForm Component', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  it('renders form with default values', () => {
    render(<QuestionForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    expect(screen.getByText('✨ Create New DSBA Question')).toBeInTheDocument();
    expect(screen.getByText('Basic Info')).toBeInTheDocument();
    expect(screen.getByText('Question Content')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Question Text *')).toBeInTheDocument();
    expect(screen.getByDisplayValue('📝 Multiple Choice Question')).toBeInTheDocument();
  });

  it('renders form with existing question data', () => {
    const existingQuestion = {
      question_text: 'What is 2+2?',
      question_type: 'mcq',
      options: ['3', '4', '5', '6'],
      correct_answer: '4',
      marks: 10,
      time_limit: 60,
      difficulty: 'easy'
    };

    render(
      <QuestionForm
        question={existingQuestion}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('✏️ Edit DSBA Question')).toBeInTheDocument();
    expect(screen.getByDisplayValue('What is 2+2?')).toBeInTheDocument();
    expect(screen.getByDisplayValue('🟢 Easy - Beginner friendly')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<QuestionForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    const submitButton = screen.getByRole('button', { name: /Create Question/i });

    await user.click(submitButton);

    // Should show alert for missing question text
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('handles MCQ question type correctly', async () => {
    const user = userEvent.setup();
    render(<QuestionForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Switch to Question Content tab
    const contentTab = screen.getByText('Question Content');
    await user.click(contentTab);

    // Form should show options for MCQ
    expect(screen.getByText('Answer Options')).toBeInTheDocument();

    // Fill required fields
    const questionInput = screen.getByPlaceholderText('Enter your engaging question... (e.g., \'What is the output of the following code?\')');
    const correctAnswerInput = screen.getByText('Correct Answer *');

    await user.type(questionInput, 'Test question');
    await user.selectOptions(correctAnswerInput, 'Option A');

    // Add an option
    const optionInputs = screen.getAllByPlaceholderText(/Enter option [A-D]/);
    await user.type(optionInputs[0], 'Option A');

    const submitButton = screen.getByRole('button', { name: /Create Question/i });
    await user.click(submitButton);

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        questionText: 'Test question',
        questionType: 'mcq',
        correctAnswer: 'A'
      })
    );
  });

  it('handles coding question with IDE evaluation', async () => {
    const user = userEvent.setup();
    render(<QuestionForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Change to code type
    const typeSelect = screen.getByDisplayValue('📝 Multiple Choice Question');
    await user.selectOptions(typeSelect, '💻 Code Challenge');

    // Switch to Question Content tab
    const contentTab = screen.getByText('Question Content');
    await user.click(contentTab);

    // Should show code question variant
    expect(screen.getByText('Code Challenge Type')).toBeInTheDocument();

    // Change to IDE Mode
    const evalSelect = screen.getByDisplayValue('🧩 Code Snippet MCQ - Multiple choice with code options');
    await user.selectOptions(evalSelect, '💻 IDE Mode - Write complete solution from scratch');

    // Should show code template
    expect(screen.getByText('Code Template/Boilerplate (Optional starter code)')).toBeInTheDocument();

    // Switch to Basic Info tab first to access question input
    const basicTab = screen.getByText('Basic Info');
    await user.click(basicTab);

    // Fill required fields
    const questionInput = screen.getByPlaceholderText('Enter your engaging question... (e.g., \'What is the output of the following code?\')');
    const correctAnswerTextarea = screen.getByPlaceholderText('Enter the expected complete solution...');

    await user.type(questionInput, 'Write a function to reverse a string');
    await user.type(correctAnswerTextarea, 'function reverse(str) { return str.split("").reverse().join(""); }');

    const submitButton = screen.getByRole('button', { name: /Create Question/i });
    await user.click(submitButton);

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        questionText: 'Write a function to reverse a string',
        questionType: 'code',
        evaluationMode: 'ide',
        correctAnswer: 'function reverse(str) { return str.split("").reverse().join(""); }'
      })
    );
  });

  it('handles coding question with compiler evaluation', async () => {
    const user = userEvent.setup();
    render(<QuestionForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Change to code type
    const typeSelect = screen.getByDisplayValue('📝 Multiple Choice Question');
    await user.selectOptions(typeSelect, '💻 Code Challenge');

    // Switch to Question Content tab
    const contentTab = screen.getByText('Question Content');
    await user.click(contentTab);

    // Change to compiler mode
    const evalSelect = screen.getByDisplayValue('🧩 Code Snippet MCQ - Multiple choice with code options');
    await user.selectOptions(evalSelect, '⚙️ Compiler Mode - Test against input/output pairs');

    // Should show test cases field
    expect(screen.getByText('Test Cases (Input/Output pairs) *')).toBeInTheDocument();

    // Switch to Basic Info tab first to access question input
    const basicTab = screen.getByText('Basic Info');
    await user.click(basicTab);

    // Fill required fields and test cases
    const questionInput = screen.getByPlaceholderText('Enter your engaging question... (e.g., \'What is the output of the following code?\')');
    const testCasesTextarea = screen.getByPlaceholderText('[\n  {\n    "input": "2 3",\n    "expectedOutput": "5",\n    "description": "Add two numbers"\n  },\n  {\n    "input": "10 20",\n    "expectedOutput": "30",\n    "description": "Add larger numbers"\n  }\n]');

    await user.type(questionInput, 'Write a function to add two numbers');
    await user.clear(testCasesTextarea);
    await user.type(testCasesTextarea, '[{"input": "2 3", "expectedOutput": "5", "description": "Add two numbers"}, {"input": "10 20", "expectedOutput": "30", "description": "Add larger numbers"}]');

    const submitButton = screen.getByRole('button', { name: /Create Question/i });
    await user.click(submitButton);

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        questionText: 'Write a function to add two numbers',
        questionType: 'code',
        evaluationMode: 'compiler',
        testCases: '[{"input": "2 3", "expectedOutput": "5", "description": "Add two numbers"}, {"input": "10 20", "expectedOutput": "30", "description": "Add larger numbers"}]'
      })
    );
  });

  it('handles crossword question type', async () => {
    const user = userEvent.setup();
    render(<QuestionForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Change to crossword type
    const typeSelect = screen.getByDisplayValue('📝 Multiple Choice Question');
    await user.selectOptions(typeSelect, '🔤 Crossword Puzzle');

    // Switch to Question Content tab
    const contentTab = screen.getByText('Question Content');
    await user.click(contentTab);

    // Should show crossword configuration
    expect(screen.getByText('Crossword Configuration')).toBeInTheDocument();
    expect(screen.getByText('Rows')).toBeInTheDocument();
    expect(screen.getByText('Columns')).toBeInTheDocument();

    // Switch to Basic Info tab first to access question input
    const basicTab = screen.getByText('Basic Info');
    await user.click(basicTab);

    // Fill required fields
    const questionInput = screen.getByPlaceholderText('Enter your engaging question... (e.g., \'What is the output of the following code?\')');

    await user.type(questionInput, 'Solve this crossword');

    const submitButton = screen.getByRole('button', { name: /Create Question/i });
    await user.click(submitButton);

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        questionText: 'Solve this crossword',
        questionType: 'crossword'
      })
    );
  });

  it('handles image upload for image-based questions', async () => {
    const user = userEvent.setup();
    render(<QuestionForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Change to image type
    const typeSelect = screen.getByDisplayValue('📝 Multiple Choice Question');
    await user.selectOptions(typeSelect, '🖼️ Image-based Question');

    // Switch to Question Content tab
    const contentTab = screen.getByText('Question Content');
    await user.click(contentTab);

    // Should show image upload
    expect(screen.getByText('Question Image')).toBeInTheDocument();

    // Mock successful upload
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ imageUrl: '/uploads/test-image.jpg' })
    });

    // Simulate file selection
    const fileInput = screen.getByDisplayValue('');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:10000/api/games/upload-image', expect.any(Object));
    });
  });

  it('adds and removes options for MCQ', async () => {
    const user = userEvent.setup();
    render(<QuestionForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    // Switch to Question Content tab
    const contentTab = screen.getByText('Question Content');
    await user.click(contentTab);

    // Should start with 4 options
    let optionInputs = screen.getAllByPlaceholderText(/Enter option [A-D]/);
    expect(optionInputs).toHaveLength(4);

    // Add option
    const addButton = screen.getByRole('button', { name: /Add Option/i });
    await user.click(addButton);

    // Should now have 5 options
    optionInputs = screen.getAllByPlaceholderText(/Enter option [A-E]/);
    expect(optionInputs).toHaveLength(5);

    // Remove an option
    const removeButtons = screen.getAllByRole('button', { name: /Remove option [A-E]/ }); // Minus buttons
    await user.click(removeButtons[0]);

    // Should now have 4 options again
    optionInputs = screen.getAllByPlaceholderText(/Enter option [A-D]/);
    expect(optionInputs).toHaveLength(4);
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<QuestionForm onSave={mockOnSave} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });
});