import { useState, useEffect, useCallback } from 'react'

// User preferences hook
export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState({
    theme: 'light',
    notifications: true,
    soundEnabled: true,
    autoSave: true,
    keyboardShortcuts: true,
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium',
    language: 'en'
  })

  const [loading, setLoading] = useState(true)

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hackarena_preferences')
      if (saved) {
        const parsed = JSON.parse(saved)
        setPreferences(prev => ({ ...prev, ...parsed }))
      }

      // Check system preferences
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

      setPreferences(prev => ({
        ...prev,
        reducedMotion: prev.reducedMotion || prefersReducedMotion,
        highContrast: prev.highContrast || prefersHighContrast,
        theme: prev.theme === 'auto' ? (prefersDark ? 'dark' : 'light') : prev.theme
      }))
    } catch (error) {
      console.error('Failed to load user preferences:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences) => {
    try {
      const updated = { ...preferences, ...newPreferences }
      setPreferences(updated)
      localStorage.setItem('hackarena_preferences', JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to save user preferences:', error)
    }
  }, [preferences])

  // Update specific preference
  const updatePreference = useCallback((key, value) => {
    savePreferences({ [key]: value })
  }, [savePreferences])

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    const defaults = {
      theme: 'light',
      notifications: true,
      soundEnabled: true,
      autoSave: true,
      keyboardShortcuts: true,
      reducedMotion: false,
      highContrast: false,
      fontSize: 'medium',
      language: 'en'
    }
    setPreferences(defaults)
    localStorage.setItem('hackarena_preferences', JSON.stringify(defaults))
  }, [])

  // Apply theme
  useEffect(() => {
    const root = document.documentElement

    if (preferences.theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Apply high contrast
    if (preferences.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Apply font size
    root.style.fontSize = {
      small: '14px',
      medium: '16px',
      large: '18px',
      xlarge: '20px'
    }[preferences.fontSize] || '16px'

  }, [preferences.theme, preferences.highContrast, preferences.fontSize])

  // Apply reduced motion
  useEffect(() => {
    if (preferences.reducedMotion) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms')
    } else {
      document.documentElement.style.removeProperty('--animation-duration')
    }
  }, [preferences.reducedMotion])

  return {
    preferences,
    loading,
    updatePreference,
    savePreferences,
    resetPreferences
  }
}

// Theme utilities
export const getThemeClasses = (preferences) => ({
  background: preferences.theme === 'dark' ? 'bg-gray-900' : 'bg-white',
  text: preferences.theme === 'dark' ? 'text-white' : 'text-gray-900',
  border: preferences.theme === 'dark' ? 'border-gray-700' : 'border-gray-200',
  card: preferences.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
})

// Notification preferences
export const useNotificationPreferences = () => {
  const { preferences, updatePreference } = useUserPreferences()

  const notify = useCallback((type, message) => {
    if (!preferences.notifications) return

    // Use the enhanced toast system
    if (window.showSuccessToast && type === 'success') {
      window.showSuccessToast(message)
    } else if (window.showErrorToast && type === 'error') {
      window.showErrorToast(message)
    } else if (window.showInfoToast && type === 'info') {
      window.showInfoToast(message)
    }
  }, [preferences.notifications])

  return {
    enabled: preferences.notifications,
    setEnabled: (enabled) => updatePreference('notifications', enabled),
    notify
  }
}

// Sound preferences
export const useSoundPreferences = () => {
  const { preferences, updatePreference } = useUserPreferences()

  const playSound = useCallback((soundType) => {
    if (!preferences.soundEnabled) return

    // Placeholder for sound implementation
    console.log(`Playing sound: ${soundType}`)
  }, [preferences.soundEnabled])

  return {
    enabled: preferences.soundEnabled,
    setEnabled: (enabled) => updatePreference('soundEnabled', enabled),
    playSound
  }
}

// Auto-save functionality
export const useAutoSave = (data, saveFunction, delay = 2000) => {
  const { preferences } = useUserPreferences()
  const [lastSaved, setLastSaved] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!preferences.autoSave || !data) return

    const timeoutId = setTimeout(async () => {
      setSaving(true)
      try {
        await saveFunction(data)
        setLastSaved(new Date())
      } catch (error) {
        console.error('Auto-save failed:', error)
      } finally {
        setSaving(false)
      }
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [data, saveFunction, delay, preferences.autoSave])

  return { lastSaved, saving }
}

export default useUserPreferences