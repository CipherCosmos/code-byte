import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MCQComponent from '../components/MCQComponent';

describe('MCQComponent', () => {
  const mockQuestion = {
    options: ['Option A', 'Option B', 'Option C', 'Option D']
  };

  const defaultProps = {
    question: mockQuestion,
    answer: '',
    setAnswer: jest.fn(),
    submitted: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with correct structure', () => {
    render(<MCQComponent {...defaultProps} />);

    expect(screen.getByText('📝')).toBeInTheDocument();
    expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
    expect(screen.getByText('Select one correct answer')).toBeInTheDocument();
  });

  it('renders all options correctly', () => {
    render(<MCQComponent {...defaultProps} />);

    expect(screen.getByText('A.')).toBeInTheDocument();
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('B.')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getByText('C.')).toBeInTheDocument();
    expect(screen.getByText('Option C')).toBeInTheDocument();
    expect(screen.getByText('D.')).toBeInTheDocument();
    expect(screen.getByText('Option D')).toBeInTheDocument();
  });

  it('renders "No answer" option', () => {
    render(<MCQComponent {...defaultProps} />);

    expect(screen.getByText('No answer')).toBeInTheDocument();
    expect(screen.getByText('(Leave blank - will auto-submit when time expires)')).toBeInTheDocument();
  });

  it('handles option selection', async () => {
    const user = userEvent.setup();
    render(<MCQComponent {...defaultProps} />);

    const optionA = screen.getByDisplayValue('Option A');
    await user.click(optionA);

    expect(defaultProps.setAnswer).toHaveBeenCalledWith('Option A');
  });

  it('shows selected option as checked', () => {
    render(<MCQComponent {...defaultProps} answer="Option B" />);

    const optionB = screen.getByDisplayValue('Option B');
    expect(optionB).toBeChecked();

    const optionA = screen.getByDisplayValue('Option A');
    expect(optionA).not.toBeChecked();
  });

  it('disables all inputs when submitted', () => {
    render(<MCQComponent {...defaultProps} submitted={true} />);

    const radioButtons = screen.getAllByRole('radio');
    radioButtons.forEach(radio => {
      expect(radio).toBeDisabled();
    });
  });

  it('handles array options correctly', () => {
    const questionWithArrayOptions = {
      options: ['First', 'Second', 'Third']
    };

    render(<MCQComponent {...defaultProps} question={questionWithArrayOptions} />);

    expect(screen.getByText('A.')).toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('B.')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('C.')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });

  it('handles JSON string options correctly', () => {
    const questionWithJsonOptions = {
      options: '["Choice 1", "Choice 2", "Choice 3"]'
    };

    render(<MCQComponent {...defaultProps} question={questionWithJsonOptions} />);

    expect(screen.getByText('A.')).toBeInTheDocument();
    expect(screen.getByText('Choice 1')).toBeInTheDocument();
    expect(screen.getByText('B.')).toBeInTheDocument();
    expect(screen.getByText('Choice 2')).toBeInTheDocument();
    expect(screen.getByText('C.')).toBeInTheDocument();
    expect(screen.getByText('Choice 3')).toBeInTheDocument();
  });

  it('handles comma-separated string options correctly', () => {
    const questionWithCommaOptions = {
      options: 'Red, Green, Blue, Yellow'
    };

    render(<MCQComponent {...defaultProps} question={questionWithCommaOptions} />);

    expect(screen.getByText('A.')).toBeInTheDocument();
    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('B.')).toBeInTheDocument();
    expect(screen.getByText('Green')).toBeInTheDocument();
    expect(screen.getByText('C.')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
    expect(screen.getByText('D.')).toBeInTheDocument();
    expect(screen.getByText('Yellow')).toBeInTheDocument();
  });

  it('handles empty options gracefully', () => {
    const questionWithEmptyOptions = {
      options: []
    };

    render(<MCQComponent {...defaultProps} question={questionWithEmptyOptions} />);

    // Should still render the component structure
    expect(screen.getByText('📝')).toBeInTheDocument();
    expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
    // Should still have the "No answer" option
    expect(screen.getByText('No answer')).toBeInTheDocument();
  });

  it('handles invalid JSON options gracefully', () => {
    const questionWithInvalidJson = {
      options: '{"invalid": "json"'
    };

    // Mock console.error to avoid test output pollution
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<MCQComponent {...defaultProps} question={questionWithInvalidJson} />);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Invalid options JSON for MCQ question:',
      '{"invalid": "json"',
      expect.any(Error)
    );

    // Should still render the component
    expect(screen.getByText('📝')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('handles null/undefined options gracefully', () => {
    const questionWithNullOptions = {
      options: null
    };

    render(<MCQComponent {...defaultProps} question={questionWithNullOptions} />);

    // Should still render the component structure
    expect(screen.getByText('📝')).toBeInTheDocument();
    expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
    // Should still have the "No answer" option
    expect(screen.getByText('No answer')).toBeInTheDocument();
  });

  it('handles "No answer" selection', async () => {
    const user = userEvent.setup();
    render(<MCQComponent {...defaultProps} />);

    const noAnswerCheckbox = screen.getByDisplayValue('');
    await user.click(noAnswerCheckbox);

    expect(defaultProps.setAnswer).toHaveBeenCalledWith('');
  });

  it('shows "No answer" as checked when answer is empty string', () => {
    render(<MCQComponent {...defaultProps} answer="" />);

    const noAnswerRadio = screen.getByDisplayValue('');
    expect(noAnswerRadio).toBeChecked();
  });

  it('applies correct CSS classes for styling', () => {
    render(<MCQComponent {...defaultProps} />);

    // Check that options have the correct classes
    const optionLabels = screen.getAllByRole('radio').map(radio =>
      radio.closest('label')
    ).filter(Boolean);

    optionLabels.forEach(label => {
      expect(label).toHaveClass('flex', 'items-start', 'space-x-3', 'p-4', 'border', 'rounded-lg');
    });
  });

  it('has proper accessibility attributes', () => {
    render(<MCQComponent {...defaultProps} />);

    const radioButtons = screen.getAllByRole('radio');
    radioButtons.forEach((radio, index) => {
      expect(radio).toHaveAttribute('name', 'mcq-answer');
      expect(radio).toHaveAttribute('type', 'radio');
    });
  });
});