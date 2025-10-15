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
    expect(screen.getByText('Crossword Puzzle')).toBeInTheDocument();
    expect(screen.getByText('Fill in the crossword grid')).toBeInTheDocument();
    expect(screen.getByText('Click on cells to fill them. Use Tab to switch between across/down mode.')).toBeInTheDocument();
  });

  it('renders answer format info', () => {
    render(<CrosswordComponent {...defaultProps} />);

    expect(screen.getByText('Answer Format:')).toBeInTheDocument();
    expect(screen.getByText('Your answers will be saved in the format: 1A:WORD,2D:TEST')).toBeInTheDocument();
  });

  it('handles answer updates correctly', () => {
    const mockSetAnswer = jest.fn();
    render(<CrosswordComponent {...defaultProps} setAnswer={mockSetAnswer} />);

    // The component should initialize with empty answer
    expect(mockSetAnswer).not.toHaveBeenCalled();
  });

  it('displays current answer format info', () => {
    render(<CrosswordComponent {...defaultProps} answer="1A:TEST,2D:WORD" />);

    expect(screen.getByText('Current answer: 1A:TEST,2D:WORD')).toBeInTheDocument();
  });

  it('shows clear button', () => {
    render(<CrosswordComponent {...defaultProps} />);

    expect(screen.getByText('Clear')).toBeInTheDocument();
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

  it('shows direction controls', () => {
    render(<CrosswordComponent {...defaultProps} />);

    expect(screen.getByText('Direction:')).toBeInTheDocument();
    expect(screen.getByText('Across')).toBeInTheDocument();
  });

  it('shows crossword grid', () => {
    render(<CrosswordComponent {...defaultProps} />);

    // Should have a grid container
    const gridContainer = document.querySelector('.inline-grid');
    expect(gridContainer).toBeInTheDocument();
  });

  it('handles empty answer correctly', () => {
    render(<CrosswordComponent {...defaultProps} answer="" />);

    expect(screen.getByText('Current answer: No answers yet')).toBeInTheDocument();
  });

  it('displays answer when provided', () => {
    render(<CrosswordComponent {...defaultProps} answer="1A:TEST,2D:WORD" />);

    expect(screen.getByText('Current answer: 1A:TEST,2D:WORD')).toBeInTheDocument();
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

    // Click show hints button to reveal clues
    const showHintsButton = screen.getByText('Show Hints');
    showHintsButton.click();

    const cluesContainer = screen.getByText('Clues:').closest('div').querySelector('.grid');
    expect(cluesContainer).toHaveClass('grid-cols-1', 'sm:grid-cols-2');
  });
});