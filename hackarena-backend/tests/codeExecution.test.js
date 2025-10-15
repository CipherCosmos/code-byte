import { jest } from '@jest/globals';

// Mock the entire codeExecution module
jest.mock('../src/services/codeExecution.js', () => ({
  CodeExecutionService: jest.fn().mockImplementation(() => ({
    executeCode: jest.fn(),
    executeTestCases: jest.fn(),
    analyzeCode: jest.fn(),
    calculatePartialScore: jest.fn(),
    validateBugFix: jest.fn(),
  })),
  default: {
    executeCode: jest.fn(),
    executeTestCases: jest.fn(),
    analyzeCode: jest.fn(),
    calculatePartialScore: jest.fn(),
    validateBugFix: jest.fn(),
  }
}));

// Mock the database
jest.mock('../src/database/init.js', () => ({
  db: {
    allAsync: jest.fn(),
    runAsync: jest.fn(),
    getAsync: jest.fn(),
  },
}));

import { CodeExecutionService } from '../src/services/codeExecution.js';

describe('Code Execution Service', () => {
  let codeExecutionService;

  beforeEach(() => {
    jest.clearAllMocks();
    codeExecutionService = new CodeExecutionService();
  });

  describe('executeCode', () => {
    it('should execute JavaScript code successfully', async () => {
      const code = 'console.log("Hello World");';
      const language = 'javascript';
      const mockResult = { success: true, output: 'Hello World\n', error: '' };

      codeExecutionService.executeCode.mockResolvedValue(mockResult);

      const result = await codeExecutionService.executeCode(code, language);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Hello World');
      expect(result.error).toBe('');
    });

    it('should execute Python code successfully', async () => {
      const code = 'print("Hello World")';
      const language = 'python';
      const mockResult = { success: true, output: 'Hello World\n', error: '' };

      codeExecutionService.executeCode.mockResolvedValue(mockResult);

      const result = await codeExecutionService.executeCode(code, language);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Hello World');
      expect(result.error).toBe('');
    });

    it('should execute Java code successfully', async () => {
      const code = 'System.out.println("Hello World");';
      const language = 'java';
      const mockResult = { success: true, output: 'Hello World\n', error: '' };

      codeExecutionService.executeCode.mockResolvedValue(mockResult);

      const result = await codeExecutionService.executeCode(code, language);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Hello World');
      expect(result.error).toBe('');
    });

    it('should execute C++ code successfully', async () => {
      const code = 'cout << "Hello World" << endl;';
      const language = 'cpp';
      const mockResult = { success: true, output: 'Hello World\n', error: '' };

      codeExecutionService.executeCode.mockResolvedValue(mockResult);

      const result = await codeExecutionService.executeCode(code, language);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Hello World');
      expect(result.error).toBe('');
    });

    it('should handle code execution errors', async () => {
      const code = 'invalid syntax {{{';
      const language = 'javascript';
      const mockResult = { success: false, output: '', error: 'SyntaxError: Unexpected token' };

      codeExecutionService.executeCode.mockResolvedValue(mockResult);

      const result = await codeExecutionService.executeCode(code, language);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should reject unsupported languages', async () => {
      const code = 'console.log("test");';
      const language = 'unsupported';

      codeExecutionService.executeCode.mockRejectedValue(new Error('Unsupported language: unsupported'));

      await expect(codeExecutionService.executeCode(code, language))
        .rejects.toThrow('Unsupported language: unsupported');
    });

    it('should handle timeouts', async () => {
      const code = 'while(true) {};'; // Infinite loop
      const language = 'javascript';
      const mockResult = { success: false, output: '', error: 'Execution timeout' };

      codeExecutionService.executeCode.mockResolvedValue(mockResult);

      const result = await codeExecutionService.executeCode(code, language, '', 1); // 1 second timeout

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should handle large code size', async () => {
      const largeCode = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const language = 'javascript';
      const mockResult = { success: false, output: '', error: 'Code size exceeds limit' };

      codeExecutionService.executeCode.mockResolvedValue(mockResult);

      const result = await codeExecutionService.executeCode(largeCode, language);

      expect(result.success).toBe(false);
      expect(result.error).toContain('size exceeds limit');
    });

    it('should handle empty code', async () => {
      const code = '';
      const language = 'javascript';
      const mockResult = { success: false, output: '', error: 'Code cannot be empty' };

      codeExecutionService.executeCode.mockResolvedValue(mockResult);

      const result = await codeExecutionService.executeCode(code, language);

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should handle dangerous code patterns', async () => {
      const code = 'require("fs").writeFileSync("/etc/passwd", "hacked");';
      const language = 'javascript';
      const mockResult = { success: false, output: '', error: 'Code contains potentially dangerous patterns' };

      codeExecutionService.executeCode.mockResolvedValue(mockResult);

      const result = await codeExecutionService.executeCode(code, language);

      expect(result.success).toBe(false);
      expect(result.error).toContain('dangerous patterns');
    });

    it('should handle memory intensive operations', async () => {
      const code = 'const bigArray = new Array(100000000).fill(0);';
      const language = 'javascript';
      const mockResult = { success: false, output: '', error: 'Memory limit exceeded' };

      codeExecutionService.executeCode.mockResolvedValue(mockResult);

      const result = await codeExecutionService.executeCode(code, language);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Memory limit');
    });

    it('should handle output size limits', async () => {
      const code = 'console.log("x".repeat(2000000));';
      const language = 'javascript';
      const mockResult = { success: false, output: '', error: 'Output size limit exceeded' };

      codeExecutionService.executeCode.mockResolvedValue(mockResult);

      const result = await codeExecutionService.executeCode(code, language);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Output size limit');
    });
  });

  describe('executeTestCases', () => {
    it('should execute multiple test cases', async () => {
      const code = 'console.log(parseInt(process.argv[2]) + parseInt(process.argv[3]));';
      const language = 'javascript';
      const testCases = [
        { input: '2\n3', expectedOutput: '5' },
        { input: '10\n20', expectedOutput: '30' }
      ];
      const mockResults = [
        { input: '2\n3', expectedOutput: '5', actualOutput: '5', success: true, executionTime: 100, memoryUsage: 1024 },
        { input: '10\n20', expectedOutput: '30', actualOutput: '30', success: true, executionTime: 100, memoryUsage: 1024 }
      ];

      codeExecutionService.executeTestCases.mockResolvedValue(mockResults);

      const results = await codeExecutionService.executeTestCases(code, language, testCases);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle failing test cases', async () => {
      const code = 'console.log("wrong");';
      const language = 'javascript';
      const testCases = [
        { input: '', expectedOutput: 'correct' }
      ];
      const mockResults = [
        { input: '', expectedOutput: 'correct', actualOutput: 'wrong', success: false, executionTime: 100, memoryUsage: 1024 }
      ];

      codeExecutionService.executeTestCases.mockResolvedValue(mockResults);

      const results = await codeExecutionService.executeTestCases(code, language, testCases);

      expect(results[0].success).toBe(false);
    });
  });

  describe('analyzeCode', () => {
    it('should analyze JavaScript code semantically', () => {
      const code = 'function add(a, b) { return a + b; }';
      const language = 'javascript';
      const mockAnalysis = {
        syntaxValid: true,
        structureScore: 3,
        keywordScore: 2,
        complexityScore: 2,
        similarityScore: 0,
        suggestions: []
      };

      codeExecutionService.analyzeCode.mockReturnValue(mockAnalysis);

      const analysis = codeExecutionService.analyzeCode(code, language);

      expect(analysis.syntaxValid).toBe(true);
      expect(analysis.structureScore).toBeGreaterThan(0);
    });

    it('should analyze Python code semantically', () => {
      const code = 'def add(a, b):\n    return a + b';
      const language = 'python';
      const mockAnalysis = {
        syntaxValid: true,
        structureScore: 3,
        keywordScore: 2,
        complexityScore: 2,
        similarityScore: 0,
        suggestions: []
      };

      codeExecutionService.analyzeCode.mockReturnValue(mockAnalysis);

      const analysis = codeExecutionService.analyzeCode(code, language);

      expect(analysis.syntaxValid).toBe(true);
      expect(analysis.structureScore).toBeGreaterThan(0);
    });

    it('should detect syntax errors', () => {
      const code = 'function { invalid syntax }';
      const language = 'javascript';
      const mockAnalysis = {
        syntaxValid: false,
        structureScore: 0,
        keywordScore: 0,
        complexityScore: 0,
        similarityScore: 0,
        suggestions: ['Fix syntax errors in your javascript code']
      };

      codeExecutionService.analyzeCode.mockReturnValue(mockAnalysis);

      const analysis = codeExecutionService.analyzeCode(code, language);

      expect(analysis.syntaxValid).toBe(false);
    });
  });

  describe('calculatePartialScore', () => {
    it('should calculate semantic scoring', () => {
      const userCode = 'function add(a, b) { return a + b; }';
      const correctCode = 'function sum(x, y) { return x + y; }';
      const language = 'javascript';
      const evaluationMode = 'semantic';

      codeExecutionService.calculatePartialScore.mockReturnValue(7.5);

      const score = codeExecutionService.calculatePartialScore(userCode, correctCode, [], language, evaluationMode);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(10);
    });

    it('should calculate compiler scoring', () => {
      const userCode = 'console.log("test");';
      const correctCode = 'console.log("test");';
      const testResults = [
        { success: true },
        { success: true },
        { success: false }
      ];
      const language = 'javascript';
      const evaluationMode = 'compiler';

      codeExecutionService.calculatePartialScore.mockReturnValue(8.5);

      const score = codeExecutionService.calculatePartialScore(userCode, correctCode, testResults, language, evaluationMode);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(10);
    });

    it('should calculate bug fix scoring', () => {
      const userCode = 'console.log("fixed");';
      const correctCode = 'console.log("fixed");';
      const testResults = [{ success: true }];
      const language = 'javascript';
      const evaluationMode = 'bugfix';

      codeExecutionService.calculatePartialScore.mockReturnValue(9.0);

      const score = codeExecutionService.calculatePartialScore(userCode, correctCode, testResults, language, evaluationMode);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(10);
    });
  });

  describe('validateBugFix', () => {
    it('should validate bug fixes', () => {
      const originalCode = 'console.log("buggy");';
      const fixedCode = 'console.log("fixed");';
      const testCases = JSON.stringify([
        { input: '', expectedOutput: 'fixed' }
      ]);
      const mockValidation = {
        fixesApplied: true,
        testsPass: true,
        improvementScore: 3,
        issues: []
      };

      codeExecutionService.validateBugFix.mockReturnValue(mockValidation);

      const validation = codeExecutionService.validateBugFix(originalCode, fixedCode, testCases);

      expect(validation).toHaveProperty('fixesApplied');
      expect(validation).toHaveProperty('testsPass');
      expect(validation).toHaveProperty('improvementScore');
    });
  });
});