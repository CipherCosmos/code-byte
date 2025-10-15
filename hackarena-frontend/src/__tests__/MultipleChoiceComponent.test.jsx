import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MultipleChoiceComponent from '../components/MultipleChoiceComponent';

describe('MultipleChoiceComponent', () => {
  const mockQuestion = {
    options: ['Option A', 'Option B', 'Option C', 'Option D']
  };

  const defaultProps = {
    question: mockQuestion,
    answer: [],
    setAnswer: jest.fn(),
    submitted: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with correct structure', () => {
    render(<MultipleChoiceComponent {...defaultProps} />);

    expect(screen.getByText('☑️')).toBeInTheDocument();
    expect(screen.getByText('Multiple Answers')).toBeInTheDocument();
    expect(screen.getByText('Select all that apply')).toBeInTheDocument();
  });

  it('renders all options correctly', () => {
    render(<MultipleChoiceComponent {...defaultProps} />);

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
    render(<MultipleChoiceComponent {...defaultProps} />);

    expect(screen.getByText('No answer')).toBeInTheDocument();
    expect(screen.getByText('(Leave blank - will auto-submit when time expires)')).toBeInTheDocument();
  });

  it('handles single option selection', async () => {
    const user = userEvent.setup();
    render(<MultipleChoiceComponent {...defaultProps} />);

    const optionA = screen.getByDisplayValue('Option A');
    await user.click(optionA);

    expect(defaultProps.setAnswer).toHaveBeenCalledWith(['Option A']);
  });

  it('handles multiple option selection', async () => {
    const user = userEvent.setup();
    render(<MultipleChoiceComponent {...defaultProps} />);

    const optionA = screen.getByDisplayValue('Option A');
    const optionC = screen.getByDisplayValue('Option C');

    await user.click(optionA);
    await user.click(optionC);

    expect(defaultProps.setAnswer).toHaveBeenCalledWith(['Option A']);
    expect(defaultProps.setAnswer).toHaveBeenCalledWith(['Option A', 'Option C']);
  });

  it('handles option deselection', async () => {
    const user = userEvent.setup();
    render(<MultipleChoiceComponent {...defaultProps} answer={['Option A', 'Option B']} />);

    const optionA = screen.getByDisplayValue('Option A');
    await user.click(optionA);

    expect(defaultProps.setAnswer).toHaveBeenCalledWith(['Option B']);
  });

  it('shows selected options as checked', () => {
    render(<MultipleChoiceComponent {...defaultProps} answer={['Option B', 'Option D']} />);

    const optionB = screen.getByDisplayValue('Option B');
    const optionD = screen.getByDisplayValue('Option D');
    const optionA = screen.getByDisplayValue('Option A');

    expect(optionB).toBeChecked();
    expect(optionD).toBeChecked();
    expect(optionA).not.toBeChecked();
  });

  it('handles array options correctly', () => {
    const questionWithArrayOptions = {
      options: ['First', 'Second', 'Third']
    };

    render(<MultipleChoiceComponent {...defaultProps} question={questionWithArrayOptions} />);

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

    render(<MultipleChoiceComponent {...defaultProps} question={questionWithJsonOptions} />);

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

    render(<MultipleChoiceComponent {...defaultProps} question={questionWithCommaOptions} />);

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

    render(<MultipleChoiceComponent {...defaultProps} question={questionWithEmptyOptions} />);

    // Should still render the component structure
    expect(screen.getByText('☑️')).toBeInTheDocument();
    expect(screen.getByText('Multiple Answers')).toBeInTheDocument();
    // Should still have the "No answer" option
    expect(screen.getByText('No answer')).toBeInTheDocument();
  });

  it('handles invalid JSON options gracefully', () => {
    const questionWithInvalidJson = {
      options: '{"invalid": "json"'
    };

    // Mock console.error to avoid test output pollution
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<MultipleChoiceComponent {...defaultProps} question={questionWithInvalidJson} />);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Invalid options JSON for multiple answers question:',
      '{"invalid": "json"',
      expect.any(Error)
    );

    // Should still render the component
    expect(screen.getByText('☑️')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('handles null/undefined options gracefully', () => {
    const questionWithNullOptions = {
      options: null
    };

    render(<MultipleChoiceComponent {...defaultProps} question={questionWithNullOptions} />);

    // Should still render the component structure
    expect(screen.getByText('☑️')).toBeInTheDocument();
    expect(screen.getByText('Multiple Answers')).toBeInTheDocument();
    // Should still have the "No answer" option
    expect(screen.getByText('No answer')).toBeInTheDocument();
  });

  it('handles string answer format correctly', () => {
    render(<MultipleChoiceComponent {...defaultProps} answer="Option A,Option C" />);

    const optionA = screen.getByDisplayValue('Option A');
    const optionC = screen.getByDisplayValue('Option C');
    const optionB = screen.getByDisplayValue('Option B');

    expect(optionA).toBeChecked();
    expect(optionC).toBeChecked();
    expect(optionB).not.toBeChecked();
  });

  it('handles "No answer" selection', async () => {
    const user = userEvent.setup();
    render(<MultipleChoiceComponent {...defaultProps} answer={['Option A']} />);

    const noAnswerCheckbox = screen.getByDisplayValue('');
    await user.click(noAnswerCheckbox);

    expect(defaultProps.setAnswer).toHaveBeenCalledWith([]);
  });

  it('shows "No answer" as checked when no answers selected', () => {
    render(<MultipleChoiceComponent {...defaultProps} answer={[]} />);

    const noAnswerCheckbox = screen.getByDisplayValue('');
    expect(noAnswerCheckbox).toBeChecked();
  });

  it('disables all inputs when submitted', () => {
    render(<MultipleChoiceComponent {...defaultProps} submitted={true} />);

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeDisabled();
    });
  });

  it('applies correct CSS classes for selected options', () => {
    render(<MultipleChoiceComponent {...defaultProps} answer={['Option A']} />);

    const optionALabel = screen.getByDisplayValue('Option A').closest('label');
    expect(optionALabel).toHaveClass('bg-purple-50', 'border-purple-300');
  });

  it('applies correct CSS classes for unselected options', () => {
    render(<MultipleChoiceComponent {...defaultProps} answer={['Option A']} />);

    const optionBLabel = screen.getByDisplayValue('Option B').closest('label');
    expect(optionBLabel).toHaveClass('hover:bg-gray-50');
    expect(optionBLabel).not.toHaveClass('bg-purple-50');
  });

  it('has proper accessibility attributes', () => {
    render(<MultipleChoiceComponent {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
      expect(checkbox).toHaveAttribute('name', 'multiple-answer');
      expect(checkbox).toHaveAttribute('type', 'checkbox');
    });
  });
});