import { AlertTriangle, RefreshCw, Home, Wifi, WifiOff } from 'lucide-react'

const ErrorFallback = ({
  error,
  resetError,
  type = 'general', // general, network, socket, api
  onRetry,
  onGoHome
}) => {
  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: <WifiOff className="h-16 w-16 text-orange-500 mx-auto mb-4" />,
          title: 'Connection Problem',
          message: 'Unable to connect to the game server. Please check your internet connection.',
          actionText: 'Retry Connection'
        }
      case 'socket':
        return {
          icon: <Wifi className="h-16 w-16 text-yellow-500 mx-auto mb-4" />,
          title: 'Game Server Disconnected',
          message: 'Lost connection to the game server. We\'re trying to reconnect automatically.',
          actionText: 'Reconnect Now'
        }
      case 'api':
        return {
          icon: <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />,
          title: 'Server Error',
          message: 'The server encountered an error while processing your request.',
          actionText: 'Try Again'
        }
      default:
        return {
          icon: <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />,
          title: 'Something went wrong',
          message: 'We encountered an unexpected error. Your progress is safe.',
          actionText: 'Try Again'
        }
    }
  }

  const config = getErrorConfig()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="max-w-md w-full">
        <div className="card p-8 text-center">
          <div className="mb-6">
            {config.icon}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {config.title}
            </h1>
            <p className="text-gray-600 mb-4">
              {config.message}
            </p>
          </div>

          <div className="space-y-3">
            {(onRetry || resetError) && (
              <button
                onClick={onRetry || resetError}
                className="btn btn-primary w-full flex items-center justify-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {config.actionText}
              </button>
            )}

            {onGoHome && (
              <button
                onClick={onGoHome}
                className="btn bg-gray-100 text-gray-700 hover:bg-gray-200 w-full flex items-center justify-center"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Home
              </button>
            )}
          </div>

          {process.env.NODE_ENV === 'development' && error && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Error Details (Development)
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                {error.toString()}
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

export default ErrorFallback