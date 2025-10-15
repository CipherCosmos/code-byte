import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrueFalseComponent from '../components/TrueFalseComponent';
import { CheckCircle, XCircle } from 'lucide-react';

describe('TrueFalseComponent', () => {
  const mockQuestion = {};

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
    render(<TrueFalseComponent {...defaultProps} />);

    expect(screen.getByText('⚖️')).toBeInTheDocument();
    expect(screen.getByText('True/False')).toBeInTheDocument();
    expect(screen.getByText('Select True or False')).toBeInTheDocument();
    expect(screen.getByText('True')).toBeInTheDocument();
    expect(screen.getByText('False')).toBeInTheDocument();
  });

  it('renders True and False options with correct icons', () => {
    render(<TrueFalseComponent {...defaultProps} />);

    // Check that CheckCircle and XCircle icons are rendered
    const checkIcon = document.querySelector('[data-testid="CheckCircle"]') ||
                     screen.getByText('True').closest('label')?.querySelector('svg');
    const xIcon = document.querySelector('[data-testid="XCircle"]') ||
                  screen.getByText('False').closest('label')?.querySelector('svg');

    expect(checkIcon).toBeInTheDocument();
    expect(xIcon).toBeInTheDocument();
  });

  it('handles True selection', async () => {
    const user = userEvent.setup();
    render(<TrueFalseComponent {...defaultProps} />);

    const trueRadio = screen.getByDisplayValue('true');
    await user.click(trueRadio);

    expect(defaultProps.setAnswer).toHaveBeenCalledWith('true');
  });

  it('handles False selection', async () => {
    const user = userEvent.setup();
    render(<TrueFalseComponent {...defaultProps} />);

    const falseRadio = screen.getByDisplayValue('false');
    await user.click(falseRadio);

    expect(defaultProps.setAnswer).toHaveBeenCalledWith('false');
  });

  it('shows True as checked when answer is "true"', () => {
    render(<TrueFalseComponent {...defaultProps} answer="true" />);

    const trueRadio = screen.getByDisplayValue('true');
    const falseRadio = screen.getByDisplayValue('false');

    expect(trueRadio).toBeChecked();
    expect(falseRadio).not.toBeChecked();
  });

  it('shows False as checked when answer is "false"', () => {
    render(<TrueFalseComponent {...defaultProps} answer="false" />);

    const trueRadio = screen.getByDisplayValue('true');
    const falseRadio = screen.getByDisplayValue('false');

    expect(falseRadio).toBeChecked();
    expect(trueRadio).not.toBeChecked();
  });

  it('disables all inputs when submitted', () => {
    render(<TrueFalseComponent {...defaultProps} submitted={true} />);

    const trueRadio = screen.getByDisplayValue('true');
    const falseRadio = screen.getByDisplayValue('false');

    expect(trueRadio).toBeDisabled();
    expect(falseRadio).toBeDisabled();
  });

  it('applies correct CSS classes for styling', () => {
    render(<TrueFalseComponent {...defaultProps} />);

    const labels = screen.getAllByRole('radio').map(radio => radio.closest('label'));
    labels.forEach(label => {
      expect(label).toHaveClass('flex', 'items-center', 'justify-center', 'space-x-3', 'p-6', 'border', 'rounded-lg');
    });
  });

  it('has proper accessibility attributes', () => {
    render(<TrueFalseComponent {...defaultProps} />);

    const trueRadio = screen.getByDisplayValue('true');
    const falseRadio = screen.getByDisplayValue('false');

    expect(trueRadio).toHaveAttribute('name', 'tf-answer');
    expect(trueRadio).toHaveAttribute('type', 'radio');
    expect(falseRadio).toHaveAttribute('name', 'tf-answer');
    expect(falseRadio).toHaveAttribute('type', 'radio');
  });

  it('renders in responsive grid layout', () => {
    render(<TrueFalseComponent {...defaultProps} />);

    const container = screen.getByText('True').closest('.grid');
    expect(container).toHaveClass('grid-cols-1', 'sm:grid-cols-2');
  });

  it('has proper touch-friendly sizing', () => {
    render(<TrueFalseComponent {...defaultProps} />);

    const labels = screen.getAllByRole('radio').map(radio => radio.closest('label'));
    labels.forEach(label => {
      expect(label).toHaveClass('min-h-[60px]');
    });
  });

  it('handles empty answer correctly', () => {
    render(<TrueFalseComponent {...defaultProps} answer="" />);

    const trueRadio = screen.getByDisplayValue('true');
    const falseRadio = screen.getByDisplayValue('false');

    expect(trueRadio).not.toBeChecked();
    expect(falseRadio).not.toBeChecked();
  });

  it('maintains selection after re-render', () => {
    const { rerender } = render(<TrueFalseComponent {...defaultProps} answer="true" />);

    let trueRadio = screen.getByDisplayValue('true');
    expect(trueRadio).toBeChecked();

    rerender(<TrueFalseComponent {...defaultProps} answer="true" />);

    trueRadio = screen.getByDisplayValue('true');
    expect(trueRadio).toBeChecked();
  });
});