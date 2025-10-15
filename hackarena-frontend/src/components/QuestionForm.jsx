import React, { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast';
import { X, Plus, Minus, FileText, Settings, Code, HelpCircle, AlertCircle, CheckCircle, Eye, EyeOff, Loader, Sparkles, BookOpen, Target, Clock, Zap, GripVertical } from 'lucide-react'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/themes/prism.css'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Memoize the SortableOption component to prevent unnecessary re-renders
const SortableOption = React.memo(({ option, index, onUpdate, onRemove, questionType, evaluationMode, codeLanguage, getLanguageHighlight }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `option-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-start space-x-4 p-4 border-2 border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200 ${
        isDragging ? 'shadow-lg bg-white' : ''
      }`}
    >
      <div className="flex items-center space-x-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded transition-colors"
          aria-label={`Drag option ${String.fromCharCode(65 + index)}`}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </button>
        <span className="text-base font-bold text-blue-600 w-8 mt-1 bg-blue-100 rounded-full flex items-center justify-center h-8">
          {String.fromCharCode(65 + index)}
        </span>
      </div>
      <div className="flex-1">
        {questionType === 'code' && evaluationMode === 'mcq' ? (
          <Editor
            value={option}
            onValueChange={(code) => onUpdate(index, code)}
            highlight={(code) => Prism.highlight(code, getLanguageHighlight(codeLanguage))}
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
        ) : (
          <input
            type="text"
            value={option}
            onChange={(e) => onUpdate(index, e.target.value)}
            className="input flex-1 py-3 px-4 rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
            placeholder={`Enter option ${String.fromCharCode(65 + index)}`}
            aria-label={`Text input for option ${String.fromCharCode(65 + index)}`}
          />
        )}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 mt-1 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
          aria-label={`Remove option ${String.fromCharCode(65 + index)}`}
        >
          <Minus className="h-4 w-4" />
        </button>
      )}
    </div>
  )
})

