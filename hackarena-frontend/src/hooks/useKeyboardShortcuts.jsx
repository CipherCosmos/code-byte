import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export const useKeyboardShortcuts = (shortcuts = {}) => {
  const navigate = useNavigate()

  const handleKeyDown = useCallback((event) => {
    // Ignore if user is typing in an input field
    if (event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.contentEditable === 'true') {
      return
    }

    const key = event.key.toLowerCase()
    const ctrl = event.ctrlKey || event.metaKey
    const shift = event.shiftKey
    const alt = event.altKey

    // Check for matching shortcuts
    for (const [shortcut, action] of Object.entries(shortcuts)) {
      const parts = shortcut.toLowerCase().split('+')
      const requiresCtrl = parts.includes('ctrl') || parts.includes('cmd')
      const requiresShift = parts.includes('shift')
      const requiresAlt = parts.includes('alt')
      const shortcutKey = parts[parts.length - 1]

      if (key === shortcutKey &&
          ctrl === requiresCtrl &&
          shift === requiresShift &&
          alt === requiresAlt) {
        event.preventDefault()
        action(event)
        break
      }
    }
  }, [shortcuts])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Common keyboard shortcuts hook
export const useCommonShortcuts = () => {
  const navigate = useNavigate()

  const shortcuts = {
    // Navigation shortcuts
    'g+h': () => navigate('/'), // Go to Home
    'g+d': () => navigate('/dashboard'), // Go to Dashboard
    'g+j': () => navigate('/join'), // Go to Join Game

    // Common actions
    'ctrl+,': () => {
      // Open settings/preferences (placeholder)
      console.log('Settings shortcut pressed')
    },

    // Help shortcuts
    '?': () => {
      // Show help modal (placeholder)
      console.log('Help shortcut pressed')
    },

    // Escape shortcuts
    'escape': () => {
      // Close modals, go back, etc. (context-dependent)
      const activeModal = document.querySelector('[role="dialog"]')
      if (activeModal) {
        const closeButton = activeModal.querySelector('[aria-label="Close"]') ||
                           activeModal.querySelector('.close-button') ||
                           activeModal.querySelector('[data-close]')
        if (closeButton) {
          closeButton.click()
        }
      } else {
        // Go back in history
        window.history.back()
      }
    }
  }

  useKeyboardShortcuts(shortcuts)
}

// Game-specific shortcuts
export const useGameShortcuts = (gameActions = {}) => {
  const shortcuts = {
    // Game control shortcuts (organizer)
    'ctrl+enter': () => gameActions.startGame?.(),
    'ctrl+space': () => gameActions.pauseResume?.(),
    'ctrl+n': () => gameActions.nextQuestion?.(),
    'ctrl+r': () => gameActions.revealAnswer?.(),
    'ctrl+e': () => gameActions.endGame?.(),

    // Participant shortcuts
    'enter': () => gameActions.submitAnswer?.(),

    // Common game shortcuts
    'ctrl+l': () => gameActions.showLeaderboard?.(),
    'ctrl+a': () => gameActions.showAnalytics?.(),
  }

  useKeyboardShortcuts(shortcuts)
}

// Form shortcuts
export const useFormShortcuts = (formActions = {}) => {
  const shortcuts = {
    'ctrl+enter': () => formActions.submit?.(),
    'ctrl+s': () => formActions.save?.(),
    'escape': () => formActions.cancel?.(),
  }

  useKeyboardShortcuts(shortcuts)
}

// Modal shortcuts
export const useModalShortcuts = (modalActions = {}) => {
  const shortcuts = {
    'escape': () => modalActions.close?.(),
    'enter': () => modalActions.confirm?.(),
  }

  useKeyboardShortcuts(shortcuts)
}

// Keyboard shortcut display component
export const KeyboardShortcutHint = ({ shortcut, description, className = '' }) => (
  <div className={`flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg ${className}`}>
    <span className="text-sm text-gray-600">{description}</span>
    <kbd className="px-2 py-1 text-xs font-mono bg-white border border-gray-300 rounded shadow-sm">
      {shortcut.replace('ctrl', '⌘').replace('shift', '⇧').replace('alt', '⌥').toUpperCase()}
    </kbd>
  </div>
)

export const ShortcutLegend = ({ shortcuts = [], title = 'Keyboard Shortcuts' }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
    <h3 className="text-sm font-medium text-gray-900 mb-3">{title}</h3>
    <div className="space-y-2">
      {shortcuts.map((shortcut, index) => (
        <KeyboardShortcutHint
          key={index}
          shortcut={shortcut.key}
          description={shortcut.description}
        />
      ))}
    </div>
  </div>
)

export default useKeyboardShortcuts