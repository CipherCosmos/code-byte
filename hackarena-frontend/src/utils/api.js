import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hackarena_token')
    const sessionToken = localStorage.getItem('hackarena_session')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (sessionToken) {
      config.headers['x-session-token'] = sessionToken
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle auth errors and retries
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Handle auth errors
    if (error.response?.status === 401) {
      localStorage.removeItem('hackarena_token')
      localStorage.removeItem('hackarena_session')
      localStorage.removeItem('hackarena_participant')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // Handle network errors with retry logic
    if (!error.response && error.code === 'NETWORK_ERROR') {
      console.warn('Network error detected, attempting retry...')

      // Implement exponential backoff retry
      if (!originalRequest._retryCount) {
        originalRequest._retryCount = 0
      }

      if (originalRequest._retryCount < 3) {
        originalRequest._retryCount++
        const delay = Math.pow(2, originalRequest._retryCount) * 1000 // 2s, 4s, 8s

        console.log(`Retrying request (${originalRequest._retryCount}/3) in ${delay}ms`)

        return new Promise(resolve => {
          setTimeout(() => resolve(api(originalRequest)), delay)
        })
      }
    }

    // Handle server errors (5xx) with retry
    if (error.response?.status >= 500) {
      if (!originalRequest._retryCount) {
        originalRequest._retryCount = 0
      }

      if (originalRequest._retryCount < 2) {
        originalRequest._retryCount++
        const delay = 2000 * originalRequest._retryCount

        console.log(`Retrying server error (${originalRequest._retryCount}/2) in ${delay}ms`)

        return new Promise(resolve => {
          setTimeout(() => resolve(api(originalRequest)), delay)
        })
      }
    }

    return Promise.reject(error)
  }
)