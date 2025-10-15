import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trophy, Users, QrCode, ArrowRight, Loader2, HelpCircle } from 'lucide-react'
import { api } from '../../utils/api'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { AccessibleField } from '../../hooks/useAccessibility'
import { LoadingButton } from '../../components/ProgressIndicator'
import { HelpTooltip } from '../../components/Tooltip'
import { useFormShortcuts } from '../../hooks/useKeyboardShortcuts'

const JoinGame = () => {
  const { gameCode: urlGameCode } = useParams()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    gameCode: urlGameCode || '',
    name: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  // Keyboard shortcuts for form
  useFormShortcuts({
    submit: () => document.querySelector('form')?.requestSubmit()
  })

  useEffect(() => {
    // If game code is in URL, focus on name input
    if (urlGameCode && urlGameCode.length === 8) {
      setFormData(prev => ({ ...prev, gameCode: urlGameCode.toUpperCase() }))
    }
  }, [urlGameCode])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.gameCode.trim()) {
      newErrors.gameCode = 'Game code is required to join a game'
    } else if (formData.gameCode.length !== 8) {
      newErrors.gameCode = 'Game code must be exactly 8 characters'
    } else if (!/^[A-Z0-9]+$/.test(formData.gameCode.toUpperCase())) {
      newErrors.gameCode = 'Game code can only contain letters and numbers'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Your name is required to participate'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters long'
    } else if (formData.name.length > 30) {
      newErrors.name = 'Name cannot exceed 30 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const response = await api.post('/participants/join', {
        gameCode: formData.gameCode.toUpperCase(),
        name: formData.name.trim()
      })

      const { participant, sessionToken, gameCode } = response.data

      // Store session data
      localStorage.setItem('hackarena_session', sessionToken)
      localStorage.setItem('hackarena_participant', JSON.stringify(participant))

      // Enhanced success message
      if (window.showSuccessToast) {
        window.showSuccessToast(`Welcome ${participant.name}! 🎮 Get ready to compete!`)
      }

      navigate(`/game/${gameCode}`)

    } catch (error) {
      console.error('Join game error:', error)

      let errorMessage = 'Unable to join the game. Please try again.'

      if (error.response?.status === 404) {
        errorMessage = 'Game not found. Please check the game code and try again.'
      } else if (error.response?.status === 409) {
        errorMessage = 'This name is already taken in this game. Please choose a different name.'
      } else if (error.response?.status === 403) {
        errorMessage = 'This game is full or no longer accepting participants.'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      }

      setErrors({ general: errorMessage })

      if (window.showErrorToast) {
        window.showErrorToast(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'gameCode' ? value.toUpperCase() : value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dsba-navy via-blue-900 to-indigo-900">
      <Header />
      <div className="participant-interface flex items-center justify-center p-4 min-h-screen">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-6 shadow-2xl">
              <img src="/dsba-logo.svg" alt="DSBA Logo" className="h-10 w-auto" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">DSBA HackArena</h1>
            <p className="text-blue-100 text-lg">Join the DSBA competition!</p>
          </div>

        {/* Join Form */}
        <div className="card p-10 shadow-2xl bg-white/95 backdrop-blur-sm border-0">
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm font-medium">{errors.general}</p>
            </div>
          )}

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Game</h2>
            <p className="text-gray-600">Enter your details to participate</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <AccessibleField
              label="Game Code"
              id="gameCode"
              error={errors.gameCode}
              required
              helpText="Enter the 8-character code shown on the organizer's screen or scan the QR code"
            >
              <div className="relative">
                <input
                  id="gameCode"
                  name="gameCode"
                  type="text"
                  value={formData.gameCode}
                  onChange={handleChange}
                  className={`input w-full text-center text-lg font-mono tracking-wider uppercase ${errors.gameCode ? 'border-red-300 focus:border-red-500' : ''}`}
                  placeholder="ENTER CODE"
                  maxLength={8}
                  required
                  aria-describedby={errors.gameCode ? "gameCode-error" : "gameCode-help"}
                />
                <QrCode className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <HelpTooltip content="Find the game code on the organizer's screen or scan their QR code">
                    <button type="button" className="text-gray-400 hover:text-gray-600 ml-2">
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </HelpTooltip>
                </div>
              </div>
            </AccessibleField>

            <AccessibleField
              label="Your Name"
              id="name"
              error={errors.name}
              required
              helpText="Choose a unique name that will be visible to all participants and on the leaderboard"
            >
              <div className="relative">
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className={`input w-full ${errors.name ? 'border-red-300 focus:border-red-500' : ''}`}
                  placeholder="Enter your name"
                  maxLength={30}
                  required
                  aria-describedby={errors.name ? "name-error" : "name-help"}
                />
                <Users className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
              </div>
            </AccessibleField>

            <LoadingButton
              loading={loading}
              loadingText="Joining game..."
              onClick={handleSubmit}
              className="w-full h-14 text-xl font-bold flex items-center justify-center shadow-2xl hover:shadow-white/25 transform hover:scale-105 transition-all"
            >
              Join Game
              <ArrowRight className="h-6 w-6 ml-3" />
            </LoadingButton>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> or <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+Enter</kbd> to join quickly
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Don't have a game code?
            </p>
            <p className="text-xs text-gray-500">
              Ask your organizer or scan the QR code from their screen
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 text-center">
          <div className="grid grid-cols-3 gap-4 text-white">
            <div>
              <Trophy className="h-6 w-6 mx-auto mb-2 text-yellow-300" />
              <p className="text-sm">Compete</p>
            </div>
            <div>
              <Users className="h-6 w-6 mx-auto mb-2 text-blue-300" />
              <p className="text-sm">Real-time</p>
            </div>
            <div>
              <QrCode className="h-6 w-6 mx-auto mb-2 text-green-300" />
              <p className="text-sm">Easy Join</p>
            </div>
          </div>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default JoinGame