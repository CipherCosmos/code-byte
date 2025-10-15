import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security and resource limits
const EXECUTION_LIMITS = {
  timeout: 5000, // Reduced to 5 seconds for better DoS protection
  memoryLimit: 64 * 1024 * 1024, // Reduced to 64MB for better resource control
  maxOutputSize: 512 * 1024, // Reduced to 512KB to prevent output flooding
  maxFileSize: 5 * 1024 * 1024, // Reduced to 5MB for code size limits
  allowedLanguages: ['javascript', 'python', 'java', 'cpp'],
  maxConcurrentExecutions: 10, // Limit concurrent code executions
  rateLimitPerMinute: 30 // Max executions per user per minute
};

// Sandbox directory for code execution
const SANDBOX_DIR = path.join(__dirname, '../../sandbox');

// Ensure sandbox directory exists
if (!fs.existsSync(SANDBOX_DIR)) {
  fs.mkdirSync(SANDBOX_DIR, { recursive: true });
}

// Language configurations
const LANGUAGE_CONFIGS = {
  javascript: {
    extension: '.js',
    command: 'node',
    args: (filePath) => [filePath],
    wrapper: (code, testInput) => `
      const fs = require('fs');
      process.stdin.setEncoding('utf8');

      let input = '';
      process.stdin.on('data', chunk => {
        input += chunk;
      });

      process.stdin.on('end', () => {
        try {
          // Redirect console.log to capture output
          let output = '';
          const originalLog = console.log;
          console.log = (...args) => {
            output += args.join(' ') + '\\n';
          };

          // Execute user code
          ${code}

          // Restore console.log
          console.log = originalLog;

          // Write output to stdout
          process.stdout.write(output);
        } catch (error) {
          process.stderr.write(error.message);
          process.exit(1);
        }
      });
    `
  },
  python: {
    extension: '.py',
    command: 'python3',
    args: (filePath) => [filePath],
    wrapper: (code, testInput) => `
import sys
import io
from contextlib import redirect_stdout, redirect_stderr

# Capture stdout and stderr
output_buffer = io.StringIO()
error_buffer = io.StringIO()

try:
    with redirect_stdout(output_buffer), redirect_stderr(error_buffer):
        # Execute user code
        exec('''${code.replace(/'/g, "\\'")}''')

    # Write captured output
    sys.stdout.write(output_buffer.getvalue())
    if error_buffer.getvalue():
        sys.stderr.write(error_buffer.getvalue())

except Exception as e:
    sys.stderr.write(str(e))
    sys.exit(1)
    `
  },
  java: {
    extension: '.java',
    command: 'java',
    args: (filePath) => ['-cp', path.dirname(filePath), path.basename(filePath, '.java')],
    wrapper: (code, testInput) => `
import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        try {
            ${code}
        } catch (Exception e) {
            System.err.println(e.getMessage());
            System.exit(1);
        }
    }
}
    `
  },
  cpp: {
    extension: '.cpp',
    command: 'g++',
    compileArgs: (filePath) => ['-o', filePath.replace('.cpp', ''), filePath],
    runArgs: (filePath) => [filePath.replace('.cpp', '')],
    wrapper: (code, testInput) => `
#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
#include <sstream>

int main() {
    try {
        ${code}
    } catch (const std::exception& e) {
        std::cerr << e.what() << std::endl;
        return 1;
    } catch (...) {
        std::cerr << "Unknown error occurred" << std::endl;
        return 1;
    }
    return 0;
}
    `
  }
};

// Resource monitoring
class ResourceMonitor {
  constructor() {
    this.startTime = Date.now();
    this.memoryUsage = 0;
    this.cpuUsage = 0;
  }

  update() {
    const memUsage = process.memoryUsage();
    this.memoryUsage = Math.max(this.memoryUsage, memUsage.heapUsed);
  }

  getStats() {
    return {
      executionTime: Date.now() - this.startTime,
      memoryUsage: this.memoryUsage,
      cpuUsage: this.cpuUsage
    };
  }
}

