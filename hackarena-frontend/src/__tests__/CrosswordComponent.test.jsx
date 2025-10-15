import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CrosswordComponent from '../components/CrosswordComponent';

describe('CrosswordComponent', () => {
  const defaultProps = {
    question: {},
    answer: '',
    setAnswer: jest.fn(),
    submitted: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with correct structure', () => {
    render(<CrosswordComponent {...defaultProps} />);

    expect(screen.getByText('🔤')).toBeInTheDocument();
    expect(screen.getByText('Crossword')).toBeInTheDocument();
    expect(screen.getByText('Fill in the crossword answers')).toBeInTheDocument();
    expect(screen.getByText('Format: 1A:WORD,2D:WORD,... (use comma to separate entries)')).toBeInTheDocument();
  });

  it('renders textarea with correct placeholder', () => {
    render(<CrosswordComponent {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('1A:EXAMPLE,2D:TEST,...');
    expect(textarea).toBeInTheDocument();
  });

  it('handles text input correctly', async () => {
    const user = userEvent.setup();
    render(<CrosswordComponent {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('1A:EXAMPLE,2D:TEST,...');
    await user.type(textarea, '1A:HELLO,2D:WORLD');

    expect(defaultProps.setAnswer).toHaveBeenCalledWith('1A:HELLO,2D:WORLD');
  });

  it('displays the current answer value', () => {
    render(<CrosswordComponent {...defaultProps} answer="1A:TEST,2D:WORD" />);

    const textarea = screen.getByDisplayValue('1A:TEST,2D:WORD');
    expect(textarea).toBeInTheDocument();
  });

  it('disables textarea when submitted', () => {
    render(<CrosswordComponent {...defaultProps} submitted={true} />);

    const textarea = screen.getByPlaceholderText('1A:EXAMPLE,2D:TEST,...');
    expect(textarea).toBeDisabled();
  });

  it('renders clues when crossword_clues is provided', () => {
    const clues = {
      '1A': { clue: 'First across clue' },
      '2D': { clue: 'Second down clue' },
      '3A': { clue: 'Third across clue' }
    };

    render(<CrosswordComponent
      {...defaultProps}
      question={{ crossword_clues: JSON.stringify(clues) }}
    />);

    expect(screen.getByText('Clues:')).toBeInTheDocument();
    expect(screen.getByText('1A:')).toBeInTheDocument();
    expect(screen.getByText('First across clue')).toBeInTheDocument();
    expect(screen.getByText('2D:')).toBeInTheDocument();
    expect(screen.getByText('Second down clue')).toBeInTheDocument();
    expect(screen.getByText('3A:')).toBeInTheDocument();
    expect(screen.getByText('Third across clue')).toBeInTheDocument();
  });

  it('does not render clues section when crossword_clues is not provided', () => {
    render(<CrosswordComponent {...defaultProps} />);

    expect(screen.queryByText('Clues:')).not.toBeInTheDocument();
  });

  it('handles invalid JSON in crossword_clues gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<CrosswordComponent
      {...defaultProps}
      question={{ crossword_clues: '{"invalid": "json"' }}
    />);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Invalid crossword_clues JSON:',
      '{"invalid": "json"',
      expect.any(Error)
    );

    // Should render clues section but with empty clues
    expect(screen.getByText('Clues:')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('handles non-object JSON in crossword_clues gracefully', () => {
    render(<CrosswordComponent
      {...defaultProps}
      question={{ crossword_clues: JSON.stringify(['not', 'an', 'object']) }}
    />);

    // Should render clues section but with empty clues
    expect(screen.getByText('Clues:')).toBeInTheDocument();
  });

  it('handles null crossword_clues gracefully', () => {
    render(<CrosswordComponent
      {...defaultProps}
      question={{ crossword_clues: null }}
    />);

    expect(screen.queryByText('Clues:')).not.toBeInTheDocument();
  });

  it('handles malformed clue data gracefully', () => {
    const clues = {
      '1A': null, // No clue property
      '2D': { clue: 'Valid clue' },
      '3A': {} // Empty object
    };

    render(<CrosswordComponent
      {...defaultProps}
      question={{ crossword_clues: JSON.stringify(clues) }}
    />);

    expect(screen.getByText('1A:')).toBeInTheDocument();
    expect(screen.getAllByText('No clue available')).toHaveLength(2);
    expect(screen.getByText('2D:')).toBeInTheDocument();
    expect(screen.getByText('Valid clue')).toBeInTheDocument();
    expect(screen.getByText('3A:')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(<CrosswordComponent {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('1A:EXAMPLE,2D:TEST,...');
    expect(textarea).toHaveClass('input', 'w-full', 'h-40', 'resize-none', 'text-base', 'py-3', 'px-4');
  });

  it('has proper accessibility attributes', () => {
    render(<CrosswordComponent {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('1A:EXAMPLE,2D:TEST,...');
    expect(textarea).toHaveAttribute('placeholder', '1A:EXAMPLE,2D:TEST,...');
  });

  it('handles empty answer correctly', () => {
    render(<CrosswordComponent {...defaultProps} answer="" />);

    const textarea = screen.getByPlaceholderText('1A:EXAMPLE,2D:TEST,...');
    expect(textarea).toHaveValue('');
  });

  it('maintains answer value after re-render', () => {
    const { rerender } = render(<CrosswordComponent {...defaultProps} answer="1A:TEST" />);

    expect(screen.getByDisplayValue('1A:TEST')).toBeInTheDocument();

    rerender(<CrosswordComponent {...defaultProps} answer="1A:TEST" />);
    expect(screen.getByDisplayValue('1A:TEST')).toBeInTheDocument();
  });

  it('renders clues in responsive grid layout', () => {
    const clues = {
      '1A': { clue: 'Clue 1' },
      '2D': { clue: 'Clue 2' }
    };

    render(<CrosswordComponent
      {...defaultProps}
      question={{ crossword_clues: JSON.stringify(clues) }}
    />);

    const cluesContainer = screen.getByText('Clues:').closest('div').querySelector('.grid');
    expect(cluesContainer).toHaveClass('grid-cols-1', 'sm:grid-cols-2');
  });
});