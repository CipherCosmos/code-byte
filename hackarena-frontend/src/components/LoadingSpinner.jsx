import { Loader2 } from 'lucide-react'

const LoadingSpinner = ({ message = 'Loading...', size = 'default' }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-8 w-8',
    large: 'h-12 w-12'
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] space-y-6">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-dsba-navy to-blue-600 rounded-full blur-lg opacity-30 animate-pulse"></div>
        <Loader2 className={`animate-spin text-dsba-navy relative z-10 ${sizeClasses[size]}`} />
      </div>
      <div className="text-center space-y-2">
        <p className="text-gray-700 text-base font-semibold">{message}</p>
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-dsba-navy rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-dsba-navy rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-dsba-navy rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  )
}

export default LoadingSpinner