import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Trophy, Mail, Lock, User, UserPlus, HelpCircle } from 'lucide-react'
import Header from '../../components/Header'
import { AccessibleField, AccessibleButton, useScreenReader } from '../../hooks/useAccessibility'
import { LoadingButton } from '../../components/ProgressIndicator'
import { HelpTooltip } from '../../components/Tooltip'

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const { register } = useAuth()
  const navigate = useNavigate()
  const { announceError, announceSuccess } = useScreenReader()

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      announceError('Please correct the errors in the form')
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const result = await register(formData.email, formData.password, formData.name)

      if (result.success) {
        announceSuccess('Account created successfully! Redirecting to dashboard...')
        navigate('/dashboard')
      } else {
        const errorMessage = result.error || 'Registration failed. Please try again.'
        setErrors({ general: errorMessage })
        announceError(errorMessage)
      }
    } catch (error) {
      const errorMessage = 'Registration failed due to a network error. Please check your connection and try again.'
      setErrors({ general: errorMessage })
      announceError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />
      <div className="flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="p-4 bg-dsba-navy rounded-2xl shadow-lg">
                <img src="/dsba-logo.svg" alt="DSBA Logo" className="h-10 w-auto" />
              </div>
              <div>
                <h1 className="dsba-logo text-2xl">DSBA HackArena</h1>
                <p className="text-sm text-dsba-navy font-medium">Organizer Portal</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Join DSBA HackArena</h2>
            <p className="text-gray-600">Create your DSBA organizer account</p>
          </div>

        <div className="card p-10 shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm font-medium">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <AccessibleField
              label="Full Name"
              id="name"
              error={errors.name}
              required
              helpText="Enter your complete name as it will appear on certificates"
            >
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className={`input pl-10 w-full ${errors.name ? 'border-red-300 focus:border-red-500' : ''}`}
                  placeholder="Enter your full name"
                  aria-describedby={errors.name ? "name-error" : "name-help"}
                />
              </div>
            </AccessibleField>

            <AccessibleField
              label="Email Address"
              id="email"
              error={errors.email}
              required
              helpText="We'll use this email for account notifications and password recovery"
            >
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`input pl-10 w-full ${errors.email ? 'border-red-300 focus:border-red-500' : ''}`}
                  placeholder="Enter your email"
                  aria-describedby={errors.email ? "email-error" : "email-help"}
                />
              </div>
            </AccessibleField>

            <AccessibleField
              label="Password"
              id="password"
              error={errors.password}
              required
              helpText="Must be at least 6 characters with uppercase, lowercase, and numbers"
            >
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`input pl-10 w-full ${errors.password ? 'border-red-300 focus:border-red-500' : ''}`}
                  placeholder="Create a password"
                  aria-describedby={errors.password ? "password-error" : "password-help"}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <HelpTooltip content="Password must contain at least 6 characters with uppercase, lowercase, and numbers for security">
                    <button type="button" className="text-gray-400 hover:text-gray-600">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </HelpTooltip>
                </div>
              </div>
            </AccessibleField>

            <AccessibleField
              label="Confirm Password"
              id="confirmPassword"
              error={errors.confirmPassword}
              required
              helpText="Re-enter your password to confirm"
            >
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input pl-10 w-full ${errors.confirmPassword ? 'border-red-300 focus:border-red-500' : ''}`}
                  placeholder="Confirm your password"
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : "confirmPassword-help"}
                />
              </div>
            </AccessibleField>

            <LoadingButton
              loading={loading}
              loadingText="Creating your account..."
              onClick={handleSubmit}
              className="w-full flex items-center justify-center py-4 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              <UserPlus className="h-6 w-6 mr-3" />
              Create Account
            </LoadingButton>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to home
            </Link>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

export default Register