import toast from 'react-hot-toast';
import { useState, useEffect } from 'react'
import { X, Plus, Minus, FileText, Settings, Code, HelpCircle, AlertCircle, CheckCircle, Eye, EyeOff, Loader, Sparkles, BookOpen, Target, Clock, Zap } from 'lucide-react'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/themes/prism.css'

const QuestionForm = ({ question = null, onSave, onCancel }) => {
   const [activeTab, setActiveTab] = useState('basic')
   const [isSubmitting, setIsSubmitting] = useState(false)
   const [validationErrors, setValidationErrors] = useState({})
   const [showPreview, setShowPreview] = useState(false)
   const [formData, setFormData] = useState({
      questionText: '',
      questionType: 'mcq',
      codeSnippet: '',
      codeLanguage: 'javascript',
      bugFixCode: '',
      bugFixInstructions: '',
      ideTemplate: '',
      ideLanguage: 'javascript',
      options: ['', '', '', ''],
      correctAnswer: '',
      hint: '',
      hintPenalty: 10,
      timeLimit: 60,
      marks: 10,
      difficulty: 'easy',
      explanation: '',
      evaluationMode: 'mcq',
      testCases: '',
      aiValidationSettings: '',
      imageUrl: '',
      crosswordGrid: [],
      crosswordClues: {},
      crosswordSize: { rows: 10, cols: 10 },
      timeoutLimit: 5000,
      memoryLimit: 256,
      codeTemplate: ''
    })

  useEffect(() => {
    if (question) {
      setFormData({
        questionText: question.question_text || '',
        questionType: question.question_type || 'mcq',
        codeSnippet: question.code_snippet || '',
        codeLanguage: question.code_language || 'javascript',
        bugFixCode: question.bug_fix_code || '',
        bugFixInstructions: question.bug_fix_instructions || '',
        ideTemplate: question.ide_template || '',
        ideLanguage: question.ide_language || 'javascript',
        options: question.options || ['', '', '', ''],
        correctAnswer: question.correct_answer ? (typeof question.correct_answer === 'string' ? (() => {
          try {
            return JSON.parse(question.correct_answer);
          } catch (e) {
            // If it's not valid JSON, treat it as a plain string (for single answers)
            return question.correct_answer;
          }
        })() : question.correct_answer) : [],
        hint: question.hint || '',
        hintPenalty: question.hint_penalty || 10,
        timeLimit: question.time_limit || 60,
        marks: question.marks || 10,
        difficulty: question.difficulty || 'medium',
        explanation: question.explanation || '',
        evaluationMode: question.evaluation_mode || 'mcq',
        testCases: question.test_cases || '',
        aiValidationSettings: question.ai_validation_settings || '',
        imageUrl: question.image_url || '',
        crosswordGrid: question.crossword_grid ? (typeof question.crossword_grid === 'string' ? JSON.parse(question.crossword_grid) : question.crossword_grid) : [],
        crosswordClues: question.crossword_clues ? (typeof question.crossword_clues === 'string' ? JSON.parse(question.crossword_clues) : question.crossword_clues) : {},
        crosswordSize: question.crossword_size ? (typeof question.crossword_size === 'string' ? JSON.parse(question.crossword_size) : question.crossword_size) : { rows: 10, cols: 10 },
        timeoutLimit: question.timeout_limit || 5000,
        memoryLimit: question.memory_limit || 256,
        codeTemplate: question.code_template || ''
      })
    }
  }, [question])

  const validateForm = () => {
    const errors = {}

    // Basic validation
    if (!formData.questionText.trim()) {
      errors.questionText = 'Question text is required'
    }

    if (formData.questionType === 'mcq' && formData.options.filter(opt => opt.trim()).length < 2) {
      errors.options = 'At least 2 options are required for MCQ'
    }

    if (formData.questionType === 'fill_blank' && !formData.correctAnswer.trim()) {
      errors.correctAnswer = 'Correct answer is required for Fill in the Blank'
    }

    if (formData.questionType === 'multiple_answers') {
      if (formData.options.filter(opt => opt.trim()).length < 2) {
        errors.options = 'At least 2 options are required for Multiple Answers'
      }
      if (!Array.isArray(formData.correctAnswer) || formData.correctAnswer.length === 0) {
        errors.correctAnswer = 'At least one correct answer must be selected for Multiple Answers'
      }
    }

    if (formData.questionType === 'code') {
      if (formData.evaluationMode === 'mcq') {
        if (!formData.codeSnippet.trim()) {
          errors.codeSnippet = 'Code snippet is required for Code Snippet MCQ'
        }
        if (formData.options.filter(opt => opt.trim()).length < 2) {
          errors.codeOptions = 'At least 2 code options are required'
        }
        if (!formData.correctAnswer.trim()) {
          errors.correctAnswer = 'Correct answer must be selected'
        }
      } else if (formData.evaluationMode === 'bugfix') {
        if (!formData.bugFixCode.trim()) {
          errors.bugFixCode = 'Buggy code is required for Bug Fix Mode'
        }
        if (!formData.correctAnswer.trim()) {
          errors.correctAnswer = 'Expected fixed code is required'
        }
      } else if (formData.evaluationMode === 'ide') {
        if (!formData.correctAnswer.trim()) {
          errors.correctAnswer = 'Expected solution code is required for IDE Mode'
        }
      } else if (formData.evaluationMode === 'compiler') {
        if (!formData.testCases.trim()) {
          errors.testCases = 'Test cases are required for compiler evaluation'
        } else {
          try {
            const testCases = JSON.parse(formData.testCases)
            if (!Array.isArray(testCases) || testCases.length === 0) {
              errors.testCases = 'Test cases must be a non-empty array'
            } else {
              for (let i = 0; i < testCases.length; i++) {
                const testCase = testCases[i]
                if (!testCase.input || !testCase.expectedOutput) {
                  errors.testCases = `Test case ${i + 1} must have input and expectedOutput fields`
                  break
                }
              }
            }
          } catch (error) {
            errors.testCases = 'Test cases must be valid JSON'
          }
        }
      }
    }

    if (formData.questionType === 'image' && !formData.imageUrl) {
      errors.imageUrl = 'Please upload an image for image-based questions'
    }

    if (formData.questionType === 'crossword') {
      if (!formData.crosswordGrid || formData.crosswordGrid.length === 0) {
        errors.crosswordGrid = 'Crossword grid is required'
      }
      if (!formData.crosswordClues || Object.keys(formData.crosswordClues).length === 0) {
        errors.crosswordClues = 'Crossword clues are required'
      }
    }

    // Check for other question types that require correct answer
    if (['mcq', 'true_false', 'fill_blank'].includes(formData.questionType) && !formData.correctAnswer.trim()) {
      errors.correctAnswer = 'Correct answer is required'
    }

    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const errors = validateForm()
    setValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      // Find the first tab with errors
      const errorFields = Object.keys(errors)
      if (errorFields.includes('questionText') || errorFields.includes('questionType') || errorFields.includes('difficulty')) {
        setActiveTab('basic')
      } else {
        setActiveTab('content')
      }
      setIsSubmitting(false)
      return
    }

    try {
      await onSave(formData)
    } catch (error) {
      console.error('Error saving question:', error)
      setValidationErrors({ submit: 'Failed to save question. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }))
  }

  const removeOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }))
  }

  const updateOption = (index, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }))
  }

  const validateLanguage = (lang) => {
    const validLanguages = ['javascript', 'python', 'java']
    return validLanguages.includes(lang) ? lang : 'javascript'
  }

  const getLanguageHighlight = (lang = 'javascript') => {
    const validLang = validateLanguage(lang)
    switch (validLang) {
      case 'javascript': return Prism.languages.javascript
      case 'python': return Prism.languages.python
      case 'java': return Prism.languages.java
      default: return Prism.languages.javascript
    }
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: FileText, description: 'Question text and type' },
    { id: 'content', label: 'Question Content', icon: Code, description: 'Answers and code content' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Timing and scoring' }
  ]

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-7xl w-full mx-2 sm:mx-4 max-h-[98vh] sm:max-h-[95vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-gradient-to-r from-white to-gray-50 border-b border-gray-200 rounded-t-3xl px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-dsba-navy to-blue-700 rounded-xl shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {question ? '✏️ Edit DSBA Question' : '✨ Create New DSBA Question'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">Build engaging challenges for your hackathon participants</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 group"
            aria-label="Close form"
          >
            <X className="h-6 w-6 text-gray-500 group-hover:text-red-600 transition-colors" />
          </button>
        </div>

        {/* Enhanced Tab Navigation */}
        <div className="flex bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-2 mb-8 shadow-inner border border-gray-200/50">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const hasErrors = activeTab !== tab.id && Object.keys(validationErrors).some(key => {
              if (tab.id === 'basic') return ['questionText', 'questionType', 'difficulty'].includes(key)
              if (tab.id === 'content') return ['options', 'codeSnippet', 'codeOptions', 'correctAnswer', 'bugFixCode', 'testCases', 'imageUrl', 'crosswordGrid', 'crosswordClues'].includes(key)
              if (tab.id === 'settings') return ['timeLimit', 'marks', 'hintPenalty'].includes(key)
              return false
            })
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 rounded-xl font-semibold text-sm transition-all duration-300 relative group flex-1 ${
                  isActive
                    ? 'bg-gradient-to-r from-dsba-navy to-blue-700 text-white shadow-lg transform scale-[1.02]'
                    : 'text-gray-600 hover:text-dsba-navy hover:bg-white/80 hover:shadow-md hover:transform hover:scale-[1.01]'
                }`}
                aria-label={`${tab.label}: ${tab.description}`}
              >
                <Icon className={`h-5 w-5 mr-3 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                <div className="text-left">
                  <div className="font-bold">{tab.label}</div>
                  <div className={`text-xs transition-opacity duration-200 ${isActive ? 'opacity-90' : 'opacity-60 group-hover:opacity-80'}`}>
                    {tab.description}
                  </div>
                </div>
                {hasErrors && (
                  <div className="ml-2 animate-pulse">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </div>
                )}
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-md"></div>
                )}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 sm:px-8 pb-6 sm:pb-8">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-8">
              {/* Question Text Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100/50 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <label htmlFor="questionText" className="block text-lg font-semibold text-gray-800 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-blue-600" />
                    Question Text *
                  </label>
                  <div className="flex items-center space-x-2 bg-blue-100 px-3 py-1 rounded-full">
                    <HelpCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-blue-700 font-medium">Be clear and specific</span>
                  </div>
                </div>
                <textarea
                  id="questionText"
                  value={formData.questionText}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, questionText: e.target.value }))
                    if (validationErrors.questionText) {
                      setValidationErrors(prev => ({ ...prev, questionText: undefined }))
                    }
                  }}
                  className={`input w-full h-32 sm:h-36 resize-none text-base leading-relaxed transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 ${
                    validationErrors.questionText
                      ? 'border-red-300 focus:border-red-500 bg-red-50/50'
                      : 'border-gray-200 focus:border-blue-400 bg-white hover:border-gray-300'
                  }`}
                  placeholder="Enter your engaging question... (e.g., 'What is the output of the following code?')"
                  required
                  aria-describedby={validationErrors.questionText ? "questionText-error" : undefined}
                  aria-label="Question text input"
                />
                {validationErrors.questionText && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
                    <p id="questionText-error" className="text-sm text-red-700 flex items-center font-medium">
                      <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                      {validationErrors.questionText}
                    </p>
                  </div>
                )}
              </div>

              {/* Question Configuration Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Question Type Card */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <label className="block text-sm font-semibold text-gray-800 mb-4 flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-indigo-600" />
                    Question Type
                  </label>
                  <select
                    value={formData.questionType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        questionType: newType,
                        correctAnswer: newType === 'multiple_answers' ? [] : ''
                      }));
                    }}
                    className="input w-full text-base py-1 px-4 rounded-lg border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                    aria-label="Select question type"
                    role="combobox"
                  >
                    <option value="mcq">📝 Multiple Choice Question</option>
                    <option value="multiple_answers">☑️ Multiple Answers</option>
                    <option value="true_false">✓ True/False</option>
                    <option value="fill_blank">✏️ Fill in the Blank</option>
                    <option value="image">🖼️ Image-based Question</option>
                    <option value="code">💻 Code Challenge</option>
                    <option value="crossword">🔤 Crossword Puzzle</option>
                  </select>
                  {/* <p className="text-xs text-gray-500 mt-2">Choose the format that best fits your question</p> */}
                </div>

                {/* Difficulty Level Card */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <label className="block text-sm font-semibold text-gray-800 mb-4 flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-orange-600" />
                    Difficulty Level
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="input w-full text-base py-1 px-4 rounded-lg border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                    aria-label="Select difficulty level"
                    role="combobox"
                  >
                    <option value="easy">🟢 Easy - Beginner friendly</option>
                    <option value="medium">🟡 Medium - Intermediate level</option>
                    <option value="hard">🔴 Hard - Advanced challenge</option>
                  </select>
                  {/* <p className="text-xs text-gray-500 mt-2">Set the appropriate challenge level</p> */}
                </div>
              </div>

              {/* Enhanced Preview Toggle */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 border border-blue-200/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Eye className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900 text-lg">Live Preview Mode</p>
                      <p className="text-sm text-blue-700">See exactly how participants will experience this question</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 shadow-md ${
                      showPreview ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gray-300'
                    }`}
                    aria-label={showPreview ? "Hide preview" : "Show preview"}
                    aria-pressed={showPreview}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-all duration-300 ${
                        showPreview ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {showPreview && (
                  <div className="mt-4 p-4 bg-white/80 rounded-lg border border-blue-200/30">
                    <p className="text-sm text-blue-800 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Preview is active - scroll down to see how your question will appear
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Question Content Tab */}
          {activeTab === 'content' && (
            <div className="space-y-8">
              {formData.questionType === 'code' && (
                <div className="space-y-6">
                  {/* Code Question Type Selector */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100/50 shadow-sm">
                    <label className="block text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <Code className="h-5 w-5 mr-2 text-purple-600" />
                      Code Challenge Type
                    </label>
                    <select
                      value={formData.evaluationMode}
                      onChange={(e) => setFormData(prev => ({ ...prev, evaluationMode: e.target.value }))}
                      className="input w-full text-base py-3 px-4 rounded-lg border-purple-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                    >
                      <option value="mcq">🧩 Code Snippet MCQ - Multiple choice with code options</option>
                      <option value="bugfix">🔧 Bug Fix Mode - Debug and correct the code</option>
                      <option value="ide">💻 IDE Mode - Write complete solution from scratch</option>
                      <option value="compiler">⚙️ Compiler Mode - Test against input/output pairs</option>
                    </select>
                    <p className="text-sm text-purple-700 mt-2">Choose how participants will interact with your code challenge</p>
                  </div>

                  {formData.evaluationMode === 'mcq' && (
                     <div className="space-y-6">
                       {/* Code Snippet Section */}
                       <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                         <div className="flex items-center justify-between mb-4">
                           <label className="block text-lg font-semibold text-gray-800 flex items-center">
                             <Code className="h-5 w-5 mr-2 text-green-600" />
                             Code Snippet *
                           </label>
                           <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
                             <BookOpen className="h-4 w-4 text-green-600" />
                             <span className="text-xs text-green-700 font-medium">Visible to participants</span>
                           </div>
                         </div>

                         {/* Language Selector */}
                         <div className="mb-4">
                           <label className="block text-sm font-medium text-gray-700 mb-2">Programming Language</label>
                           <select
                             value={formData.codeLanguage}
                             onChange={(e) => setFormData(prev => ({ ...prev, codeLanguage: e.target.value }))}
                             className="input w-full py-2 px-3 rounded-lg border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                             aria-label="Select programming language for code snippet"
                             role="combobox"
                           >
                             <option value="javascript">🟨 JavaScript</option>
                             <option value="python">🐍 Python</option>
                             <option value="java">☕ Java</option>
                             <option value="cpp">⚡ C++</option>
                           </select>
                         </div>

                         {/* Code Editor */}
                         <div className="relative">
                           <Editor
                             value={formData.codeSnippet}
                             onValueChange={(code) => {
                               setFormData(prev => ({ ...prev, codeSnippet: code }))
                               if (validationErrors.codeSnippet) {
                                 setValidationErrors(prev => ({ ...prev, codeSnippet: undefined }))
                               }
                             }}
                             highlight={(code) => Prism.highlight(code, getLanguageHighlight(formData.codeLanguage))}
                             padding={20}
                             style={{
                               fontFamily: '"Inconsolata", "Monaco", monospace',
                               fontSize: 14,
                               border: validationErrors.codeSnippet ? '2px solid #ef4444' : '2px solid #e5e7eb',
                               borderRadius: '0.75rem',
                               minHeight: '160px',
                               backgroundColor: '#fafafa',
                               boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                             }}
                             placeholder="Enter the code snippet that participants will analyze..."
                             aria-describedby={validationErrors.codeSnippet ? "codeSnippet-error" : undefined}
                             aria-label="Code snippet editor"
                           />
                           {validationErrors.codeSnippet && (
                             <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
                               <p id="codeSnippet-error" className="text-sm text-red-700 flex items-center font-medium">
                                 <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                                 {validationErrors.codeSnippet}
                               </p>
                             </div>
                           )}
                         </div>
                       </div>

                      {/* Answer Options Section */}
                      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <label className="block text-lg font-semibold text-gray-800 flex items-center">
                            <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
                            Answer Options *
                          </label>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                              {formData.options.filter(o => o.trim()).length}/6 options
                            </span>
                            <button
                              type="button"
                              onClick={addOption}
                              className="btn btn-primary text-sm flex items-center px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={formData.options.length >= 6}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Option
                            </button>
                          </div>
                        </div>

                        {validationErrors.codeOptions && (
                          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
                            <p className="text-sm text-red-700 flex items-center font-medium">
                              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                              {validationErrors.codeOptions}
                            </p>
                          </div>
                        )}

                        <div className="space-y-4">
                          {formData.options.map((option, index) => (
                            <div key={index} className="group flex items-start space-x-4 p-4 border-2 border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200">
                              <span className="text-base font-bold text-blue-600 w-8 mt-3 bg-blue-100 rounded-full flex items-center justify-center h-8">
                                {String.fromCharCode(65 + index)}
                              </span>
                              <div className="flex-1">
                                <Editor
                                  value={option}
                                  onValueChange={(code) => updateOption(index, code)}
                                  highlight={(code) => Prism.highlight(code, getLanguageHighlight(formData.codeLanguage))}
                                  padding={15}
                                  style={{
                                    fontFamily: '"Inconsolata", "Monaco", monospace',
                                    fontSize: 13,
                                    border: '2px solid transparent',
                                    borderRadius: '0.5rem',
                                    minHeight: '80px',
                                    width: '100%',
                                    backgroundColor: '#fafafa',
                                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                                  }}
                                  placeholder={`Enter code option ${String.fromCharCode(65 + index)}`}
                                  aria-label={`Code editor for option ${String.fromCharCode(65 + index)}`}
                                />
                              </div>
                              {formData.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeOption(index)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 mt-3 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                                  aria-label={`Remove option ${String.fromCharCode(65 + index)}`}
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Correct Answer Section */}
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200/50 shadow-sm">
                        <label className="block text-lg font-semibold text-gray-800 mb-4 flex items-center">
                          <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                          Correct Answer *
                        </label>
                        <select
                          value={formData.correctAnswer}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))
                            if (validationErrors.correctAnswer) {
                              setValidationErrors(prev => ({ ...prev, correctAnswer: undefined }))
                            }
                          }}
                          className={`input w-full text-base py-3 px-4 rounded-lg transition-all duration-200 ${
                            validationErrors.correctAnswer
                              ? 'border-red-300 focus:border-red-500 bg-red-50/50'
                              : 'border-green-200 focus:border-green-400 focus:ring-2 focus:ring-green-500/20 bg-white'
                          }`}
                          required
                          aria-label="Select the correct option"
                          aria-describedby={validationErrors.correctAnswer ? "correctAnswer-error" : undefined}
                          role="combobox"
                        >
                          <option value="">Select the correct code option</option>
                          {formData.options.map((option, index) => (
                            option.trim() && (
                              <option key={index} value={option}>
                                {String.fromCharCode(65 + index)}. {option.substring(0, 60)}{option.length > 60 ? '...' : ''}
                              </option>
                            )
                          ))}
                        </select>
                        {validationErrors.correctAnswer && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
                            <p id="correctAnswer-error" className="text-sm text-red-700 flex items-center font-medium">
                              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                              {validationErrors.correctAnswer}
                            </p>
                          </div>
                        )}
                        <p className="text-sm text-green-700 mt-2 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Choose which code option is the correct answer
                        </p>
                      </div>
                    </div>
                  )}

                  {formData.evaluationMode === 'bugfix' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Programming Language
                        </label>
                        <select
                          value={formData.codeLanguage}
                          onChange={(e) => setFormData(prev => ({ ...prev, codeLanguage: e.target.value }))}
                          className="input w-full"
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="cpp">C++</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Buggy Code
                        </label>
                        <Editor
                          value={formData.bugFixCode}
                          onValueChange={(code) => setFormData(prev => ({ ...prev, bugFixCode: code }))}
                          highlight={(code) => Prism.highlight(code, getLanguageHighlight(formData.codeLanguage))}
                          padding={15}
                          style={{
                            fontFamily: '"Inconsolata", "Monaco", monospace',
                            fontSize: 14,
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            minHeight: '200px'
                          }}
                          placeholder="Enter the buggy code that needs to be fixed..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bug Fix Instructions
                        </label>
                        <textarea
                          value={formData.bugFixInstructions}
                          onChange={(e) => setFormData(prev => ({ ...prev, bugFixInstructions: e.target.value }))}
                          className="input w-full h-24 resize-none"
                          placeholder="Describe what the bug is and what needs to be fixed..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expected Fixed Code *
                        </label>
                        <Editor
                          value={formData.correctAnswer}
                          onValueChange={(code) => setFormData(prev => ({ ...prev, correctAnswer: code }))}
                          highlight={(code) => Prism.highlight(code, getLanguageHighlight(formData.codeLanguage))}
                          padding={15}
                          style={{
                            fontFamily: '"Inconsolata", "Monaco", monospace',
                            fontSize: 14,
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            minHeight: '200px'
                          }}
                          placeholder="Enter the correct fixed code..."
                        />
                      </div>
                    </div>
                  )}

                  {formData.evaluationMode === 'ide' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Programming Language
                        </label>
                        <select
                          value={formData.ideLanguage}
                          onChange={(e) => setFormData(prev => ({ ...prev, ideLanguage: e.target.value }))}
                          className="input w-full"
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="cpp">C++</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Code Template/Boilerplate (Optional starter code)
                        </label>
                        <Editor
                          value={formData.codeTemplate}
                          onValueChange={(code) => setFormData(prev => ({ ...prev, codeTemplate: code }))}
                          highlight={(code) => Prism.highlight(code, getLanguageHighlight(formData.ideLanguage))}
                          padding={15}
                          style={{
                            fontFamily: '"Inconsolata", "Monaco", monospace',
                            fontSize: 14,
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            minHeight: '150px'
                          }}
                          placeholder="Enter starter code or template for the IDE..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expected Solution Code *
                        </label>
                        <Editor
                          value={formData.correctAnswer}
                          onValueChange={(code) => setFormData(prev => ({ ...prev, correctAnswer: code }))}
                          highlight={(code) => Prism.highlight(code, getLanguageHighlight(formData.ideLanguage))}
                          padding={15}
                          style={{
                            fontFamily: '"Inconsolata", "Monaco", monospace',
                            fontSize: 14,
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            minHeight: '200px'
                          }}
                          placeholder="Enter the expected complete solution..."
                        />
                      </div>
                    </div>
                  )}

                  {formData.evaluationMode === 'compiler' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Programming Language
                        </label>
                        <select
                          value={formData.codeLanguage}
                          onChange={(e) => setFormData(prev => ({ ...prev, codeLanguage: e.target.value }))}
                          className="input w-full"
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="cpp">C++</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Code Template/Boilerplate (Optional starter code)
                        </label>
                        <Editor
                          value={formData.codeTemplate}
                          onValueChange={(code) => setFormData(prev => ({ ...prev, codeTemplate: code }))}
                          highlight={(code) => Prism.highlight(code, getLanguageHighlight(formData.codeLanguage))}
                          padding={15}
                          style={{
                            fontFamily: '"Inconsolata", "Monaco", monospace',
                            fontSize: 14,
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            minHeight: '150px'
                          }}
                          placeholder="Enter starter code or template for the compiler..."
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Test Cases (Input/Output pairs) *
                          </label>
                          <div className="flex items-center space-x-2">
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                            <span className="text-xs text-gray-500">JSON format required</span>
                          </div>
                        </div>
                        <textarea
                          value={formData.testCases}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, testCases: e.target.value }))
                            if (validationErrors.testCases) {
                              setValidationErrors(prev => ({ ...prev, testCases: undefined }))
                            }
                          }}
                          className={`input w-full h-48 font-mono text-sm resize-none ${validationErrors.testCases ? 'border-red-500 focus:border-red-500' : ''}`}
                          placeholder={`[
 {
   "input": "2 3",
   "expectedOutput": "5",
   "description": "Add two numbers"
 },
 {
   "input": "10 20",
   "expectedOutput": "30",
   "description": "Add larger numbers"
 }
]`}
                          aria-describedby={validationErrors.testCases ? "testCases-error" : undefined}
                        />
                        {validationErrors.testCases && (
                          <p id="testCases-error" className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {validationErrors.testCases}
                          </p>
                        )}
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>💡 Tip:</strong> Each test case should have <code>input</code>, <code>expectedOutput</code>, and optional <code>description</code> fields.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {formData.questionType === 'mcq' && (
                <div className="space-y-6">
                  {/* MCQ Options Section */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-lg font-semibold text-gray-800 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
                        Answer Options
                      </label>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                          {formData.options.filter(o => o.trim()).length}/6 options
                        </span>
                        <button
                          type="button"
                          onClick={addOption}
                          className="btn btn-primary text-sm flex items-center px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={formData.options.length >= 6}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Option
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {formData.options.map((option, index) => (
                        <div key={index} className="group flex items-center space-x-4 p-4 border-2 border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200">
                          <span className="text-base font-bold text-blue-600 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            className="input flex-1 py-3 px-4 rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                            placeholder={`Enter option ${String.fromCharCode(65 + index)}`}
                            aria-label={`Text input for option ${String.fromCharCode(65 + index)}`}
                          />
                          {formData.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                              aria-label={`Remove option ${String.fromCharCode(65 + index)}`}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Correct Answer Selection */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200/50 shadow-sm">
                    <label className="block text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                      Correct Answer *
                    </label>
                    <select
                      value={formData.correctAnswer}
                      onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                      className="input w-full text-base py-1 px-4 rounded-lg border-green-200 focus:border-green-400 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                      required
                    >
                      <option value="">Select the correct option</option>
                      {formData.options.map((option, index) => (
                        option.trim() && (
                          <option key={index} value={option}>
                            {String.fromCharCode(65 + index)}. {option}
                          </option>
                        )
                      ))}
                    </select>
                    {/* <p className="text-sm text-green-700 mt-2 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Choose which option is the correct answer
                    </p> */}
                  </div>
                </div>
              )}

              {formData.questionType === 'multiple_answers' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Options</label>
                    <button
                      type="button"
                      onClick={addOption}
                      className="btn btn-secondary text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Option
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600 w-6">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          className="input flex-1"
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        />
                        {formData.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Correct Answers * (Select all that apply)
                    </label>
                    {validationErrors.correctAnswer && (
                      <p className="mb-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.correctAnswer}
                      </p>
                    )}
                    <div className="space-y-2">
                      {formData.options.map((option, index) => (
                        option.trim() && (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`correct-${index}`}
                              checked={Array.isArray(formData.correctAnswer) && formData.correctAnswer.includes(option)}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setFormData(prev => {
                                  const currentAnswers = Array.isArray(prev.correctAnswer) ? prev.correctAnswer : [];
                                  if (isChecked) {
                                    return { ...prev, correctAnswer: [...currentAnswers, option] };
                                  } else {
                                    return { ...prev, correctAnswer: currentAnswers.filter(ans => ans !== option) };
                                  }
                                });
                                if (validationErrors.correctAnswer) {
                                  setValidationErrors(prev => ({ ...prev, correctAnswer: undefined }));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              aria-label={`Select option ${String.fromCharCode(65 + index)} as correct answer`}
                            />
                            <label htmlFor={`correct-${index}`} className="text-sm text-gray-700">
                              {String.fromCharCode(65 + index)}. {option}
                            </label>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {formData.questionType === 'true_false' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correct Answer *
                  </label>
                  <select
                    value={formData.correctAnswer}
                    onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                    className="input w-full"
                    required
                  >
                    <option value="">Select answer</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                </div>
              )}

              {formData.questionType === 'short_answer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correct Answer (Short Answer) *
                  </label>
                  <input
                    type="text"
                    value={formData.correctAnswer}
                    onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                    className="input w-full"
                    placeholder="Enter the expected short answer..."
                    required
                  />
                </div>
              )}

              {formData.questionType === 'fill_blank' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correct Answer (Fill in the Blank) *
                  </label>
                  <input
                    type="text"
                    value={formData.correctAnswer}
                    onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                    className="input w-full"
                    placeholder="Enter the word/phrase to fill in the blank..."
                    required
                  />
                </div>
              )}

              {formData.questionType === 'image' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Image
                  </label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const formDataUpload = new FormData();
                          formDataUpload.append('image', file);

                          try {
                            const response = await fetch('/api/games/upload-image', {
                              method: 'POST',
                              body: formDataUpload,
                              headers: {
                                'Authorization': `Bearer ${localStorage.getItem('hackarena_token')}`
                              }
                            });
                            const data = await response.json();
                            setFormData(prev => ({ ...prev, imageUrl: data.image_url }));
                          } catch (error) {
                            console.error('Upload failed:', error);
                            toast.error('Failed to upload image');
                          }
                        }
                      }}
                      className="input w-full"
                    />
                    {formData.imageUrl && (
                      <div className="mt-2">
                        <img
                          src={`http://localhost:3001${formData.imageUrl}`}
                          alt="Question"
                          className="max-w-full h-48 object-contain border rounded"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {formData.questionType === 'crossword' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Crossword Configuration
                  </label>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Rows</label>
                        <input
                          type="number"
                          value={formData.crosswordSize.rows}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            crosswordSize: { ...prev.crosswordSize, rows: parseInt(e.target.value) || 10 }
                          }))}
                          className="input w-full"
                          min="5"
                          max="20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Columns</label>
                        <input
                          type="number"
                          value={formData.crosswordSize.cols}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            crosswordSize: { ...prev.crosswordSize, cols: parseInt(e.target.value) || 10 }
                          }))}
                          className="input w-full"
                          min="5"
                          max="20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Clues (JSON format)</label>
                      <textarea
                        value={JSON.stringify(formData.crosswordClues, null, 2)}
                        onChange={(e) => {
                          try {
                            const clues = JSON.parse(e.target.value);
                            setFormData(prev => ({ ...prev, crosswordClues: clues }));
                          } catch (error) {
                            // Invalid JSON, keep current value
                          }
                        }}
                        className="input w-full h-32 font-mono text-sm"
                        placeholder='{"1A": {"word": "EXAMPLE", "clue": "Sample word"}, "1D": {"word": "TEST", "clue": "Trial run"}}'
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Grid Layout (JSON format)</label>
                      <textarea
                        value={JSON.stringify(formData.crosswordGrid, null, 2)}
                        onChange={(e) => {
                          try {
                            const grid = JSON.parse(e.target.value);
                            setFormData(prev => ({ ...prev, crosswordGrid: grid }));
                          } catch (error) {
                            // Invalid JSON, keep current value
                          }
                        }}
                        className="input w-full h-32 font-mono text-sm"
                        placeholder='[["#", "1A", "2A", "#"], ["1D", "#", "#", "2D"]]'
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              {/* Scoring and Timing Settings */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-indigo-600" />
                  Scoring & Timing Configuration
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-blue-600" />
                      Time Limit (seconds)
                    </label>
                    <input
                      type="number"
                      value={formData.timeLimit}
                      onChange={(e) => setFormData(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 60 }))}
                      className="input w-full py-3 px-4 rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-base"
                      min="10"
                      max="300"
                      placeholder="60"
                    />
                    <p className="text-xs text-gray-500">How long participants have to answer</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <Target className="h-4 w-4 mr-1 text-green-600" />
                      Points/Marks
                    </label>
                    <input
                      type="number"
                      value={formData.marks}
                      onChange={(e) => setFormData(prev => ({ ...prev, marks: parseInt(e.target.value) || 10 }))}
                      className="input w-full py-3 px-4 rounded-lg border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 text-base"
                      min="1"
                      max="100"
                      placeholder="10"
                    />
                    <p className="text-xs text-gray-500">Points awarded for correct answer</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1 text-orange-600" />
                      Hint Penalty
                    </label>
                    <input
                      type="number"
                      value={formData.hintPenalty}
                      onChange={(e) => setFormData(prev => ({ ...prev, hintPenalty: parseInt(e.target.value) || 10 }))}
                      className="input w-full py-3 px-4 rounded-lg border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-all duration-200"
                      min="0"
                      max="50"
                      placeholder="10"
                    />
                    <p className="text-xs text-gray-500">Points deducted for using hint</p>
                  </div>
                </div>
              </div>

              {formData.questionType === 'code' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Execution Timeout (ms)
                    </label>
                    <input
                      type="number"
                      value={formData.timeoutLimit}
                      onChange={(e) => setFormData(prev => ({ ...prev, timeoutLimit: parseInt(e.target.value) || 5000 }))}
                      className="input w-full"
                      min="1000"
                      max="30000"
                      step="1000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Memory Limit (MB)
                    </label>
                    <input
                      type="number"
                      value={formData.memoryLimit}
                      onChange={(e) => setFormData(prev => ({ ...prev, memoryLimit: parseInt(e.target.value) || 256 }))}
                      className="input w-full"
                      min="64"
                      max="1024"
                      step="64"
                    />
                  </div>
                </div>
              )}

              {/* Hint and Explanation Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6 border border-amber-200/50 shadow-sm">
                  <label className="block text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <HelpCircle className="h-5 w-5 mr-2 text-amber-600" />
                    Hint (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.hint}
                    onChange={(e) => setFormData(prev => ({ ...prev, hint: e.target.value }))}
                    className="input w-full py-3 px-4 rounded-lg border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all duration-200 text-base"
                    placeholder="Enter a helpful hint for participants..."
                  />
                  <p className="text-sm text-amber-700 mt-2 flex items-center">
                    <HelpCircle className="h-4 w-4 mr-1" />
                    Participants can request this hint during the challenge
                  </p>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-200/50 shadow-sm">
                  <label className="block text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <BookOpen className="h-5 w-5 mr-2 text-teal-600" />
                    Explanation (Optional)
                  </label>
                  <textarea
                    value={formData.explanation}
                    onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
                    className="input w-full h-24 sm:h-28 resize-none py-3 px-4 rounded-lg border-teal-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-all duration-200"
                    placeholder="Explain the correct answer and reasoning..."
                  />
                  <p className="text-sm text-teal-700 mt-2 flex items-center">
                    <BookOpen className="h-4 w-4 mr-1" />
                    Shown to participants after answering
                  </p>
                </div>
              </div>

              {formData.questionType === 'code' && formData.evaluationMode === 'compiler' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Cases (JSON format)
                  </label>
                  <textarea
                    value={formData.testCases}
                    onChange={(e) => setFormData(prev => ({ ...prev, testCases: e.target.value }))}
                    className="input w-full h-32 font-mono text-sm resize-none"
                    placeholder='[{"input": "2 3", "expectedOutput": "5", "description": "Add two numbers"}, {"input": "10 20", "expectedOutput": "30", "description": "Add larger numbers"}]'
                  />
                </div>
              )}

              {formData.questionType === 'code' && formData.evaluationMode === 'textarea' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Validation Settings (Optional)
                  </label>
                  <textarea
                    value={formData.aiValidationSettings}
                    onChange={(e) => setFormData(prev => ({ ...prev, aiValidationSettings: e.target.value }))}
                    className="input w-full h-20 resize-none"
                    placeholder="Additional validation rules or settings..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Enhanced Preview Section */}
          {showPreview && (
            <div className="border-t border-gray-200 pt-8">
              <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-8 border border-gray-200/50 shadow-sm">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Eye className="h-6 w-6 mr-3 text-indigo-600" />
                  Live Question Preview
                  <span className="ml-3 px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                    Participant View
                  </span>
                </h3>
                <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-lg">
                  {/* Question Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                        formData.questionType === 'mcq' ? 'bg-blue-100 text-blue-800' :
                        formData.questionType === 'code' ? 'bg-green-100 text-green-800' :
                        formData.questionType === 'true_false' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {formData.questionType.toUpperCase().replace('_', ' ')}
                      </span>
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                        formData.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        formData.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {formData.difficulty.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formData.timeLimit}s
                      </span>
                      <span className="flex items-center font-semibold text-green-600">
                        <Target className="h-4 w-4 mr-1" />
                        {formData.marks} pts
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <h4 className="text-xl font-semibold text-gray-900 mb-6 leading-relaxed">
                    {formData.questionText || 'Your engaging question will appear here...'}
                  </h4>

                  {/* Code Snippet Display */}
                  {formData.questionType === 'code' && formData.codeSnippet && (
                    <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm mb-6 overflow-x-auto">
                      <pre className="text-green-400">
                        {formData.codeSnippet.substring(0, 300)}{formData.codeSnippet.length > 300 ? '...' : ''}
                      </pre>
                    </div>
                  )}

                  {/* Options Preview */}
                  {formData.options.some(opt => opt.trim()) && (
                    <div className="space-y-3 mb-4">
                      <p className="text-sm font-medium text-gray-700">Answer Options:</p>
                      {formData.options.filter(opt => opt.trim()).map((option, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-bold text-gray-600 w-6">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          <span className="text-sm text-gray-800">{option.substring(0, 100)}{option.length > 100 ? '...' : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preview Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      {formData.options.filter(o => o.trim()).length} options available
                      {formData.questionType === 'multiple_answers' && (
                        <span className="ml-2">• Multiple correct answers allowed</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {formData.hint && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                          Hint available
                        </span>
                      )}
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        Explanation provided
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Question Order Fix */}
          {/* {activeTab === 'settings' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-600 font-semibold">ℹ️</span>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900">Question Ordering</h4>
                  <p className="text-sm text-blue-700">Questions will be numbered sequentially (1, 2, 3...) in the order they are added to the game.</p>
                </div>
              </div>
            </div>
          )} */}

          {/* Enhanced Action Buttons */}
          <div className="flex flex-col gap-4 pt-6 sm:pt-8 border-t border-gray-200 px-4 sm:px-0">
            {validationErrors.submit && (
              <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl animate-fade-in">
                <p className="text-red-800 text-sm flex items-center font-medium">
                  <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                  {validationErrors.submit}
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary flex-1 py-4 text-base sm:text-lg font-bold shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 animate-spin" />
                    {question ? 'Updating Question...' : 'Creating Question...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                    {question ? '✨ Update Question' : '🚀 Create Question'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="btn btn-secondary flex-1 py-4 text-base sm:text-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 border-2 border-gray-200 hover:border-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default QuestionForm