// Code execution result
class ExecutionResult {
  constructor(success = false, output = '', error = '', stats = {}) {
    this.success = success;
    this.output = output;
    this.error = error;
    this.stats = stats;
  }
}

// Language runner base class
class LanguageRunner {
  constructor(language) {
    this.language = language;
    this.config = LANGUAGE_CONFIGS[language];
    if (!this.config) {
      throw new Error(`Unsupported language: ${language}`);
    }
  }

  async execute(code, testInput = '', timeLimit = EXECUTION_LIMITS.timeout) {
    const monitor = new ResourceMonitor();
    const executionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const filePath = path.join(SANDBOX_DIR, `code_${executionId}${this.config.extension}`);

    try {
      // Validate inputs
      if (!code || code.trim().length === 0) {
        throw new Error('Code cannot be empty');
      }

      // Validate code size
      if (code.length > EXECUTION_LIMITS.maxFileSize) {
        throw new Error('Code size exceeds limit');
      }

      // Basic security checks
      if (this.containsDangerousPatterns(code)) {
        throw new Error('Code contains potentially dangerous patterns');
      }

      // Wrap code with language-specific wrapper
      const wrappedCode = this.wrapCode(code, testInput);

      // Write code to file
      fs.writeFileSync(filePath, wrappedCode, 'utf8');

      // Execute code
      const result = await this.runCode(filePath, testInput, timeLimit, monitor);

      monitor.update();
      return new ExecutionResult(
        result.success,
        result.output,
        result.error,
        monitor.getStats()
      );

    } catch (error) {
      return new ExecutionResult(false, '', error.message, monitor.getStats());
    } finally {
      // Cleanup
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        // Cleanup compiled binaries for compiled languages
        if (this.language === 'cpp' || this.language === 'java') {
          const binaryPath = filePath.replace(this.config.extension, this.language === 'cpp' ? '' : '.class');
          if (fs.existsSync(binaryPath)) {
            fs.unlinkSync(binaryPath);
          }
        }
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
  }

  containsDangerousPatterns(code) {
    const dangerousPatterns = [
      // Node.js dangerous operations
      /require\s*\(\s*['"`]child_process['"`]\s*\)/i,
      /require\s*\(\s*['"`]fs['"`]\s*\)/i,
      /require\s*\(\s*['"`]http['"`]\s*\)/i,
      /require\s*\(\s*['"`]https['"`]\s*\)/i,
      /require\s*\(\s*['"`]net['"`]\s*\)/i,
      /require\s*\(\s*['"`]cluster['"`]\s*\)/i,
      /require\s*\(\s*['"`]worker_threads['"`]\s*\)/i,
      /require\s*\(\s*['"`]vm['"`]\s*\)/i,
      /process\.exit/i,
      /process\.kill/i,
      /process\.abort/i,
      /exec\s*\(/i,
      /spawn\s*\(/i,
      /fork\s*\(/i,
      /execSync\s*\(/i,
      /spawnSync\s*\(/i,
      /eval\s*\(/i,
      /Function\s*\(/i,
      /setTimeout\s*\(\s*['"`]\s*rm\s+/i,
      /setInterval\s*\(\s*['"`]\s*rm\s+/i,
      /global\s*\[/i,
      /global\./i,
      /process\.env/i,
      /process\.argv/i,
      /__dirname/i,
      /__filename/i,

      // Python dangerous operations
      /import\s+os/i,
      /import\s+subprocess/i,
      /import\s+sys/i,
      /import\s+socket/i,
      /import\s+urllib/i,
      /import\s+requests/i,
      /import\s+threading/i,
      /import\s+multiprocessing/i,
      /os\.system/i,
      /os\.popen/i,
      /os\.exec/i,
      /subprocess\./i,
      /sys\.exit/i,
      /eval\s*\(/i,
      /exec\s*\(/i,
      /open\s*\(\s*['"`]\/etc\//i,
      /open\s*\(\s*['"`]\/proc\//i,
      /open\s*\(\s*['"`]\/home\//i,
      /open\s*\(\s*['"`]\/root\//i,
      /__import__/i,
      /globals\s*\(\)/i,
      /locals\s*\(\)/i,

      // Java dangerous operations
      /Runtime\.getRuntime/i,
      /ProcessBuilder/i,
      /System\.exit/i,
      /File\s*\(/i,
      /\bnew\s+File\b/i,
      /FileInputStream/i,
      /FileOutputStream/i,
      /Socket/i,
      /ServerSocket/i,
      /URL/i,
      /URLConnection/i,

      // C++ dangerous operations
      /system\s*\(/i,
      /popen\s*\(/i,
      /exec/i,
      /fork\s*\(/i,
      /socket/i,
      /connect/i,
      /fopen/i,
      /freopen/i,
      /remove\s*\(/i,
      /unlink/i,

      // General dangerous patterns
      /rm\s+/i,
      /del\s+/i,
      /format\s+/i,
      /shutdown/i,
      /reboot/i,
      /halt/i,
      /poweroff/i,
      /kill/i,
      /pkill/i,
      /killall/i,
      /chmod/i,
      /chown/i,
      /sudo/i,
      /su\s+/i,
      /passwd/i,
      /shadow/i,
      /wget/i,
      /curl/i,
      /nc\s+/i,
      /netcat/i,
      /telnet/i,
      /ssh/i,
      /scp/i,
      /ftp/i,
      /tftp/i,
      /mysql/i,
      /psql/i,
      /sqlite/i,
      /redis/i,
      /mongodb/i,
      /docker/i,
      /kubectl/i,
      /terraform/i,
      /ansible/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(code));
  }

  wrapCode(code, testInput) {
    return this.config.wrapper ? this.config.wrapper(code, testInput) : code;
  }

  async runCode(filePath, testInput, timeLimit, monitor) {
    return new Promise((resolve, reject) => {
      let output = '';
      let error = '';
      let timeoutId;
      let childProcess = null;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (childProcess && !childProcess.killed) {
          try {
            childProcess.kill('SIGKILL');
          } catch (killError) {
            console.error('Error killing process:', killError);
          }
        }
      };

      // Set execution timeout
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Execution timeout'));
      }, timeLimit);

      try {
        let command, args;

        if (this.language === 'cpp') {
          // Compile first
          const compileProcess = spawn(this.config.command, this.config.compileArgs(filePath), {
            cwd: SANDBOX_DIR,
            stdio: ['pipe', 'pipe', 'pipe']
          });

          compileProcess.on('close', (code) => {
            if (code !== 0) {
              clearTimeout(timeoutId);
              let compileError = '';
              compileProcess.stderr.on('data', (data) => {
                compileError += data.toString();
              });
              setTimeout(() => {
                reject(new Error(`Compilation failed: ${compileError}`));
              }, 100);
              return;
            }

            // Run compiled binary
            command = this.config.runArgs(filePath)[0];
            args = [];
            runProcess();
          });

          compileProcess.on('error', (err) => {
            clearTimeout(timeoutId);
            reject(new Error(`Compilation error: ${err.message}`));
          });

        } else {
          command = this.config.command;
          args = this.config.args(filePath);
          runProcess();
        }

        function runProcess() {
          childProcess = spawn(command, args, {
            cwd: SANDBOX_DIR,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=128' }
          });

          // Send input if provided
          if (testInput) {
            childProcess.stdin.write(testInput);
            childProcess.stdin.end();
          }

          childProcess.stdout.on('data', (data) => {
            output += data.toString();
            if (output.length > EXECUTION_LIMITS.maxOutputSize) {
              cleanup();
              reject(new Error('Output size limit exceeded'));
            }
          });

          childProcess.stderr.on('data', (data) => {
            error += data.toString();
          });

          childProcess.on('close', (code) => {
            clearTimeout(timeoutId);
            monitor.update();
            resolve({
              success: code === 0,
              output: output.trim(),
              error: error.trim()
            });
          });

          childProcess.on('error', (err) => {
            clearTimeout(timeoutId);
            reject(new Error(`Execution error: ${err.message}`));
          });
        }

      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  }
}

// Semantic analysis engine for IDE mode
class SemanticAnalyzer {
  static analyzeCode(code, language, correctCode = null) {
    const analysis = {
      syntaxValid: false,
      structureScore: 0,
      keywordScore: 0,
      complexityScore: 0,
      similarityScore: 0,
      suggestions: []
    };

    try {
      switch (language.toLowerCase()) {
        case 'javascript':
          analysis.syntaxValid = this.validateJavaScriptSyntax(code);
          analysis.structureScore = this.analyzeJavaScriptStructure(code);
          analysis.keywordScore = this.analyzeKeywords(code, ['function', 'const', 'let', 'var', 'if', 'for', 'while', 'return']);
          break;
        case 'python':
          analysis.syntaxValid = this.validatePythonSyntax(code);
          analysis.structureScore = this.analyzePythonStructure(code);
          analysis.keywordScore = this.analyzeKeywords(code, ['def', 'class', 'if', 'for', 'while', 'return', 'print']);
          break;
        case 'java':
          analysis.syntaxValid = this.validateJavaSyntax(code);
          analysis.structureScore = this.analyzeJavaStructure(code);
          analysis.keywordScore = this.analyzeKeywords(code, ['public', 'class', 'void', 'int', 'String', 'if', 'for', 'while', 'return']);
          break;
        case 'cpp':
          analysis.syntaxValid = this.validateCppSyntax(code);
          analysis.structureScore = this.analyzeCppStructure(code);
          analysis.keywordScore = this.analyzeKeywords(code, ['int', 'void', 'class', 'if', 'for', 'while', 'return', 'cout', 'cin']);
          break;
      }

      analysis.complexityScore = this.calculateComplexity(code);
      if (correctCode) {
        analysis.similarityScore = this.calculateSimilarity(code, correctCode);
      }

      analysis.suggestions = this.generateSuggestions(analysis, language);

    } catch (error) {
      analysis.suggestions.push(`Analysis error: ${error.message}`);
    }

    return analysis;
  }

  static validateJavaScriptSyntax(code) {
    try {
      new Function(code);
      return true;
    } catch {
      return false;
    }
  }

  static validatePythonSyntax(code) {
    // Basic Python syntax validation
    const lines = code.split('\n');
    let indentLevel = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const currentIndent = line.length - line.trimStart().length;
      if (currentIndent > indentLevel + 4) return false; // Invalid indentation
      indentLevel = currentIndent;
    }
    return true;
  }

  static validateJavaSyntax(code) {
    // Basic Java syntax checks
    const hasClass = /class\s+\w+/.test(code);
    const hasMain = /public\s+static\s+void\s+main/.test(code);
    const bracesBalanced = (code.match(/\{/g) || []).length === (code.match(/\}/g) || []).length;
    return hasClass && hasMain && bracesBalanced;
  }

  static validateCppSyntax(code) {
    // Basic C++ syntax checks
    const hasMain = /int\s+main\s*\(/.test(code);
    const bracesBalanced = (code.match(/\{/g) || []).length === (code.match(/\}/g) || []).length;
    return hasMain && bracesBalanced;
  }

  static analyzeJavaScriptStructure(code) {
    let score = 0;
    if (/function\s+\w+\s*\(/.test(code)) score += 2;
    if (/if\s*\(/.test(code)) score += 1;
    if (/for\s*\(/.test(code) || /while\s*\(/.test(code)) score += 1;
    if (/return\s+/.test(code)) score += 1;
    if (/console\.log/.test(code)) score += 1;
    return Math.min(score, 5);
  }

  static analyzePythonStructure(code) {
    let score = 0;
    if (/def\s+\w+\s*\(/.test(code)) score += 2;
    if (/if\s+/.test(code)) score += 1;
    if (/for\s+/.test(code) || /while\s+/.test(code)) score += 1;
    if (/return\s+/.test(code)) score += 1;
    if (/print\s*\(/.test(code)) score += 1;
    return Math.min(score, 5);
  }

  static analyzeJavaStructure(code) {
    let score = 0;
    if (/public\s+class\s+\w+/.test(code)) score += 2;
    if (/public\s+static\s+void\s+main/.test(code)) score += 2;
    if (/if\s*\(/.test(code)) score += 1;
    if (/for\s*\(/.test(code) || /while\s*\(/.test(code)) score += 1;
    if (/System\.out\.println/.test(code)) score += 1;
    return Math.min(score, 5);
  }

  static analyzeCppStructure(code) {
    let score = 0;
    if (/int\s+main\s*\(/.test(code)) score += 2;
    if (/if\s*\(/.test(code)) score += 1;
    if (/for\s*\(/.test(code) || /while\s*\(/.test(code)) score += 1;
    if (/return\s+/.test(code)) score += 1;
    if (/cout\s*<</.test(code)) score += 1;
    return Math.min(score, 5);
  }

  static analyzeKeywords(code, keywords) {
    let score = 0;
    for (const keyword of keywords) {
      if (code.includes(keyword)) score += 1;
    }
    return Math.min(score, keywords.length);
  }

  static calculateComplexity(code) {
    const lines = code.split('\n').filter(line => line.trim().length > 0).length;
    const functions = (code.match(/function\s+\w+|def\s+\w+|public\s+\w+\s+\w+/g) || []).length;
    const loops = (code.match(/for\s*\(|while\s*\(/g) || []).length;
    const conditionals = (code.match(/if\s*\(/g) || []).length;

    return Math.min(lines + functions + loops + conditionals, 10);
  }

  static calculateSimilarity(code1, code2) {
    if (!code1 || !code2) return 0;

    const words1 = code1.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const words2 = code2.toLowerCase().split(/\W+/).filter(w => w.length > 2);

    if (words1.length === 0 && words2.length === 0) return 10; // Both empty, perfect match
    if (words1.length === 0 || words2.length === 0) return 0; // One empty, no match

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? (intersection.size / union.size) * 10 : 0;
  }

  static generateSuggestions(analysis, language) {
    const suggestions = [];

    if (!analysis.syntaxValid) {
      suggestions.push(`Fix syntax errors in your ${language} code`);
    }

    if (analysis.structureScore < 3) {
      suggestions.push('Add more programming constructs (functions, loops, conditionals)');
    }

    if (analysis.keywordScore < 3) {
      suggestions.push(`Use more ${language}-specific keywords and constructs`);
    }

    if (analysis.complexityScore < 5) {
      suggestions.push('Increase code complexity with more features');
    }

    if (analysis.similarityScore < 5) {
      suggestions.push('Your code structure differs significantly from the expected solution');
    }

    return suggestions;
  }
}

// Bug fix validation system
class BugFixValidator {
  static async validateFix(originalCode, fixedCode, testCases, userId = null) {
    const validation = {
      fixesApplied: false,
      testsPass: false,
      improvementScore: 0,
      issues: []
    };

    try {
      // Parse test cases
      const tests = JSON.parse(testCases);

      // Run tests on both versions with rate limiting
      const originalResults = [];
      const fixedResults = [];

      for (const test of tests) {
        const originalResult = await this.runTest(originalCode, test.input, test.language, userId);
        const fixedResult = await this.runTest(fixedCode, test.input, test.language, userId);

        originalResults.push(originalResult);
        fixedResults.push(fixedResult);
      }

      // Analyze improvements
      validation.fixesApplied = this.detectFixes(originalResults, fixedResults);
      validation.testsPass = fixedResults.every(result => result.success);
      validation.improvementScore = this.calculateImprovement(originalResults, fixedResults);

      // Identify remaining issues
      validation.issues = this.identifyIssues(fixedResults, tests);

    } catch (error) {
      validation.issues.push(`Validation error: ${error.message}`);
    }

    return validation;
  }

  static async runTest(code, input, language, userId = null) {
    try {
      // Use the actual CodeExecutionService for real execution with rate limiting
      const service = new CodeExecutionService();
      const result = await service.executeCode(code, language, input, 5000, userId); // 5 second timeout for tests
      return {
        success: result.success,
        output: result.output,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.message
      };
    }
  }

  static detectFixes(originalResults, fixedResults) {
    const originalFailures = originalResults.filter(r => !r.success).length;
    const fixedFailures = fixedResults.filter(r => !r.success).length;
    return fixedFailures < originalFailures;
  }

  static calculateImprovement(originalResults, fixedResults) {
    const originalScore = originalResults.filter(r => r.success).length;
    const fixedScore = fixedResults.filter(r => r.success).length;
    return Math.max(0, fixedScore - originalScore) * 2;
  }

  static identifyIssues(results, tests) {
    const issues = [];
    results.forEach((result, index) => {
      if (!result.success) {
        issues.push(`Test case ${index + 1} still fails: ${result.error}`);
      }
    });
    return issues;
  }
}

// Partial scoring algorithms for code questions
class PartialScorer {
  static calculateScore(userCode, correctCode, testResults, language, evaluationMode) {
    let totalScore = 0;
    const maxScore = 10; // Base score for code questions

    try {
      switch (evaluationMode) {
        case 'semantic':
          totalScore = this.semanticScoring(userCode, correctCode, language);
          break;
        case 'compiler':
          totalScore = this.compilerScoring(testResults, userCode, correctCode);
          break;
        case 'bugfix':
          totalScore = this.bugFixScoring(userCode, correctCode, testResults);
          break;
        default:
          totalScore = this.defaultScoring(userCode, correctCode);
      }

      // Ensure score is within valid range
      if (isNaN(totalScore) || !isFinite(totalScore)) {
        totalScore = 0;
      }

      return Math.max(0, Math.min(totalScore, maxScore));
    } catch (error) {
      console.error('Error calculating score:', error);
      return 0;
    }
  }

  static semanticScoring(userCode, correctCode, language) {
    const analysis = SemanticAnalyzer.analyzeCode(userCode, language, correctCode);
    let score = 0;

    if (analysis.syntaxValid) score += 2;
    score += analysis.structureScore * 0.5;
    score += analysis.keywordScore * 0.3;
    score += analysis.similarityScore * 0.8;

    // Ensure score doesn't exceed maximum
    return Math.min(score, 10);
  }

  static compilerScoring(testResults, userCode, correctCode) {
    if (!testResults || !Array.isArray(testResults)) return 0;

    const passedTests = testResults.filter(result => result && result.success).length;
    const totalTests = testResults.length;
    const passRate = totalTests > 0 ? passedTests / totalTests : 0;

    // Bonus for code quality
    const qualityBonus = this.assessCodeQuality(userCode, correctCode);

    // Enhanced scoring: base score from pass rate + quality bonus
    return (passRate * 8) + qualityBonus;
  }

  static bugFixScoring(userCode, correctCode, testResults) {
    const validation = BugFixValidator.validateFix('', userCode, JSON.stringify(testResults || []));
    let score = 0;

    if (validation.fixesApplied) score += 3;
    if (validation.testsPass) score += 5;
    score += validation.improvementScore;

    // Ensure score doesn't exceed maximum
    return Math.min(score, 10);
  }

  static defaultScoring(userCode, correctCode) {
    // Basic similarity scoring
    const similarity = SemanticAnalyzer.calculateSimilarity(userCode, correctCode);
    return similarity * 2;
  }

  static assessCodeQuality(userCode, correctCode) {
    let bonus = 0;

    // Length appropriateness
    const lengthRatio = userCode.length / correctCode.length;
    if (lengthRatio > 0.5 && lengthRatio < 2.0) bonus += 0.5;

    // Code structure
    const hasFunctions = /function|def|public\s+\w+/.test(userCode);
    if (hasFunctions) bonus += 0.5;

    // Error handling
    const hasErrorHandling = /try|catch|except/.test(userCode);
    if (hasErrorHandling) bonus += 0.5;

    return bonus;
  }
}

// Rate limiting and concurrency control
class RateLimiter {
  constructor() {
    this.requests = new Map(); // userId -> { count, resetTime }
  }

  isAllowed(userId) {
    const now = Date.now();
    const userRequests = this.requests.get(userId);

    if (!userRequests || now > userRequests.resetTime) {
      // Reset or initialize
      this.requests.set(userId, {
        count: 1,
        resetTime: now + 60000 // 1 minute
      });
      return true;
    }

    if (userRequests.count >= EXECUTION_LIMITS.rateLimitPerMinute) {
      return false;
    }

    userRequests.count++;
    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [userId, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(userId);
      }
    }
  }
}

// Concurrency control
class ConcurrencyController {
  constructor(maxConcurrent = EXECUTION_LIMITS.maxConcurrentExecutions) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  async execute(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { fn, resolve, reject } = this.queue.shift();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.processQueue();
    }
  }
}

// Main code execution service
export class CodeExecutionService {
  constructor() {
    this.runners = new Map();
    this.monitor = new ResourceMonitor();
    this.rateLimiter = new RateLimiter();
    this.concurrencyController = new ConcurrencyController();
  }

  async executeCode(code, language, testInput = '', timeLimit = null, userId = null) {
    // Rate limiting check
    if (userId && !this.rateLimiter.isAllowed(userId)) {
      throw new Error('Rate limit exceeded. Please wait before submitting more code.');
    }

    if (!EXECUTION_LIMITS.allowedLanguages.includes(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    if (!this.runners.has(language)) {
      this.runners.set(language, new LanguageRunner(language));
    }

    const runner = this.runners.get(language);

    // Use concurrency controller for execution
    const result = await this.concurrencyController.execute(async () => {
      return await runner.execute(code, testInput, timeLimit || EXECUTION_LIMITS.timeout);
    });

    this.monitor.update();
    this.rateLimiter.cleanup(); // Periodic cleanup of rate limit data
    return result;
  }

  analyzeCode(code, language, correctCode = null) {
    return SemanticAnalyzer.analyzeCode(code, language, correctCode);
  }

  validateBugFix(originalCode, fixedCode, testCases) {
    return BugFixValidator.validateFix(originalCode, fixedCode, testCases);
  }

  calculatePartialScore(userCode, correctCode, testResults, language, evaluationMode) {
    return PartialScorer.calculateScore(userCode, correctCode, testResults, language, evaluationMode);
  }

  getResourceStats() {
    return this.monitor.getStats();
  }

  // Batch execution for multiple test cases
  async executeTestCases(code, language, testCases, userId = null) {
    const results = [];

    for (const testCase of testCases) {
      try {
        const result = await this.executeCode(code, language, testCase.input, testCase.timeLimit, userId);
        results.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: result.output,
          success: result.success && this.compareOutputs(result.output, testCase.expectedOutput),
          error: result.error,
          executionTime: result.stats.executionTime,
          memoryUsage: result.stats.memoryUsage
        });
      } catch (error) {
        results.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: '',
          success: false,
          error: error.message,
          executionTime: 0,
          memoryUsage: 0
        });
      }
    }

    return results;
  }

  compareOutputs(actual, expected) {
    // Normalize outputs for comparison
    const normalize = (str) => str.trim().replace(/\s+/g, ' ').toLowerCase();
    return normalize(actual) === normalize(expected);
  }
}

// Export singleton instance
export default new CodeExecutionService();