import { useState, useEffect } from 'react'
import { Wifi, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const ConnectionStatus = ({ socket, onReconnect }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [socketConnected, setSocketConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [connectionQuality, setConnectionQuality] = useState('good') // good, poor, offline

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Internet connection restored')
    }

    const handleOffline = () => {
      setIsOnline(false)
      setConnectionQuality('offline')
      toast.error('Internet connection lost')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!socket) return

    const handleConnect = () => {
      setSocketConnected(true)
      setReconnecting(false)
      setConnectionQuality('good')
      toast.success('Connected to game server')
    }

    const handleDisconnect = () => {
      setSocketConnected(false)
      setConnectionQuality('poor')
      toast.error('Disconnected from game server')
    }

    const handleConnectError = () => {
      setSocketConnected(false)
      setConnectionQuality('poor')
    }

    const handleReconnectAttempt = () => {
      setReconnecting(true)
    }

    const handleReconnect = () => {
      setSocketConnected(true)
      setReconnecting(false)
      setConnectionQuality('good')
      toast.success('Reconnected to game server')
    }

    const handleReconnectError = () => {
      setReconnecting(false)
      setConnectionQuality('poor')
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.on('reconnect_attempt', handleReconnectAttempt)
    socket.on('reconnect', handleReconnect)
    socket.on('reconnect_error', handleReconnectError)

    // Initial state
    setSocketConnected(socket.connected)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.off('reconnect_attempt', handleReconnectAttempt)
      socket.off('reconnect', handleReconnect)
      socket.off('reconnect_error', handleReconnectError)
    }
  }, [socket])

  const handleManualReconnect = () => {
    if (onReconnect) {
      onReconnect()
    }
  }

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500'
    if (!socketConnected) return 'text-orange-500'
    if (connectionQuality === 'poor') return 'text-yellow-500'
    return 'text-green-500'
  }

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />
    if (reconnecting) return <RefreshCw className="h-4 w-4 animate-spin" />
    if (!socketConnected) return <AlertTriangle className="h-4 w-4" />
    return <Wifi className="h-4 w-4" />
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'
    if (reconnecting) return 'Reconnecting...'
    if (!socketConnected) return 'Disconnected'
    if (connectionQuality === 'poor') return 'Poor connection'
    return 'Connected'
  }

  // Don't show if everything is good
  if (isOnline && socketConnected && connectionQuality === 'good' && !reconnecting) {
    return null
  }

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-3 py-2 rounded-lg bg-white shadow-lg border ${getStatusColor()}`}>
      {getStatusIcon()}
      <span className="text-sm font-medium">{getStatusText()}</span>
      {(!socketConnected || connectionQuality === 'poor') && (
        <button
          onClick={handleManualReconnect}
          disabled={reconnecting}
          className="ml-2 p-1 rounded hover:bg-gray-100 transition-colors"
          title="Reconnect"
        >
          <RefreshCw className={`h-3 w-3 ${reconnecting ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  )
}

export default ConnectionStatus