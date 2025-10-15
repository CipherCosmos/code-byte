import { io } from 'socket.io-client'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

class SocketManager {
  constructor() {
    this.socket = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.reconnectDelay = 1000
    this.maxReconnectDelay = 30000
    this.connectionListeners = new Set()
    this.isReconnecting = false
  }

  connect() {
    if (this.socket?.connected) return this.socket

    this.socket = io(BASE_URL, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: this.maxReconnectDelay,
    })

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id)
      this.reconnectAttempts = 0
      this.isReconnecting = false
      this.notifyListeners('connected')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      this.notifyListeners('disconnected', reason)

      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        // Don't auto-reconnect for intentional disconnects
        return
      }

      // Auto-reconnect for other disconnect reasons
      this.attemptReconnection()
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      this.notifyListeners('error', error)
      this.attemptReconnection()
    })

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`Reconnection attempt ${attempt}/${this.maxReconnectAttempts}`)
      this.isReconnecting = true
      this.notifyListeners('reconnecting', attempt)
    })

    this.socket.on('reconnect', (attempt) => {
      console.log(`Reconnected after ${attempt} attempts`)
      this.reconnectAttempts = 0
      this.isReconnecting = false
      this.notifyListeners('reconnected', attempt)
    })

    this.socket.on('reconnect_error', (error) => {
      console.error('Reconnection failed:', error)
      this.notifyListeners('reconnect_error', error)
    })

    this.socket.on('reconnect_failed', () => {
      console.error('All reconnection attempts failed')
      this.isReconnecting = false
      this.notifyListeners('reconnect_failed')
    })

    return this.socket
  }

  attemptReconnection() {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay)

    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        console.log(`Manual reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
        this.socket.connect()
      }
    }, delay)
  }

  addConnectionListener(callback) {
    this.connectionListeners.add(callback)
  }

  removeConnectionListener(callback) {
    this.connectionListeners.delete(callback)
  }

  notifyListeners(event, data) {
    this.connectionListeners.forEach(callback => {
      try {
        callback(event, data)
      } catch (error) {
        console.error('Error in connection listener:', error)
      }
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }
}

export const socketManager = new SocketManager()
export default socketManager