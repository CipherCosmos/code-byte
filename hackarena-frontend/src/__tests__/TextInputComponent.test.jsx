import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextInputComponent from '../components/TextInputComponent';

describe('TextInputComponent', () => {
  const defaultProps = {
    question: { question_type: 'fill_blank' },
    answer: '',
    setAnswer: jest.fn(),
    submitted: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders fill_blank question type correctly', () => {
    render(<TextInputComponent {...defaultProps} />);

    expect(screen.getByText('✏️')).toBeInTheDocument();
    expect(screen.getByText('Fill in the Blank')).toBeInTheDocument();
    expect(screen.getByText('Fill in the blank')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Fill in the blank...')).toBeInTheDocument();
  });

  it('renders short_answer question type correctly', () => {
    render(<TextInputComponent {...defaultProps} question={{ question_type: 'short_answer' }} />);

    expect(screen.getByText('📝')).toBeInTheDocument();
    expect(screen.getByText('Short Answer')).toBeInTheDocument();
    expect(screen.getByText('Provide a short answer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Provide a short answer...')).toBeInTheDocument();
  });

  it('renders image question type correctly', () => {
    render(<TextInputComponent {...defaultProps} question={{ question_type: 'image' }} />);

    expect(screen.getByText('🖼️')).toBeInTheDocument();
    expect(screen.getByText('Image Based')).toBeInTheDocument();
    expect(screen.getByText('Describe what you see')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe what you see...')).toBeInTheDocument();
  });

  it('renders default text input for unknown question types', () => {
    render(<TextInputComponent {...defaultProps} question={{ question_type: 'unknown' }} />);

    expect(screen.getByText('📝')).toBeInTheDocument();
    expect(screen.getByText('Text Input')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your answer...')).toBeInTheDocument();
  });

  it('handles text input correctly', async () => {
    const user = userEvent.setup();
    render(<TextInputComponent {...defaultProps} />);

    const input = screen.getByPlaceholderText('Fill in the blank...');
    await user.type(input, 'Test answer');

    expect(defaultProps.setAnswer).toHaveBeenCalledWith('Test answer');
  });

  it('displays the current answer value', () => {
    render(<TextInputComponent {...defaultProps} answer="Current answer" />);

    const input = screen.getByDisplayValue('Current answer');
    expect(input).toBeInTheDocument();
  });

  it('disables input when submitted', () => {
    render(<TextInputComponent {...defaultProps} submitted={true} />);

    const input = screen.getByPlaceholderText('Fill in the blank...');
    expect(input).toBeDisabled();
  });

  it('renders image for image-based questions when image_url is provided', () => {
    render(<TextInputComponent
      {...defaultProps}
      question={{
        question_type: 'image',
        image_url: '/uploads/test-image.jpg'
      }}
    />);

    const image = screen.getByAltText('Question');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'http://localhost:3001/uploads/test-image.jpg');
  });

  it('does not render image when image_url is not provided', () => {
    render(<TextInputComponent
      {...defaultProps}
      question={{ question_type: 'image' }}
    />);

    expect(screen.queryByAltText('Question')).not.toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<TextInputComponent {...defaultProps} />);

    const input = screen.getByPlaceholderText('Fill in the blank...');
    expect(input).toHaveClass('input', 'w-full', 'text-base', 'py-3', 'px-4', 'min-h-[44px]');
  });

  it('has proper accessibility attributes', () => {
    render(<TextInputComponent {...defaultProps} />);

    const input = screen.getByPlaceholderText('Fill in the blank...');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('handles empty answer correctly', () => {
    render(<TextInputComponent {...defaultProps} answer="" />);

    const input = screen.getByPlaceholderText('Fill in the blank...');
    expect(input).toHaveValue('');
  });

  it('maintains answer value after re-render', () => {
    const { rerender } = render(<TextInputComponent {...defaultProps} answer="Test" />);

    expect(screen.getByDisplayValue('Test')).toBeInTheDocument();

    rerender(<TextInputComponent {...defaultProps} answer="Test" />);
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
  });

  it('applies correct color classes for different question types', () => {
    // Fill blank - yellow
    const { rerender } = render(<TextInputComponent {...defaultProps} />);
    expect(screen.getByText('Fill in the Blank')).toHaveClass('bg-yellow-100', 'text-yellow-800');

    // Short answer - indigo
    rerender(<TextInputComponent {...defaultProps} question={{ question_type: 'short_answer' }} />);
    expect(screen.getByText('Short Answer')).toHaveClass('bg-indigo-100', 'text-indigo-800');

    // Image - pink
    rerender(<TextInputComponent {...defaultProps} question={{ question_type: 'image' }} />);
    expect(screen.getByText('Image Based')).toHaveClass('bg-pink-100', 'text-pink-800');

    // Unknown - gray
    rerender(<TextInputComponent {...defaultProps} question={{ question_type: 'unknown' }} />);
    expect(screen.getByText('Text Input')).toHaveClass('bg-gray-100', 'text-gray-800');
  });
});