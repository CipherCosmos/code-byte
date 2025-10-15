import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../utils/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('hackarena_token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await api.get('/auth/verify')
      if (response.data.valid) {
        setUser(response.data.user)
      } else {
        localStorage.removeItem('hackarena_token')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('hackarena_token')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { token, user } = response.data
      
      localStorage.setItem('hackarena_token', token)
      setUser(user)
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      }
    }
  }

  const register = async (email, password, name) => {
    try {
      const response = await api.post('/auth/register', { email, password, name })
      const { token, user } = response.data

      localStorage.setItem('hackarena_token', token)
      setUser(user)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      }
    }
  }

  const googleLogin = async (idToken) => {
    try {
      const response = await api.post('/auth/google', { idToken })
      const { token, user } = response.data

      localStorage.setItem('hackarena_token', token)
      setUser(user)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Google authentication failed'
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('hackarena_token')
    setUser(null)
  }

  const value = {
    user,
    login,
    register,
    googleLogin,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}