const QuestionForm = ({ question = null, onSave, onCancel }) => {
    const [activeTab, setActiveTab] = useState('basic')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [validationErrors, setValidationErrors] = useState({})
    const [showPreview, setShowPreview] = useState(false)
    const [realTimePreview, setRealTimePreview] = useState(true)

    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    )
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
      // Helper function to safely parse JSON with fallback
      const safeJsonParse = (value, fallback) => {
        if (!value) return fallback;
        if (typeof value === 'object') return value; // Already parsed
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch (e) {
            console.warn('Failed to parse JSON value:', value, e);
            return fallback;
          }
        }
        return fallback;
      };

      setFormData({
        questionText: question.question_text || '',
        questionType: question.question_type || 'mcq',
        codeSnippet: question.code_snippet || '',
        codeLanguage: question.code_language || 'javascript',
        bugFixCode: question.bug_fix_code || '',
        bugFixInstructions: question.bug_fix_instructions || '',
        ideTemplate: question.ide_template || '',
        ideLanguage: question.ide_language || 'javascript',
        options: Array.isArray(question.options) ? question.options : ['', '', '', ''],
        correctAnswer: question.correct_answer ? safeJsonParse(question.correct_answer, '') : '',
        hint: question.hint || '',
        hintPenalty: typeof question.hint_penalty === 'number' ? question.hint_penalty : 10,
        timeLimit: typeof question.time_limit === 'number' ? question.time_limit : 60,
        marks: typeof question.marks === 'number' ? question.marks : 10,
        difficulty: question.difficulty || 'medium',
        explanation: question.explanation || '',
        evaluationMode: question.evaluation_mode || 'mcq',
        testCases: typeof question.test_cases === 'string' ? question.test_cases : '',
        aiValidationSettings: question.ai_validation_settings || '',
        imageUrl: question.image_url || '',
        crosswordGrid: safeJsonParse(question.crossword_grid, []),
        crosswordClues: safeJsonParse(question.crossword_clues, {}),
        crosswordSize: safeJsonParse(question.crossword_size, { rows: 10, cols: 10 }),
        timeoutLimit: typeof question.timeout_limit === 'number' ? question.timeout_limit : 5000,
        memoryLimit: typeof question.memory_limit === 'number' ? question.memory_limit : 256,
        codeTemplate: question.code_template || ''
      })
    }
  }, [question])

  const validateForm = useCallback(() => {
    const errors = {}

    // Basic validation with enhanced messages
    if (!formData.questionText.trim()) {
      errors.questionText = 'Question text is required. Please enter a clear, engaging question.'
    } else if (formData.questionText.trim().length < 10) {
      errors.questionText = 'Question text is too short. Please provide a more detailed question (at least 10 characters).'
    } else if (formData.questionText.trim().length > 1000) {
      errors.questionText = 'Question text is too long. Please keep it under 1000 characters.'
    }

    if (formData.questionType === 'mcq' && formData.options.filter(opt => opt.trim()).length < 2) {
      errors.options = 'At least 2 options are required for MCQ. Add more answer choices to make the question challenging.'
    }

    if (formData.questionType === 'fill_blank' && !formData.correctAnswer.trim()) {
      errors.correctAnswer = 'Correct answer is required for Fill in the Blank. Specify the expected word or phrase.'
    }

    if (formData.questionType === 'multiple_answers') {
      if (formData.options.filter(opt => opt.trim()).length < 2) {
        errors.options = 'At least 2 options are required for Multiple Answers. Provide multiple choices for participants.'
      }
      if (!Array.isArray(formData.correctAnswer) || formData.correctAnswer.length === 0) {
        errors.correctAnswer = 'At least one correct answer must be selected for Multiple Answers. Check the boxes for correct options.'
      }
    }

    if (formData.questionType === 'code') {
      if (formData.evaluationMode === 'mcq') {
        if (!formData.codeSnippet.trim()) {
          errors.codeSnippet = 'Code snippet is required for Code Snippet MCQ. Provide the code that participants will analyze.'
        } else if (formData.codeSnippet.trim().length > 10000) {
          errors.codeSnippet = 'Code snippet is too long. Please keep it under 10,000 characters.'
        }
        if (formData.options.filter(opt => opt.trim()).length < 2) {
          errors.codeOptions = 'At least 2 code options are required. Create different code choices for participants to select from.'
        }
        if (!formData.correctAnswer.trim()) {
          errors.correctAnswer = 'Correct answer must be selected. Choose which code option is the right answer.'
        }
      } else if (formData.evaluationMode === 'bugfix') {
        if (!formData.bugFixCode.trim()) {
          errors.bugFixCode = 'Buggy code is required for Bug Fix Mode. Provide the code with intentional errors.'
        } else if (formData.bugFixCode.trim().length > 10000) {
          errors.bugFixCode = 'Buggy code is too long. Please keep it under 10,000 characters.'
        }
        if (!formData.correctAnswer.trim()) {
          errors.correctAnswer = 'Expected fixed code is required. Show the corrected version of the code.'
        } else if (formData.correctAnswer.trim().length > 10000) {
          errors.correctAnswer = 'Fixed code is too long. Please keep it under 10,000 characters.'
        }
      } else if (formData.evaluationMode === 'ide') {
        if (!formData.correctAnswer.trim()) {
          errors.correctAnswer = 'Expected solution code is required for IDE Mode. Provide the complete working solution.'
        } else if (formData.correctAnswer.trim().length > 50000) {
          errors.correctAnswer = 'Solution code is too long. Please keep it under 50,000 characters.'
        }
      } else if (formData.evaluationMode === 'compiler') {
        if (!formData.testCases.trim()) {
          errors.testCases = 'Test cases are required for compiler evaluation. Define input/output pairs to validate solutions.'
        } else {
          try {
            const testCases = JSON.parse(formData.testCases)
            if (!Array.isArray(testCases) || testCases.length === 0) {
              errors.testCases = 'Test cases must be a non-empty array. Add at least one test case to evaluate code.'
            } else if (testCases.length > 20) {
              errors.testCases = 'Too many test cases. Please limit to 20 test cases maximum.'
            } else {
              for (let i = 0; i < testCases.length; i++) {
                const testCase = testCases[i]
                if (!testCase.input || !testCase.expectedOutput) {
                  errors.testCases = `Test case ${i + 1} must have both 'input' and 'expectedOutput' fields. Each test case needs sample input and expected result.`
                  break
                }
                if (typeof testCase.input !== 'string' || typeof testCase.expectedOutput !== 'string') {
                  errors.testCases = `Test case ${i + 1} must have string values for 'input' and 'expectedOutput'.`
                  break
                }
                if (testCase.input.length > 1000 || testCase.expectedOutput.length > 1000) {
                  errors.testCases = `Test case ${i + 1} input or output is too long. Please keep each under 1000 characters.`
                  break
                }
              }
            }
          } catch (error) {
            errors.testCases = 'Test cases must be valid JSON. Check your JSON syntax and ensure it\'s properly formatted.'
          }
        }
      }
    }

    if (formData.questionType === 'image' && !formData.imageUrl) {
      errors.imageUrl = 'Please upload an image for image-based questions. Select an image file to include with your question.'
    }

    if (formData.questionType === 'crossword') {
      if (!formData.crosswordGrid || formData.crosswordGrid.length === 0) {
        errors.crosswordGrid = 'Crossword grid is required. Define the crossword puzzle layout.'
      }
      if (!formData.crosswordClues || Object.keys(formData.crosswordClues).length === 0) {
        errors.crosswordClues = 'Crossword clues are required. Provide hints for each crossword entry.'
      }
    }

    // Check for other question types that require correct answer
    if (['mcq', 'true_false', 'fill_blank'].includes(formData.questionType) && !formData.correctAnswer.trim()) {
      errors.correctAnswer = 'Correct answer is required. Please specify the right answer for this question type.'
    }

    // Validate time limits
    if (formData.timeLimit < 10 || formData.timeLimit > 300) {
      errors.timeLimit = 'Time limit must be between 10 and 300 seconds.'
    }

    // Validate marks
    if (formData.marks < 1 || formData.marks > 100) {
      errors.marks = 'Points must be between 1 and 100.'
    }

    // Validate hint penalty
    if (formData.hintPenalty < 0 || formData.hintPenalty > 50) {
      errors.hintPenalty = 'Hint penalty must be between 0 and 50 points.'
    }

    return errors
  }, [formData])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()

    // Prevent double submission
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setValidationErrors({})

    const errors = validateForm()
    setValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      // Find the first tab with errors and switch to it
      const errorFields = Object.keys(errors)
      if (errorFields.includes('questionText') || errorFields.includes('questionType') || errorFields.includes('difficulty')) {
        setActiveTab('basic')
      } else {
        setActiveTab('content')
      }

      // Scroll to the first error field for better UX
      setTimeout(() => {
        const firstErrorField = Object.keys(errors)[0]
        const errorElement = document.querySelector(`[data-error="${firstErrorField}"]`) ||
                            document.querySelector(`#${firstErrorField}-error`) ||
                            document.querySelector(`[aria-describedby*="${firstErrorField}"]`)
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)

      setIsSubmitting(false)
      return
    }

    try {
      await onSave(formData)
      toast.success(question ? 'Question updated successfully!' : 'Question created successfully!')
    } catch (error) {
      console.error('Error saving question:', error)

      let errorMessage = 'Failed to save question. Please try again.'

      if (error.response) {
        // Server responded with error status
        if (error.response.status === 400) {
          errorMessage = 'Invalid question data. Please check your inputs and try again.'
        } else if (error.response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.'
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have permission to save questions.'
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again in a few moments.'
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error. Please check your connection and try again.'
      }

      setValidationErrors({ submit: errorMessage })
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, onSave, validateForm, isSubmitting])

  const addOption = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }))
  }, [])

  const removeOption = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }))
  }, [])

  const updateOption = useCallback((index, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }))
  }, [])

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setFormData((prev) => {
        const oldIndex = prev.options.findIndex((_, index) => `option-${index}` === active.id)
        const newIndex = prev.options.findIndex((_, index) => `option-${index}` === over.id)

        return {
          ...prev,
          options: arrayMove(prev.options, oldIndex, newIndex),
        }
      })
    }
  }, [])


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
                  data-error="questionText"
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
                        correctAnswer: newType === 'multiple_answers' ? [] : '',
                        // Reset evaluation mode for code questions
                        evaluationMode: newType === 'code' ? 'mcq' : prev.evaluationMode,
                        // Clear code-specific fields when not code type
                        codeSnippet: newType !== 'code' ? '' : prev.codeSnippet,
                        codeLanguage: newType !== 'code' ? 'javascript' : prev.codeLanguage,
                        bugFixCode: newType !== 'code' ? '' : prev.bugFixCode,
                        bugFixInstructions: newType !== 'code' ? '' : prev.bugFixInstructions,
                        ideTemplate: newType !== 'code' ? '' : prev.ideTemplate,
                        ideLanguage: newType !== 'code' ? 'javascript' : prev.ideLanguage,
                        testCases: newType !== 'code' ? '' : prev.testCases,
                        codeTemplate: newType !== 'code' ? '' : prev.codeTemplate,
                        // Clear crossword fields when not crossword
                        crosswordGrid: newType !== 'crossword' ? [] : prev.crosswordGrid,
                        crosswordClues: newType !== 'crossword' ? {} : prev.crosswordClues,
                        crosswordSize: newType !== 'crossword' ? { rows: 10, cols: 10 } : prev.crosswordSize,
                        // Clear image URL when not image type
                        imageUrl: newType !== 'image' ? '' : prev.imageUrl
                      }));
                      // Clear validation errors for changed fields
                      setValidationErrors(prev => ({
                        ...prev,
                        questionType: undefined,
                        correctAnswer: undefined,
                        codeSnippet: undefined,
                        bugFixCode: undefined,
                        testCases: undefined,
                        crosswordGrid: undefined,
                        crosswordClues: undefined,
                        imageUrl: undefined
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
                      <p className="font-semibold text-blue-900 text-lg">Real-time Preview</p>
                      <p className="text-sm text-blue-700">See live updates as you build your question</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      realTimePreview ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {realTimePreview ? 'Auto' : 'Manual'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRealTimePreview(!realTimePreview)}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 shadow-md ${
                        realTimePreview ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-300'
                      }`}
                      aria-label={realTimePreview ? "Switch to manual preview" : "Switch to auto preview"}
                      aria-pressed={realTimePreview}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-all duration-300 ${
                          realTimePreview ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-white/80 rounded-lg border border-blue-200/30">
                  <p className="text-sm text-blue-800 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {realTimePreview
                      ? 'Real-time preview active - changes appear instantly below'
                      : 'Manual preview - toggle below to see changes'
                    }
                  </p>
                </div>
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
                      onChange={(e) => {
                        const newMode = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          evaluationMode: newMode,
                          // Reset fields based on new evaluation mode
                          correctAnswer: newMode === 'bugfix' || newMode === 'ide' ? '' : prev.correctAnswer,
                          testCases: newMode === 'compiler' ? prev.testCases : '',
                          codeTemplate: newMode === 'ide' || newMode === 'compiler' ? prev.codeTemplate : '',
                          ideTemplate: newMode === 'ide' ? prev.ideTemplate : '',
                          ideLanguage: newMode === 'ide' ? prev.ideLanguage : 'javascript',
                          bugFixCode: newMode === 'bugfix' ? prev.bugFixCode : '',
                          bugFixInstructions: newMode === 'bugfix' ? prev.bugFixInstructions : ''
                        }));
                        // Clear validation errors for changed fields
                        setValidationErrors(prev => ({
                          ...prev,
                          correctAnswer: undefined,
                          testCases: undefined,
                          codeSnippet: undefined,
                          bugFixCode: undefined
                        }));
                      }}
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

                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={formData.options.map((_, index) => `option-${index}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-4">
                              {formData.options.map((option, index) => (
                                <SortableOption
                                  key={index}
                                  option={option}
                                  index={index}
                                  onUpdate={updateOption}
                                  onRemove={formData.options.length > 2 ? removeOption : null}
                                  questionType={formData.questionType}
                                  evaluationMode={formData.evaluationMode}
                                  codeLanguage={formData.codeLanguage}
                                  getLanguageHighlight={getLanguageHighlight}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
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
                            const value = e.target.value;
                            setFormData(prev => ({ ...prev, testCases: value }));

                            // Real-time JSON validation with user feedback
                            if (value.trim()) {
                              try {
                                const testCases = JSON.parse(value);
                                if (!Array.isArray(testCases)) {
                                  setValidationErrors(prev => ({
                                    ...prev,
                                    testCases: 'Test cases must be an array of objects.'
                                  }));
                                } else if (testCases.length === 0) {
                                  setValidationErrors(prev => ({
                                    ...prev,
                                    testCases: 'At least one test case is required.'
                                  }));
                                } else if (testCases.length > 20) {
                                  setValidationErrors(prev => ({
                                    ...prev,
                                    testCases: 'Maximum 20 test cases allowed.'
                                  }));
                                } else {
                                  // Validate each test case
                                  let isValid = true;
                                  for (let i = 0; i < testCases.length; i++) {
                                    const testCase = testCases[i];
                                    if (typeof testCase !== 'object' || testCase === null) {
                                      setValidationErrors(prev => ({
                                        ...prev,
                                        testCases: `Test case ${i + 1} must be an object.`
                                      }));
                                      isValid = false;
                                      break;
                                    }
                                    if (!('input' in testCase) || !('expectedOutput' in testCase)) {
                                      setValidationErrors(prev => ({
                                        ...prev,
                                        testCases: `Test case ${i + 1} must have both 'input' and 'expectedOutput' fields.`
                                      }));
                                      isValid = false;
                                      break;
                                    }
                                    if (typeof testCase.input !== 'string' || typeof testCase.expectedOutput !== 'string') {
                                      setValidationErrors(prev => ({
                                        ...prev,
                                        testCases: `Test case ${i + 1} input and expectedOutput must be strings.`
                                      }));
                                      isValid = false;
                                      break;
                                    }
                                    if (testCase.input.length > 1000 || testCase.expectedOutput.length > 1000) {
                                      setValidationErrors(prev => ({
                                        ...prev,
                                        testCases: `Test case ${i + 1} input or output exceeds 1000 characters.`
                                      }));
                                      isValid = false;
                                      break;
                                    }
                                  }
                                  if (isValid) {
                                    setValidationErrors(prev => ({ ...prev, testCases: undefined }));
                                  }
                                }
                              } catch (error) {
                                setValidationErrors(prev => ({
                                  ...prev,
                                  testCases: 'Invalid JSON format. Please check your syntax.'
                                }));
                              }
                            } else {
                              setValidationErrors(prev => ({ ...prev, testCases: undefined }));
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

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={formData.options.map((_, index) => `option-${index}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-4">
                          {formData.options.map((option, index) => (
                            <SortableOption
                              key={index}
                              option={option}
                              index={index}
                              onUpdate={updateOption}
                              onRemove={formData.options.length > 2 ? removeOption : null}
                              questionType={formData.questionType}
                              evaluationMode={formData.evaluationMode}
                              codeLanguage={formData.codeLanguage}
                              getLanguageHighlight={getLanguageHighlight}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
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
                      disabled={isSubmitting}
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          // Validate file type
                          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                          if (!allowedTypes.includes(file.type)) {
                            toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
                            return;
                          }

                          // Validate file size (5MB limit)
                          const maxSize = 5 * 1024 * 1024; // 5MB
                          if (file.size > maxSize) {
                            toast.error('Image file size must be less than 5MB');
                            return;
                          }

                          const formDataUpload = new FormData();
                          formDataUpload.append('image', file);

                          const uploadImage = async (retryCount = 0) => {
                            try {
                              setIsSubmitting(true);
                              const response = await fetch(`${import.meta.env.VITE_API_URL}/api/games/upload-image`, {
                                method: 'POST',
                                body: formDataUpload,
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('hackarena_token')}`
                                }
                              });

                              if (!response.ok) {
                                const errorData = await response.json().catch(() => ({}));
                                throw new Error(errorData.message || `Upload failed with status ${response.status}`);
                              }

                              const data = await response.json();
                              if (!data.image_url) {
                                throw new Error('Invalid response: missing image URL');
                              }

                              setFormData(prev => ({ ...prev, imageUrl: data.image_url }));
                              toast.success('Image uploaded successfully!');
                            } catch (error) {
                              console.error('Upload failed:', error);

                              // Retry logic for network errors
                              if ((error.name === 'TypeError' && error.message.includes('fetch')) ||
                                  error.message.includes('NetworkError') ||
                                  error.message.includes('Failed to fetch')) {

                                if (retryCount < 3) {
                                  console.log(`Retrying image upload (${retryCount + 1}/3) in 2 seconds...`);
                                  toast.info(`Upload failed, retrying... (${retryCount + 1}/3)`);
                                  setTimeout(() => uploadImage(retryCount + 1), 2000);
                                  return;
                                }
                              }

                              // Show appropriate error message
                              if (error.name === 'TypeError' && error.message.includes('fetch')) {
                                toast.error('Network error: Please check your connection and try again');
                              } else if (error.message.includes('413')) {
                                toast.error('Image file is too large. Please choose a smaller image (max 5MB)');
                              } else if (error.message.includes('415')) {
                                toast.error('Invalid file type. Please select a valid image file');
                              } else {
                                toast.error(`Upload failed: ${error.message}`);
                              }
                            } finally {
                              setIsSubmitting(false);
                            }
                          };

                          uploadImage();
                        }
                      }}
                      className="input w-full"
                    />
                    {formData.imageUrl && (
                      <div className="mt-2">
                        {isSubmitting ? (
                          <div className="flex items-center justify-center h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
                            <div className="text-center">
                              <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">Uploading image...</p>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={`${import.meta.env.VITE_API_URL}${formData.imageUrl}`}
                            alt="Question"
                            className="max-w-full h-48 object-contain border rounded"
                            onError={(e) => {
                              console.error('Failed to load uploaded image');
                              e.target.style.display = 'none';
                              toast.error('Failed to load uploaded image');
                            }}
                          />
                        )}
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
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 10;
                            setFormData(prev => ({
                              ...prev,
                              crosswordSize: { ...prev.crosswordSize, rows: value }
                            }));
                            // Real-time validation
                            if (value < 5 || value > 20) {
                              setValidationErrors(prev => ({
                                ...prev,
                                crosswordSize: 'Crossword dimensions must be between 5 and 20.'
                              }));
                            } else {
                              setValidationErrors(prev => ({ ...prev, crosswordSize: undefined }));
                            }
                          }}
                          className={`input w-full ${
                            validationErrors.crosswordSize ? 'border-red-500' : ''
                          }`}
                          min="5"
                          max="20"
                          aria-describedby={validationErrors.crosswordSize ? "crosswordSize-error" : undefined}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Columns</label>
                        <input
                          type="number"
                          value={formData.crosswordSize.cols}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 10;
                            setFormData(prev => ({
                              ...prev,
                              crosswordSize: { ...prev.crosswordSize, cols: value }
                            }));
                            // Real-time validation
                            if (value < 5 || value > 20) {
                              setValidationErrors(prev => ({
                                ...prev,
                                crosswordSize: 'Crossword dimensions must be between 5 and 20.'
                              }));
                            } else {
                              setValidationErrors(prev => ({ ...prev, crosswordSize: undefined }));
                            }
                          }}
                          className={`input w-full ${
                            validationErrors.crosswordSize ? 'border-red-500' : ''
                          }`}
                          min="5"
                          max="20"
                          aria-describedby={validationErrors.crosswordSize ? "crosswordSize-error" : undefined}
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
                            if (validationErrors.crosswordClues) {
                              setValidationErrors(prev => ({ ...prev, crosswordClues: undefined }));
                            }
                          } catch (error) {
                            // Show user-friendly error message
                            toast.error('Invalid JSON format for crossword clues. Please check your syntax.');
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
                            if (validationErrors.crosswordGrid) {
                              setValidationErrors(prev => ({ ...prev, crosswordGrid: undefined }));
                            }
                          } catch (error) {
                            // Show user-friendly error message
                            toast.error('Invalid JSON format for crossword grid. Please check your syntax.');
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
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 60;
                        setFormData(prev => ({ ...prev, timeLimit: value }));
                        // Real-time validation
                        if (value < 10 || value > 300) {
                          setValidationErrors(prev => ({
                            ...prev,
                            timeLimit: 'Time limit must be between 10 and 300 seconds.'
                          }));
                        } else {
                          setValidationErrors(prev => ({ ...prev, timeLimit: undefined }));
                        }
                      }}
                      className={`input w-full py-3 px-4 rounded-lg transition-all duration-200 text-base ${
                        validationErrors.timeLimit
                          ? 'border-red-300 focus:border-red-500 bg-red-50/50'
                          : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20'
                      }`}
                      min="10"
                      max="300"
                      placeholder="60"
                      aria-describedby={validationErrors.timeLimit ? "timeLimit-error" : undefined}
                    />
                    {validationErrors.timeLimit && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p id="timeLimit-error" className="text-sm text-red-700 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                          {validationErrors.timeLimit}
                        </p>
                      </div>
                    )}
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
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 10;
                        setFormData(prev => ({ ...prev, marks: value }));
                        // Real-time validation
                        if (value < 1 || value > 100) {
                          setValidationErrors(prev => ({
                            ...prev,
                            marks: 'Points must be between 1 and 100.'
                          }));
                        } else {
                          setValidationErrors(prev => ({ ...prev, marks: undefined }));
                        }
                      }}
                      className={`input w-full py-3 px-4 rounded-lg transition-all duration-200 text-base ${
                        validationErrors.marks
                          ? 'border-red-300 focus:border-red-500 bg-red-50/50'
                          : 'border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-500/20'
                      }`}
                      min="1"
                      max="100"
                      placeholder="10"
                      aria-describedby={validationErrors.marks ? "marks-error" : undefined}
                    />
                    {validationErrors.marks && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p id="marks-error" className="text-sm text-red-700 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                          {validationErrors.marks}
                        </p>
                      </div>
                    )}
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
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 10;
                        setFormData(prev => ({ ...prev, hintPenalty: value }));
                        // Real-time validation
                        if (value < 0 || value > 50) {
                          setValidationErrors(prev => ({
                            ...prev,
                            hintPenalty: 'Hint penalty must be between 0 and 50 points.'
                          }));
                        } else {
                          setValidationErrors(prev => ({ ...prev, hintPenalty: undefined }));
                        }
                      }}
                      className={`input w-full py-3 px-4 rounded-lg transition-all duration-200 ${
                        validationErrors.hintPenalty
                          ? 'border-red-300 focus:border-red-500 bg-red-50/50'
                          : 'border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20'
                      }`}
                      min="0"
                      max="50"
                      placeholder="10"
                      aria-describedby={validationErrors.hintPenalty ? "hintPenalty-error" : undefined}
                    />
                    {validationErrors.hintPenalty && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <p id="hintPenalty-error" className="text-sm text-red-700 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                          {validationErrors.hintPenalty}
                        </p>
                      </div>
                    )}
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
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 5000;
                        setFormData(prev => ({ ...prev, timeoutLimit: value }));
                        // Real-time validation
                        if (value < 1000 || value > 30000) {
                          setValidationErrors(prev => ({
                            ...prev,
                            timeoutLimit: 'Timeout must be between 1000 and 30000 milliseconds.'
                          }));
                        } else {
                          setValidationErrors(prev => ({ ...prev, timeoutLimit: undefined }));
                        }
                      }}
                      className={`input w-full ${
                        validationErrors.timeoutLimit ? 'border-red-500' : ''
                      }`}
                      min="1000"
                      max="30000"
                      step="1000"
                      aria-describedby={validationErrors.timeoutLimit ? "timeoutLimit-error" : undefined}
                    />
                    {validationErrors.timeoutLimit && (
                      <p id="timeoutLimit-error" className="mt-1 text-sm text-red-600">
                        {validationErrors.timeoutLimit}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Memory Limit (MB)
                    </label>
                    <input
                      type="number"
                      value={formData.memoryLimit}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 256;
                        setFormData(prev => ({ ...prev, memoryLimit: value }));
                        // Real-time validation
                        if (value < 64 || value > 1024) {
                          setValidationErrors(prev => ({
                            ...prev,
                            memoryLimit: 'Memory limit must be between 64 and 1024 MB.'
                          }));
                        } else {
                          setValidationErrors(prev => ({ ...prev, memoryLimit: undefined }));
                        }
                      }}
                      className={`input w-full ${
                        validationErrors.memoryLimit ? 'border-red-500' : ''
                      }`}
                      min="64"
                      max="1024"
                      step="64"
                      aria-describedby={validationErrors.memoryLimit ? "memoryLimit-error" : undefined}
                    />
                    {validationErrors.memoryLimit && (
                      <p id="memoryLimit-error" className="mt-1 text-sm text-red-600">
                        {validationErrors.memoryLimit}
                      </p>
                    )}
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
          {(showPreview || realTimePreview) && (
            <div className="border-t border-gray-200 pt-8">
              <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-8 border border-gray-200/50 shadow-sm animate-fade-in">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Eye className="h-6 w-6 mr-3 text-indigo-600 animate-pulse" />
                  {realTimePreview ? 'Live Question Preview' : 'Question Preview'}
                  <span className="ml-3 px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                    Participant View
                  </span>
                  {realTimePreview && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full animate-bounce">
                      Auto-updating
                    </span>
                  )}
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
                      <p className="text-sm font-medium text-gray-700 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Answer Options ({formData.options.filter(opt => opt.trim()).length}):
                      </p>
                      {formData.options.filter(opt => opt.trim()).map((option, index) => (
                        <div key={index} className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                          formData.correctAnswer === option ||
                          (Array.isArray(formData.correctAnswer) && formData.correctAnswer.includes(option))
                            ? 'bg-green-50 border-2 border-green-200'
                            : 'bg-gray-50'
                        }`}>
                          <span className={`text-sm font-bold w-6 rounded-full flex items-center justify-center h-6 ${
                            formData.correctAnswer === option ||
                            (Array.isArray(formData.correctAnswer) && formData.correctAnswer.includes(option))
                              ? 'bg-green-600 text-white'
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="text-sm text-gray-800 flex-1">{option.substring(0, 100)}{option.length > 100 ? '...' : ''}</span>
                          {formData.correctAnswer === option ||
                           (Array.isArray(formData.correctAnswer) && formData.correctAnswer.includes(option)) && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
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