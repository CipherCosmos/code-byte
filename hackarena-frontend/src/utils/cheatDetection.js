class CheatDetectionManager {
  constructor(onCheatDetected) {
    this.onCheatDetected = onCheatDetected
    this.isMonitoring = false
    this.tabSwitchCount = 0
    this.lastActiveTime = Date.now()
    this.isTabVisible = true
  }

  startMonitoring() {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    
    // Disable right-click context menu
    document.addEventListener('contextmenu', this.handleContextMenu)
    
    // Detect copy/paste attempts
    document.addEventListener('keydown', this.handleKeyDown)
    
    // Detect tab switching
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    
    // Detect window focus changes
    window.addEventListener('blur', this.handleWindowBlur)
    window.addEventListener('focus', this.handleWindowFocus)
    
    // Detect developer tools (basic detection)
    this.detectDevTools()
    
    console.log('Cheat detection monitoring started')
  }

  stopMonitoring() {
    if (!this.isMonitoring) return
    
    this.isMonitoring = false
    
    document.removeEventListener('contextmenu', this.handleContextMenu)
    document.removeEventListener('keydown', this.handleKeyDown)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('blur', this.handleWindowBlur)
    window.removeEventListener('focus', this.handleWindowFocus)
    
    console.log('Cheat detection monitoring stopped')
  }

  handleContextMenu = (e) => {
    e.preventDefault()
    this.reportCheat('right_click_attempt', 'Right-click context menu blocked')
  }

  handleKeyDown = (e) => {
    // Detect common copy/paste shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (['c', 'v', 'a', 'x', 's'].includes(e.key.toLowerCase())) {
        // Allow copy/paste in input fields for answers
        if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
          e.preventDefault()
          this.reportCheat('copy_paste_attempt', `Blocked ${e.key.toUpperCase()} shortcut`)
        }
      }
    }
    
    // Detect F12 (Developer Tools)
    if (e.key === 'F12') {
      e.preventDefault()
      this.reportCheat('dev_tools_attempt', 'F12 key blocked')
    }
    
    // Detect Ctrl+Shift+I (Developer Tools)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault()
      this.reportCheat('dev_tools_attempt', 'Developer tools shortcut blocked')
    }
  }

  handleVisibilityChange = () => {
    const isHidden = document.hidden
    const currentTime = Date.now()
    
    if (isHidden && this.isTabVisible) {
      // Tab became hidden
      this.isTabVisible = false
      this.lastActiveTime = currentTime
    } else if (!isHidden && !this.isTabVisible) {
      // Tab became visible
      this.isTabVisible = true
      const awayTime = currentTime - this.lastActiveTime
      
      // Report if away for more than 5 seconds
      if (awayTime > 5000) {
        this.tabSwitchCount++
        this.reportCheat('tab_switch', `Tab was inactive for ${Math.round(awayTime/1000)} seconds`)
      }
    }
  }

  handleWindowBlur = () => {
    this.lastActiveTime = Date.now()
  }

  handleWindowFocus = () => {
    const awayTime = Date.now() - this.lastActiveTime
    if (awayTime > 3000) {
      this.reportCheat('window_focus_lost', `Window focus lost for ${Math.round(awayTime/1000)} seconds`)
    }
  }

  detectDevTools() {
    // Basic developer tools detection
    let devtools = {
      open: false,
      orientation: null
    }
    
    const threshold = 160
    
    setInterval(() => {
      if (this.isMonitoring) {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
          if (!devtools.open) {
            devtools.open = true
            this.reportCheat('dev_tools_opened', 'Developer tools detected')
          }
        } else {
          devtools.open = false
        }
      }
    }, 5000)
  }

  reportCheat(type, description) {
    if (this.onCheatDetected) {
      console.warn(`Cheat detected: ${type} - ${description}`)
      this.onCheatDetected({
        type,
        description,
        timestamp: Date.now(),
        tabSwitchCount: this.tabSwitchCount
      })
    }
  }
}

export default CheatDetectionManager