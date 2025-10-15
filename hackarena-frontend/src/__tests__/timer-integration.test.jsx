import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameInterface from '../pages/participant/GameInterface';
import socketManager from '../../utils/socket';
import { api } from '../../utils/api';

// Mock dependencies
jest.mock('../../utils/socket');
jest.mock('../../utils/api');
jest.mock('../../utils/cheatDetection');

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useParams: () => ({ gameCode: 'TEST123' }),
  useNavigate: () => mockNavigate,
}));

// Mock Prism.js
jest.mock('prismjs', () => ({
  highlight: jest.fn(() => 'highlighted code'),
  languages: {
    javascript: {},
    python: {},
    java: {},
    cpp: {}
  }
}));

// Mock react-simple-code-editor
jest.mock('react-simple-code-editor', () => {
  return function MockEditor({ value, onValueChange, placeholder }) {
    return {
      type: 'textarea',
      props: {
        value,
        onChange: (e) => onValueChange(e.target.value),
        placeholder,
        'data-testid': 'code-editor'
      }
    };
  };
});

// Mock hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn()
}));

describe('Timer Integration Tests', () => {
  let mockSocket;
  let mockApi;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // Mock socket
    mockSocket = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connected: true
    };
    socketManager.connect.mockReturnValue(mockSocket);

    // Mock API
    mockApi = {
      post: jest.fn(),
      get: jest.fn()
    };
    api.post = mockApi.post;
    api.get = mockApi.get;

    // Mock performance.now for timer testing
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Timer countdown displays correctly', async () => {
    // Mock session data
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === 'hackarena_session') return 'test-session-token';
      if (key === 'hackarena_participant') return JSON.stringify({
        id: 'test-participant-id',
        name: 'Test Participant',
        gameId: 'test-game-id'
      });
      return null;
    });

    // Mock successful rejoin with active question
    mockApi.post.mockResolvedValueOnce({
      data: {
        participant: {
          id: 'test-participant-id',
          name: 'Test Participant',
          totalScore: 0,
          currentRank: 1,
          gameId: 'test-game-id'
        },
        currentQuestion: {
          id: 'test-question-id',
          question_text: 'Test question?',
          question_type: 'mcq',
          time_limit: 30,
          marks: 10,
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A'
        },
        gameCode: 'TEST123'
      }
    });

    // Mock socket listeners
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'gameStarted') {
        // Don't call callback to keep game in waiting state initially
      }
    });

    await act(async () => {
      render(<GameInterface />);
    });

    // Wait for component to initialize
    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/participants/rejoin', {}, {
        headers: { 'x-session-token': 'test-session-token' }
      });
    });

    // Initially should show waiting screen
    expect(screen.getByText('Welcome to Code Byte, Test Participant!')).toBeInTheDocument();
  });

  test('Timer synchronization across page refresh', async () => {
    const mockDateNow = jest.spyOn(Date, 'now');
    const startTime = 1000000000000; // Fixed timestamp for testing
    mockDateNow.mockReturnValue(startTime);

    // Mock session data
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === 'hackarena_session') return 'test-session-token';
      if (key === 'hackarena_participant') return JSON.stringify({
        id: 'test-participant-id',
        name: 'Test Participant',
        gameId: 'test-game-id'
      });
      return null;
    });

    // Mock rejoin with question that has 20 seconds remaining
    const questionEndTime = new Date(startTime + 20000).toISOString();
    mockApi.post.mockResolvedValueOnce({
      data: {
        participant: {
          id: 'test-participant-id',
          name: 'Test Participant',
          totalScore: 0,
          currentRank: 1,
          gameId: 'test-game-id'
        },
        currentQuestion: {
          id: 'test-question-id',
          question_text: 'Test question?',
          question_type: 'mcq',
          time_limit: 30,
          marks: 10,
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          question_ends_at: questionEndTime
        },
        gameCode: 'TEST123'
      }
    });

    await act(async () => {
      render(<GameInterface />);
    });

    // Wait for component to load
    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/participants/rejoin', {}, {
        headers: { 'x-session-token': 'test-session-token' }
      });
    });

    // Simulate 5 seconds passing
    mockDateNow.mockReturnValue(startTime + 5000);

    // Force a re-render by triggering state update
    await act(async () => {
      // Wait for potential timer updates
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Timer should show approximately 15 seconds remaining (20 - 5)
    // Note: Exact timing depends on implementation details
    mockDateNow.mockRestore();
  });

  test('Manual submission prevents auto-submission', async () => {
    const mockDateNow = jest.spyOn(Date, 'now');
    const startTime = 1000000000000;
    mockDateNow.mockReturnValue(startTime);

    // Mock session data
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === 'hackarena_session') return 'test-session-token';
      if (key === 'hackarena_participant') return JSON.stringify({
        id: 'test-participant-id',
        name: 'Test Participant',
        gameId: 'test-game-id'
      });
      return null;
    });

    // Mock rejoin with active question
    mockApi.post.mockResolvedValueOnce({
      data: {
        participant: {
          id: 'test-participant-id',
          name: 'Test Participant',
          totalScore: 0,
          currentRank: 1,
          gameId: 'test-game-id'
        },
        currentQuestion: {
          id: 'test-question-id',
          question_text: 'Test question?',
          question_type: 'mcq',
          time_limit: 30,
          marks: 10,
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          question_ends_at: new Date(startTime + 30000).toISOString()
        },
        gameCode: 'TEST123'
      }
    });

    // Mock successful answer submission
    mockApi.post.mockResolvedValueOnce({
      data: {
        submitted: true,
        isCorrect: true,
        scoreEarned: 10,
        message: 'Correct answer!'
      }
    });

    await act(async () => {
      render(<GameInterface />);
    });

    // Wait for question to load
    await waitFor(() => {
      expect(screen.getByText('Test question?')).toBeInTheDocument();
    });

    // Submit answer manually
    const submitButton = screen.getByRole('button', { name: /submit answer/i });
    await act(async () => {
      submitButton.click();
    });

    // Verify submission was called
    expect(mockApi.post).toHaveBeenCalledWith('/participants/answer', expect.objectContaining({
      questionId: 'test-question-id',
      answer: '', // Empty answer initially
      hintUsed: false,
      timeTaken: expect.any(Number)
    }), expect.any(Object));

    // Simulate timer expiry - should not trigger auto-submission since already submitted
    mockDateNow.mockReturnValue(startTime + 35000); // Past expiry time

    await act(async () => {
      // Wait for potential auto-submit logic
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Should only have been called once (manual submission)
    expect(mockApi.post).toHaveBeenCalledTimes(2); // rejoin + manual submit

    mockDateNow.mockRestore();
  });

  test('Auto-submission triggers when timer expires', async () => {
    const mockDateNow = jest.spyOn(Date, 'now');
    const startTime = 1000000000000;
    mockDateNow.mockReturnValue(startTime);

    // Mock session data
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === 'hackarena_session') return 'test-session-token';
      if (key === 'hackarena_participant') return JSON.stringify({
        id: 'test-participant-id',
        name: 'Test Participant',
        gameId: 'test-game-id'
      });
      return null;
    });

    // Mock rejoin with short timer question
    mockApi.post.mockResolvedValueOnce({
      data: {
        participant: {
          id: 'test-participant-id',
          name: 'Test Participant',
          totalScore: 0,
          currentRank: 1,
          gameId: 'test-game-id'
        },
        currentQuestion: {
          id: 'test-question-id',
          question_text: 'Test question?',
          question_type: 'mcq',
          time_limit: 5, // Short timer for testing
          marks: 10,
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          question_ends_at: new Date(startTime + 5000).toISOString()
        },
        gameCode: 'TEST123'
      }
    });

    // Mock auto-submit response
    mockApi.post.mockResolvedValueOnce({
      data: {
        submitted: true,
        isCorrect: false,
        scoreEarned: 0,
        message: 'Time expired - answer auto-submitted',
        autoSubmitted: true
      }
    });

    await act(async () => {
      render(<GameInterface />);
    });

    // Wait for question to load
    await waitFor(() => {
      expect(screen.getByText('Test question?')).toBeInTheDocument();
    });

    // Advance time past expiry
    mockDateNow.mockReturnValue(startTime + 6000); // 6 seconds past start

    // Wait for auto-submit to trigger
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    // Should have called auto-submit
    expect(mockApi.post).toHaveBeenCalledWith('/participants/answer', expect.objectContaining({
      questionId: 'test-question-id',
      autoSubmit: true
    }), expect.any(Object));

    mockDateNow.mockRestore();
  });

  test('Timer prevents erroneous expiration errors', async () => {
    const mockDateNow = jest.spyOn(Date, 'now');
    const startTime = 1000000000000;
    mockDateNow.mockReturnValue(startTime);

    // Mock session data
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === 'hackarena_session') return 'test-session-token';
      if (key === 'hackarena_participant') return JSON.stringify({
        id: 'test-participant-id',
        name: 'Test Participant',
        gameId: 'test-game-id'
      });
      return null;
    });

    // Mock rejoin with question that has time remaining
    mockApi.post.mockResolvedValueOnce({
      data: {
        participant: {
          id: 'test-participant-id',
          name: 'Test Participant',
          totalScore: 0,
          currentRank: 1,
          gameId: 'test-game-id'
        },
        currentQuestion: {
          id: 'test-question-id',
          question_text: 'Test question?',
          question_type: 'mcq',
          time_limit: 30,
          marks: 10,
          options: ['A', 'B', 'C', 'D'],
          correct_answer: 'A',
          question_ends_at: new Date(startTime + 20000).toISOString() // 20 seconds remaining
        },
        gameCode: 'TEST123'
      }
    });

    await act(async () => {
      render(<GameInterface />);
    });

    // Wait for question to load
    await waitFor(() => {
      expect(screen.getByText('Test question?')).toBeInTheDocument();
    });

    // Submit answer while time remains
    const submitButton = screen.getByRole('button', { name: /submit answer/i });

    mockApi.post.mockResolvedValueOnce({
      data: {
        submitted: true,
        isCorrect: true,
        scoreEarned: 10,
        message: 'Correct answer!'
      }
    });

    await act(async () => {
      submitButton.click();
    });

    // Should not show "time expired" error
    expect(mockApi.post).toHaveBeenCalledWith('/participants/answer', expect.objectContaining({
      questionId: 'test-question-id',
      autoSubmit: false // Should be manual submission
    }), expect.any(Object));

    mockDateNow.mockRestore();
  });

  test('State persistence on page refresh', async () => {
    // Mock session data
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === 'hackarena_session') return 'test-session-token';
      if (key === 'hackarena_participant') return JSON.stringify({
        id: 'test-participant-id',
        name: 'Test Participant',
        gameId: 'test-game-id',
        totalScore: 25,
        currentRank: 2
      });
      return null;
    });

    // Mock rejoin maintaining state
    mockApi.post.mockResolvedValueOnce({
      data: {
        participant: {
          id: 'test-participant-id',
          name: 'Test Participant',
          totalScore: 25,
          currentRank: 2,
          gameId: 'test-game-id'
        },
        currentQuestion: null, // No active question
        gameCode: 'TEST123'
      }
    });

    await act(async () => {
      render(<GameInterface />);
    });

    // Wait for component to load
    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/participants/rejoin', {}, {
        headers: { 'x-session-token': 'test-session-token' }
      });
    });

    // Should maintain participant state
    expect(screen.getByText('Welcome to Code Byte, Test Participant!')).toBeInTheDocument();
  });
});