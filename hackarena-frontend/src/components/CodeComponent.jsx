import { useState, useEffect } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/themes/prism.css";
import { BookOpen, Play, Sparkles, Eye, EyeOff, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

const CodeComponent = ({
  question,
  answer,
  setAnswer,
  selectedLanguage,
  setSelectedLanguage,
  submitted,
  showInstructions,
  setShowInstructions,
  codeHints,
  setCodeHints
}) => {
  const [showTestPreview, setShowTestPreview] = useState(false);

  const evaluationMode = question.evaluation_mode || "mcq";
  const codeLanguage = question.code_language || "javascript";

  let placeholder = "Write your code here...";

  if (evaluationMode === "textarea") {
    placeholder = "Write your code solution. AI will evaluate semantic correctness...";
  } else if (evaluationMode === "compiler") {
    placeholder = "Write your code. It will be tested against provided test cases...";
  } else if (evaluationMode === "ide") {
    placeholder = "Write your complete solution...";
  } else if (evaluationMode === "bugfix") {
    placeholder = "Fix the buggy code above...";
  } else {
    placeholder = "Write your code here...";
  }

  // Language selection dropdown for code questions
  const languageSelector = (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Programming Language:
        </label>
        <div className="flex items-center space-x-2">
          <BookOpen className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500">Choose your preferred language</span>
        </div>
      </div>
      <select
        value={selectedLanguage}
        onChange={(e) => {
          const newLang = e.target.value;
          setSelectedLanguage(newLang);
          setCodeHints(getCodeHints(newLang));
          // Load template if answer is empty
          if (!answer.trim()) {
            setAnswer(loadCodeTemplate(newLang));
          }
        }}
        disabled={submitted}
        className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
        aria-label="Select programming language"
      >
        {getLanguageOptions().map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.icon} {lang.label}
          </option>
        ))}
      </select>
      {!answer.trim() && !submitted && (
        <button
          onClick={() => setAnswer(loadCodeTemplate(selectedLanguage))}
          className="ml-3 btn btn-secondary text-sm"
        >
          Load Template
        </button>
      )}
    </div>
  );

  // Display code snippet for MCQ mode
  if (evaluationMode === "mcq" && question.code_snippet) {
    return (
      <div className="space-y-6">
        {languageSelector}
        <div>
          <label className="block text-base font-medium text-gray-700 mb-3">
            Code Snippet ({selectedLanguage}):
          </label>
          <div className="bg-gray-100 p-4 rounded-lg border overflow-x-auto">
            <Editor
              value={question.code_snippet}
              readOnly={true}
              highlight={(code) =>
                safeHighlight(code, getLanguageHighlight(selectedLanguage))
              }
              padding={15}
              style={{
                fontFamily: '"Inconsolata", "Monaco", monospace',
                fontSize: 14,
                backgroundColor: "transparent",
                border: "none",
                minHeight: "120px",
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-base font-medium text-gray-700 mb-3">
            Answer Options:
          </label>
          <div className="space-y-4">
            {(() => {
              let options = [];
              if (Array.isArray(question.options)) {
                options = question.options;
              } else if (typeof question.options === "string") {
                try {
                  options = JSON.parse(question.options || "[]");
                  if (!Array.isArray(options)) {
                    options = [];
                  }
                } catch (error) {
                  console.error(
                    "Invalid options JSON for code MCQ question:",
                    question.options,
                    error
                  );
                  options = [];
                }
              }
              return options.map((option, index) => (
                <label
                  key={index}
                  className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer touch-manipulation min-h-[60px]"
                >
                  <input
                    type="radio"
                    name="code-mcq-answer"
                    value={option}
                    checked={answer === option}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={submitted}
                    className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0"
                  />
                  <span className="font-medium text-gray-700 text-base flex-shrink-0">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <div className="flex-1 overflow-x-auto">
                    <Editor
                      value={option}
                      readOnly={true}
                      highlight={(code) =>
                        safeHighlight(
                          code,
                          getLanguageHighlight(selectedLanguage)
                        )
                      }
                      padding={10}
                      style={{
                        fontFamily: '"Inconsolata", "Monaco", monospace',
                        fontSize: 13,
                        backgroundColor: "transparent",
                        border: "none",
                        minHeight: "60px",
                      }}
                    />
                  </div>
                </label>
              ));
            })()}
          </div>
        </div>
      </div>
    );
  }

  // Display buggy code for bugfix mode
  if (evaluationMode === "bugfix" && question.bug_fix_code) {
    return (
      <div className="space-y-6">
        {languageSelector}
        <div>
          <label className="block text-base font-medium text-gray-700 mb-3">
            Buggy Code ({selectedLanguage}):
          </label>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 overflow-x-auto">
            <Editor
              value={question.bug_fix_code}
              readOnly={true}
              highlight={(code) =>
                safeHighlight(code, getLanguageHighlight(selectedLanguage))
              }
              padding={15}
              style={{
                fontFamily: '"Inconsolata", "Monaco", monospace',
                fontSize: 14,
                backgroundColor: "transparent",
                border: "none",
                minHeight: "150px",
              }}
            />
          </div>
          {question.bug_fix_instructions && (
            <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-base text-yellow-800 leading-relaxed">
                <strong>Instructions:</strong>{" "}
                {question.bug_fix_instructions}
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-base font-medium text-gray-700 mb-3">
            Your Fixed Code:
          </label>
          <div className="overflow-x-auto">
            <Editor
              value={answer}
              onValueChange={(code) => setAnswer(code)}
              highlight={(code) =>
                safeHighlight(code, getLanguageHighlight(selectedLanguage))
              }
              padding={15}
              disabled={submitted}
              style={{
                fontFamily: '"Inconsolata", "Monaco", monospace',
                fontSize: 14,
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                minHeight: "250px",
                width: "100%",
              }}
              placeholder={placeholder}
            />
          </div>
        </div>
      </div>
    );
  }

  // IDE mode with optional template
  if (evaluationMode === "ide") {
    return (
      <div className="space-y-6">
        {languageSelector}
        {question.ide_template && (
          <div>
            <label className="block text-base font-medium text-gray-700 mb-3">
              Starter Template ({selectedLanguage}):
            </label>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 overflow-x-auto">
              <Editor
                value={question.ide_template}
                readOnly={true}
                highlight={(code) =>
                  safeHighlight(
                    code,
                    getLanguageHighlight(selectedLanguage)
                  )
                }
                padding={15}
                style={{
                  fontFamily: '"Inconsolata", "Monaco", monospace',
                  fontSize: 14,
                  backgroundColor: "transparent",
                  border: "none",
                  minHeight: "120px",
                }}
              />
            </div>
            <button
              onClick={() => setAnswer(question.ide_template)}
              disabled={submitted}
              className="mt-2 btn btn-secondary text-sm"
            >
              Load Template
            </button>
          </div>
        )}

        <div>
          <label className="block text-base font-medium text-gray-700 mb-3">
            Your Solution ({selectedLanguage}):
          </label>
          <div className="overflow-x-auto">
            <Editor
              value={answer}
              onValueChange={(code) => setAnswer(code)}
              highlight={(code) =>
                safeHighlight(code, getLanguageHighlight(selectedLanguage))
              }
              padding={15}
              disabled={submitted}
              style={{
                fontFamily: '"Inconsolata", "Monaco", monospace',
                fontSize: 14,
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                minHeight: "300px",
                width: "100%",
              }}
              placeholder={placeholder}
            />
          </div>
          {!answer.trim() && (
            <button
              onClick={() => setAnswer(loadCodeTemplate(selectedLanguage))}
              disabled={submitted}
              className="mt-2 btn btn-secondary text-sm"
            >
              Load Basic Template
            </button>
          )}
        </div>
      </div>
    );
  }

  // Compiler mode with test cases
  if (evaluationMode === "compiler") {
    return (
      <div className="space-y-6">
        {languageSelector}
        <div>
          <label className="block text-base font-medium text-gray-700 mb-3">
            Code Solution ({selectedLanguage}):
          </label>
          <div className="overflow-x-auto">
            <Editor
              value={answer}
              onValueChange={(code) => setAnswer(code)}
              highlight={(code) =>
                safeHighlight(code, getLanguageHighlight(selectedLanguage))
              }
              padding={15}
              disabled={submitted}
              style={{
                fontFamily: '"Inconsolata", "Monaco", monospace',
                fontSize: 14,
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                minHeight: "250px",
                width: "100%",
              }}
              placeholder={placeholder}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            🧪 Your code will be tested against multiple test cases for
            correctness and efficiency.
          </p>
        </div>

        {/* Test Cases Display */}
        {question.test_cases && (
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="font-medium text-gray-800 mb-3 text-base">
              Test Cases:
            </h4>
            <div className="space-y-3">
              {(() => {
                try {
                  const testCases = JSON.parse(question.test_cases);
                  return testCases.map((testCase, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-gray-700">
                          Test Case {index + 1}
                        </span>
                        {testCase.description && (
                          <span className="text-xs text-gray-500">
                            {testCase.description}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Input:</span>
                          <code className="block bg-gray-100 p-2 rounded mt-1 text-xs font-mono">
                            {testCase.input || "No input"}
                          </code>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Expected Output:</span>
                          <code className="block bg-green-50 p-2 rounded mt-1 text-xs font-mono border border-green-200">
                            {testCase.expected_output || "No expected output"}
                          </code>
                        </div>
                      </div>
                    </div>
                  ));
                } catch (error) {
                  console.error("Invalid test cases JSON:", error);
                  return (
                    <p className="text-sm text-gray-500">
                      Test cases format is invalid.
                    </p>
                  );
                }
              })()}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default code editor for other modes
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-lg">💻</span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          Coding Challenge
        </span>
        <span className="text-sm text-gray-600">
          {evaluationMode === 'textarea' ? 'AI-evaluated coding' :
           evaluationMode === 'compiler' ? 'Test case validation' :
           evaluationMode === 'ide' ? 'Interactive development' :
           evaluationMode === 'bugfix' ? 'Debug and fix code' : 'Coding challenge'}
        </span>
      </div>
      {languageSelector}
      <div>
        <label className="block text-base font-medium text-gray-700 mb-3">
          Code Solution ({selectedLanguage}):
        </label>
        <div className="relative overflow-x-auto">
          <Editor
            value={answer}
            onValueChange={(code) => setAnswer(code)}
            onKeyDown={(e) => {
              // Ctrl+Enter to submit
              if (e.ctrlKey && e.key === 'Enter' && !submitted && answer.trim()) {
                e.preventDefault();
                // This would need to be passed as a prop
              }
            }}
            highlight={(code) =>
              safeHighlight(code, getLanguageHighlight(selectedLanguage))
            }
            padding={15}
            disabled={submitted}
            style={{
              fontFamily: '"Inconsolata", "Monaco", monospace',
              fontSize: 14,
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              minHeight: "250px",
              width: "100%",
            }}
            placeholder={placeholder}
            aria-label="Code editor"
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded border">
            Ctrl+Enter to submit
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          {evaluationMode === "textarea" && (
            <p className="text-sm text-blue-600 flex items-center">
              <Sparkles className="h-4 w-4 mr-1" />
              AI will evaluate semantic correctness
            </p>
          )}
          {evaluationMode === "compiler" && (
            <p className="text-sm text-green-600 flex items-center">
              <Play className="h-4 w-4 mr-1" />
              Code will be tested against multiple cases
            </p>
          )}
          <div className="text-xs text-gray-500">
            {answer.length} characters
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions (same as in original)
const getLanguageOptions = () => [
  { value: "javascript", label: "JavaScript", icon: "🟨" },
  { value: "python", label: "Python", icon: "🐍" },
  { value: "java", label: "Java", icon: "☕" },
  { value: "cpp", label: "C++", icon: "⚡" }
];

const loadCodeTemplate = (language) => {
  const templates = {
    javascript: `function solution() {
  // Write your JavaScript code here
  // Example: return the sum of two numbers
  console.log("Hello, World!");
}`,
    python: `def solution():
  # Write your Python code here
  # Example: return the sum of two numbers
  print("Hello, World!")`,
    java: `public class Solution {
  public static void main(String[] args) {
      // Write your Java code here
      // Example: print the sum of two numbers
      System.out.println("Hello, World!");
  }
}`,
    cpp: `#include <iostream>
using namespace std;

int main() {
  // Write your C++ code here
  // Example: print the sum of two numbers
  cout << "Hello, World!" << endl;
  return 0;
}`
  };
  return templates[language] || templates.javascript;
};

const getCodeHints = (language) => {
  const hints = {
    javascript: [
      "Use console.log() to output results",
      "Remember to handle edge cases",
      "Consider time complexity for large inputs",
      "Use meaningful variable names"
    ],
    python: [
      "Use print() to output results",
      "Python is 0-indexed",
      "Consider using list comprehensions",
      "Handle input parsing carefully"
    ],
    java: [
      "Use System.out.println() to output",
      "Remember to import necessary classes",
      "Handle exceptions with try-catch",
      "Use appropriate data types"
    ],
    cpp: [
      "Use cout to output results",
      "Include necessary headers",
      "Be careful with memory management",
      "Consider algorithm complexity"
    ]
  };
  return hints[language] || hints.javascript;
};

const getLanguageHighlight = (lang = "javascript") => {
  if (!Prism.languages) {
    return Prism.languages.javascript || null;
  }

  const validLang = ["javascript", "python", "java", "cpp"].includes(lang) ? lang : "javascript";
  switch (validLang) {
    case "javascript":
      return Prism.languages.javascript;
    case "python":
      return Prism.languages.python;
    case "java":
      return Prism.languages.java;
    case "cpp":
      return Prism.languages.cpp;
    default:
      return Prism.languages.javascript;
  }
};

const safeHighlight = (code, language) => {
  try {
    if (!Prism.languages || !language) {
      return code; // Return plain text if Prism is not ready
    }
    return Prism.highlight(code, language);
  } catch (error) {
    console.error("Prism.js highlighting error:", error);
    return code; // Fallback to plain text
  }
};

export default CodeComponent;