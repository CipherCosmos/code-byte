import { useEffect, useRef, useState } from 'react'

// Focus management hook
export const useFocusManagement = () => {
  const focusRef = useRef(null)

  const setFocus = (element) => {
    if (element) {
      element.focus()
    } else if (focusRef.current) {
      focusRef.current.focus()
    }
  }

  const trapFocus = (containerRef) => {
    const focusableElements = containerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    if (!focusableElements?.length) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            e.preventDefault()
          }
        }
      }
    }

    containerRef.current?.addEventListener('keydown', handleTabKey)
    return () => containerRef.current?.removeEventListener('keydown', handleTabKey)
  }

  return { focusRef, setFocus, trapFocus }
}

// Screen reader announcements
export const useScreenReader = () => {
  const announceRef = useRef(null)

  const announce = (message, priority = 'polite') => {
    if (!announceRef.current) {
      announceRef.current = document.createElement('div')
      announceRef.current.setAttribute('aria-live', priority)
      announceRef.current.setAttribute('aria-atomic', 'true')
      announceRef.current.style.position = 'absolute'
      announceRef.current.style.left = '-10000px'
      announceRef.current.style.width = '1px'
      announceRef.current.style.height = '1px'
      announceRef.current.style.overflow = 'hidden'
      document.body.appendChild(announceRef.current)
    }

    announceRef.current.textContent = message
  }

  const announceError = (message) => announce(`Error: ${message}`, 'assertive')
  const announceSuccess = (message) => announce(`Success: ${message}`, 'polite')
  const announceInfo = (message) => announce(`Information: ${message}`, 'polite')

  return { announce, announceError, announceSuccess, announceInfo }
}

// Skip links for navigation
export const SkipLink = ({ href, children }) => (
  <a
    href={href}
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-dsba-navy text-white px-4 py-2 rounded z-50"
  >
    {children}
  </a>
)

// Accessible form field
export const AccessibleField = ({
  label,
  id,
  error,
  required = false,
  helpText,
  children,
  className = ''
}) => (
  <div className={`space-y-1 ${className}`}>
    <label
      htmlFor={id}
      className="block text-sm font-medium text-gray-700"
    >
      {label}
      {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
    </label>

    {children}

    {helpText && (
      <p className="text-sm text-gray-500" id={`${id}-help`}>
        {helpText}
      </p>
    )}

    {error && (
      <p className="text-sm text-red-600" id={`${id}-error`} role="alert">
        {error}
      </p>
    )}
  </div>
)

// Accessible button with loading state
export const AccessibleButton = ({
  loading = false,
  loadingText = 'Loading...',
  disabled = false,
  children,
  onClick,
  ...props
}) => {
  const isDisabled = disabled || loading

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-describedby={loading ? 'loading-status' : undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="sr-only" id="loading-status">{loadingText}</span>
          <span aria-hidden="true">{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

// High contrast mode detection
export const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    setIsHighContrast(mediaQuery.matches)

    const handleChange = (e) => setIsHighContrast(e.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isHighContrast
}

// Reduced motion preference
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

// Color scheme preference
export const useColorScheme = () => {
  const [colorScheme, setColorScheme] = useState('light')

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setColorScheme(mediaQuery.matches ? 'dark' : 'light')

    const handleChange = (e) => setColorScheme(e.matches ? 'dark' : 'light')
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return colorScheme
}

// ARIA live region for dynamic content
export const LiveRegion = ({
  children,
  priority = 'polite',
  atomic = true,
  className = ''
}) => (
  <div
    aria-live={priority}
    aria-atomic={atomic}
    className={`sr-only ${className}`}
  >
    {children}
  </div>
)

// Focus trap for modals
export const useFocusTrap = (isActive) => {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    firstElement.focus()

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive])

  return containerRef
}

export default {
  useFocusManagement,
  useScreenReader,
  useHighContrast,
  useReducedMotion,
  useColorScheme,
  useFocusTrap
}