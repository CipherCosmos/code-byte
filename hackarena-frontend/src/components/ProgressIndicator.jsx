import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react'

const ProgressIndicator = ({
  isLoading = false,
  progress = 0,
  message = '',
  type = 'spinner', // spinner, progress, steps
  steps = [],
  currentStep = 0,
  size = 'default',
  showPercentage = false,
  autoHide = false,
  duration = 3000
}) => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (autoHide && !isLoading) {
      const timer = setTimeout(() => setVisible(false), duration)
      return () => clearTimeout(timer)
    }
  }, [isLoading, autoHide, duration])

  if (!visible) return null

  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-6 w-6',
    large: 'h-8 w-8'
  }

  const renderSpinner = () => (
    <div className="flex flex-col items-center justify-center space-y-3 p-4">
      <div className="relative">
        <Loader2 className={`animate-spin text-dsba-navy ${sizeClasses[size]}`} />
        {showPercentage && progress > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-dsba-navy">{Math.round(progress)}%</span>
          </div>
        )}
      </div>
      {message && (
        <p className="text-sm text-gray-600 text-center max-w-xs">{message}</p>
      )}
    </div>
  )

  const renderProgressBar = () => (
    <div className="w-full max-w-md space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{message}</span>
        {showPercentage && (
          <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-dsba-navy h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )

  const renderSteps = () => (
    <div className="w-full max-w-lg space-y-4">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isPending = index > currentStep

        return (
          <div key={index} className="flex items-center space-x-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              isCompleted
                ? 'bg-green-100 text-green-600'
                : isCurrent
                ? 'bg-dsba-navy text-white animate-pulse'
                : 'bg-gray-100 text-gray-400'
            }`}>
              {isCompleted ? (
                <CheckCircle className="h-4 w-4" />
              ) : isCurrent ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                isCompleted
                  ? 'text-green-600'
                  : isCurrent
                  ? 'text-dsba-navy'
                  : 'text-gray-400'
              }`}>
                {step.title}
              </p>
              {step.description && (
                <p className="text-xs text-gray-500 mt-1">{step.description}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  if (type === 'progress') {
    return renderProgressBar()
  }

  if (type === 'steps') {
    return renderSteps()
  }

  return renderSpinner()
}

// Specialized progress indicators
export const LoadingButton = ({
  loading,
  children,
  loadingText = 'Loading...',
  className = '',
  ...props
}) => (
  <button
    disabled={loading}
    className={`btn btn-primary flex items-center justify-center ${className}`}
    {...props}
  >
    {loading ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        {loadingText}
      </>
    ) : (
      children
    )}
  </button>
)

export const InlineLoader = ({
  loading,
  message = 'Loading...',
  size = 'small'
}) => {
  if (!loading) return null

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <Loader2 className={`animate-spin ${size === 'small' ? 'h-3 w-3' : 'h-4 w-4'}`} />
      <span>{message}</span>
    </div>
  )
}

export const PageLoader = ({
  message = 'Loading page...',
  fullScreen = false
}) => (
  <div className={`flex items-center justify-center ${fullScreen ? 'min-h-screen' : 'min-h-[400px]'}`}>
    <ProgressIndicator
      isLoading={true}
      message={message}
      size="large"
    />
  </div>
)

export const UploadProgress = ({
  progress,
  fileName,
  isUploading
}) => (
  <div className="w-full space-y-2">
    <div className="flex justify-between text-sm">
      <span className="text-gray-700 truncate">{fileName}</span>
      <span className="text-gray-500">{Math.round(progress)}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-dsba-navy h-2 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
    {isUploading && (
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Uploading...</span>
      </div>
    )}
  </div>
)

export default ProgressIndicator