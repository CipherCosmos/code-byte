import { useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { AlertTriangle, CheckCircle, Info, XCircle, Wifi, WifiOff } from 'lucide-react'

// Enhanced toast configuration with better UX
const toastConfig = {
  duration: 4000,
  position: 'top-right',
  style: {
    background: '#ffffff',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    fontSize: '14px',
    fontWeight: '500',
    padding: '12px 16px',
    maxWidth: '400px'
  },
  success: {
    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
    style: {
      borderColor: '#d1fae5',
      background: '#f0fdf4'
    }
  },
  error: {
    icon: <XCircle className="h-5 w-5 text-red-500" />,
    style: {
      borderColor: '#fee2e2',
      background: '#fef2f2'
    },
    duration: 6000 // Errors stay longer
  },
  info: {
    icon: <Info className="h-5 w-5 text-blue-500" />,
    style: {
      borderColor: '#dbeafe',
      background: '#eff6ff'
    }
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    style: {
      borderColor: '#fef3c7',
      background: '#fffbeb'
    }
  },
  network: {
    icon: <WifiOff className="h-5 w-5 text-orange-500" />,
    style: {
      borderColor: '#fed7aa',
      background: '#fff7ed'
    },
    duration: 8000
  }
}

// Enhanced toast functions with better messaging
export const showSuccessToast = (message, options = {}) => {
  const enhancedMessage = message.startsWith('✅') || message.startsWith('🎉') ? message : `✅ ${message}`
  return toast.success(enhancedMessage, { ...toastConfig.success, ...options })
}

export const showErrorToast = (message, options = {}) => {
  let enhancedMessage = message

  // Add actionable suggestions for common errors
  if (message.includes('Failed to join game')) {
    enhancedMessage = `${message}. Check your game code and try again.`
  } else if (message.includes('Network error')) {
    enhancedMessage = `${message}. Check your internet connection.`
  } else if (message.includes('Session expired')) {
    enhancedMessage = `${message}. Please join the game again.`
  } else if (message.includes('Server error')) {
    enhancedMessage = `${message}. Our team has been notified. Please try again in a moment.`
  } else if (!message.startsWith('❌') && !message.startsWith('🔧')) {
    enhancedMessage = `❌ ${message}`
  }

  return toast.error(enhancedMessage, { ...toastConfig.error, ...options })
}

export const showInfoToast = (message, options = {}) => {
  const enhancedMessage = message.startsWith('ℹ️') ? message : `ℹ️ ${message}`
  return toast(enhancedMessage, { ...toastConfig.info, ...options })
}

export const showWarningToast = (message, options = {}) => {
  const enhancedMessage = message.startsWith('⚠️') ? message : `⚠️ ${message}`
  return toast(message, { ...toastConfig.warning, ...options })
}

export const showNetworkToast = (message, options = {}) => {
  const enhancedMessage = message.startsWith('🌐') ? message : `🌐 ${message}`
  return toast(enhancedMessage, { ...toastConfig.network, ...options })
}

// Progress toast for long operations
export const showProgressToast = (message, promise, options = {}) => {
  return toast.promise(promise, {
    loading: `⏳ ${message}...`,
    success: (data) => `✅ ${data?.message || 'Completed successfully!'}`,
    error: (err) => `❌ ${err?.message || 'Operation failed'}`,
  }, {
    ...toastConfig,
    ...options,
    success: { ...toastConfig.success, ...options.success },
    error: { ...toastConfig.error, ...options.error },
    loading: {
      style: {
        ...toastConfig.style,
        borderColor: '#dbeafe',
        background: '#eff6ff'
      }
    }
  })
}

// Toast Manager Component
const ToastManager = () => {
  useEffect(() => {
    // Override default toast functions globally
    window.showSuccessToast = showSuccessToast
    window.showErrorToast = showErrorToast
    window.showInfoToast = showInfoToast
    window.showWarningToast = showWarningToast
    window.showNetworkToast = showNetworkToast
    window.showProgressToast = showProgressToast

    return () => {
      // Cleanup
      delete window.showSuccessToast
      delete window.showErrorToast
      delete window.showInfoToast
      delete window.showWarningToast
      delete window.showNetworkToast
      delete window.showProgressToast
    }
  }, [])

  return (
    <Toaster
      position="top-right"
      toastOptions={toastConfig}
      containerStyle={{
        top: 80, // Account for header
      }}
      gutter={8}
    />
  )
}

export default ToastManager