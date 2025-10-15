class CheatDetectionManager {
  constructor(onCheatDetected) {
    this.onCheatDetected = onCheatDetected
    this.isMonitoring = false
    this.tabSwitchCount = 0
    this.lastActiveTime = Date.now()
    this.isTabVisible = true

    // Enhanced tracking properties
    this.keyboardEvents = []
    this.mouseEvents = []
    this.devToolsChecks = []
    this.suspiciousBehaviors = []
    this.lastMousePosition = { x: 0, y: 0 }
    this.mouseMovementCount = 0
    this.rapidClickCount = 0
    this.lastClickTime = 0
    this.copyPasteAttempts = 0
    this.devToolsOpenAttempts = 0
    this.externalWindowFocus = 0
    this.unusualActivityScore = 0

    // Detection thresholds
    this.RAPID_CLICK_THRESHOLD = 5 // clicks per second
    this.SUSPICIOUS_ACTIVITY_THRESHOLD = 10
    this.MAX_COPY_PASTE_ATTEMPTS = 3
    this.MAX_DEV_TOOLS_ATTEMPTS = 2
  }

  startMonitoring() {
    if (this.isMonitoring) return

    this.isMonitoring = true

    // Disable right-click context menu
    document.addEventListener('contextmenu', this.handleContextMenu)

    // Enhanced keyboard monitoring
    document.addEventListener('keydown', this.handleKeyDown)
    document.addEventListener('keyup', this.handleKeyUp)

    // Mouse activity monitoring
    document.addEventListener('mousedown', this.handleMouseDown)
    document.addEventListener('mousemove', this.handleMouseMove)

    // Detect tab switching
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    // Detect window focus changes
    window.addEventListener('blur', this.handleWindowBlur)
    window.addEventListener('focus', this.handleWindowFocus)

    // Detect external window interactions
    window.addEventListener('beforeunload', this.handleBeforeUnload)

    // Enhanced developer tools detection
    this.detectDevTools()
    this.startAdvancedDevToolsDetection()

    // Suspicious behavior monitoring
    this.startSuspiciousBehaviorMonitoring()

    console.log('Enhanced cheat detection monitoring started')
  }

  stopMonitoring() {
    if (!this.isMonitoring) return

    this.isMonitoring = false

    // Remove all event listeners
    document.removeEventListener('contextmenu', this.handleContextMenu)
    document.removeEventListener('keydown', this.handleKeyDown)
    document.removeEventListener('keyup', this.handleKeyUp)
    document.removeEventListener('mousedown', this.handleMouseDown)
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('blur', this.handleWindowBlur)
    window.removeEventListener('focus', this.handleWindowFocus)
    window.removeEventListener('beforeunload', this.handleBeforeUnload)

    // Clear intervals
    if (this.devToolsInterval) {
      clearInterval(this.devToolsInterval)
    }
    if (this.behaviorInterval) {
      clearInterval(this.behaviorInterval)
    }

    console.log('Enhanced cheat detection monitoring stopped')
  }

  handleContextMenu = (e) => {
    e.preventDefault()
    this.reportCheat('right_click_attempt', 'Right-click context menu blocked')
  }

  handleKeyDown = (e) => {
    const key = e.key.toLowerCase()
    const timestamp = Date.now()

    // Track keyboard events for pattern analysis
    this.keyboardEvents.push({
      key: e.key,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
      timestamp
    })

    // Keep only recent events (last 10 seconds)
    this.keyboardEvents = this.keyboardEvents.filter(event => timestamp - event.timestamp < 10000)

    // Detect common copy/paste shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (['c', 'v', 'a', 'x', 's'].includes(key)) {
        this.copyPasteAttempts++
        // Allow copy/paste in input fields for answers
        if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
          e.preventDefault()
          this.reportCheat('copy_paste_attempt', `Blocked ${e.key.toUpperCase()} shortcut (attempt ${this.copyPasteAttempts})`)

          if (this.copyPasteAttempts >= this.MAX_COPY_PASTE_ATTEMPTS) {
            this.reportCheat('excessive_copy_paste', `Multiple copy/paste attempts detected (${this.copyPasteAttempts})`)
          }
        }
      }
    }

    // Detect F12 (Developer Tools)
    if (e.key === 'F12') {
      e.preventDefault()
      this.devToolsOpenAttempts++
      this.reportCheat('dev_tools_attempt', `F12 key blocked (attempt ${this.devToolsOpenAttempts})`)

      if (this.devToolsOpenAttempts >= this.MAX_DEV_TOOLS_ATTEMPTS) {
        this.reportCheat('persistent_dev_tools', `Persistent developer tools access attempts (${this.devToolsOpenAttempts})`)
      }
    }

    // Detect Ctrl+Shift+I (Developer Tools)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'i') {
      e.preventDefault()
      this.devToolsOpenAttempts++
      this.reportCheat('dev_tools_attempt', `Developer tools shortcut blocked (attempt ${this.devToolsOpenAttempts})`)

      if (this.devToolsOpenAttempts >= this.MAX_DEV_TOOLS_ATTEMPTS) {
        this.reportCheat('persistent_dev_tools', `Persistent developer tools access attempts (${this.devToolsOpenAttempts})`)
      }
    }

    // Detect other suspicious shortcuts
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      if (['j', 'c', 'k'].includes(key)) {
        e.preventDefault()
        this.reportCheat('suspicious_shortcut', `Blocked suspicious shortcut: Ctrl+Shift+${e.key.toUpperCase()}`)
      }
    }

    // Detect rapid keyboard activity
    const recentKeys = this.keyboardEvents.filter(event => timestamp - event.timestamp < 1000)
    if (recentKeys.length > 20) {
      this.reportCheat('rapid_keyboard_activity', `Unusual rapid keyboard activity detected (${recentKeys.length} keys/sec)`)
    }
  }

  handleKeyUp = (e) => {
    // Additional key up handling if needed for pattern detection
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
      this.externalWindowFocus++
      this.reportCheat('window_focus_lost', `Window focus lost for ${Math.round(awayTime/1000)} seconds (attempt ${this.externalWindowFocus})`)

      if (this.externalWindowFocus >= 3) {
        this.reportCheat('frequent_window_switching', `Frequent external window focus detected (${this.externalWindowFocus} times)`)
      }
    }
  }

  handleBeforeUnload = (e) => {
    // Detect attempt to close/refresh the page
    this.reportCheat('page_close_attempt', 'Attempted to close or refresh the page')
    // Note: This won't prevent the action but will log it
  }

  handleMouseDown = (e) => {
    const timestamp = Date.now()
    const timeSinceLastClick = timestamp - this.lastClickTime

    // Track rapid clicking
    if (timeSinceLastClick < 200) { // Less than 200ms between clicks
      this.rapidClickCount++
      if (this.rapidClickCount >= this.RAPID_CLICK_THRESHOLD) {
        this.reportCheat('rapid_clicking', `Rapid clicking detected (${this.rapidClickCount} clicks in short time)`)
        this.rapidClickCount = 0 // Reset to avoid spam
      }
    } else {
      this.rapidClickCount = 0
    }

    this.lastClickTime = timestamp

    // Track mouse events
    this.mouseEvents.push({
      type: 'click',
      button: e.button,
      x: e.clientX,
      y: e.clientY,
      timestamp
    })

    // Keep only recent events
    this.mouseEvents = this.mouseEvents.filter(event => timestamp - event.timestamp < 5000)
  }

  handleMouseMove = (e) => {
    const timestamp = Date.now()
    const distance = Math.sqrt(
      Math.pow(e.clientX - this.lastMousePosition.x, 2) +
      Math.pow(e.clientY - this.lastMousePosition.y, 2)
    )

    // Track unusual mouse movement patterns
    if (distance > 500) { // Large sudden movements
      this.reportCheat('unusual_mouse_movement', `Unusual mouse movement detected (${Math.round(distance)}px jump)`)
    }

    this.lastMousePosition = { x: e.clientX, y: e.clientY }
    this.mouseMovementCount++

    // Track mouse events for pattern analysis
    this.mouseEvents.push({
      type: 'move',
      x: e.clientX,
      y: e.clientY,
      timestamp
    })

    // Keep only recent events
    this.mouseEvents = this.mouseEvents.filter(event => timestamp - event.timestamp < 5000)
  }

  detectDevTools() {
    // Basic developer tools detection
    let devtools = {
      open: false,
      orientation: null
    }

    const threshold = 160

    this.devToolsInterval = setInterval(() => {
      if (this.isMonitoring) {
        if (window.outerHeight - window.innerHeight > threshold ||
            window.outerWidth - window.innerWidth > threshold) {
          if (!devtools.open) {
            devtools.open = true
            this.devToolsOpenAttempts++
            this.reportCheat('dev_tools_opened', `Developer tools detected (attempt ${this.devToolsOpenAttempts})`)

            if (this.devToolsOpenAttempts >= this.MAX_DEV_TOOLS_ATTEMPTS) {
              this.reportCheat('persistent_dev_tools', `Persistent developer tools usage detected (${this.devToolsOpenAttempts} detections)`)
            }
          }
        } else {
          devtools.open = false
        }
      }
    }, 5000)
  }

  startAdvancedDevToolsDetection() {
    // Advanced developer tools detection methods
    const checkDevTools = () => {
      if (!this.isMonitoring) return

      const start = performance.now()
      debugger // This will be removed by dev tools
      const end = performance.now()

      if (end - start > 100) { // If debugger statement was interrupted
        this.devToolsOpenAttempts++
        this.reportCheat('dev_tools_detected', `Advanced dev tools detection triggered (attempt ${this.devToolsOpenAttempts})`)
      }

      // Check for console methods being overridden
      const consoleMethods = ['log', 'warn', 'error', 'info', 'debug']
      const overriddenMethods = consoleMethods.filter(method => {
        return console[method] && console[method].toString().includes('[native code]') === false
      })

      if (overriddenMethods.length > 0) {
        this.reportCheat('console_manipulation', `Console methods potentially overridden: ${overriddenMethods.join(', ')}`)
      }
    }

    // Check every 10 seconds
    this.devToolsInterval = setInterval(checkDevTools, 10000)
  }

  startSuspiciousBehaviorMonitoring() {
    this.behaviorInterval = setInterval(() => {
      if (!this.isMonitoring) return

      const timestamp = Date.now()

      // Analyze keyboard patterns
      const recentKeyboardEvents = this.keyboardEvents.filter(event => timestamp - event.timestamp < 30000)
      const suspiciousPatterns = this.analyzeKeyboardPatterns(recentKeyboardEvents)

      if (suspiciousPatterns.length > 0) {
        suspiciousPatterns.forEach(pattern => {
          this.reportCheat('suspicious_keyboard_pattern', pattern)
        })
      }

      // Analyze mouse patterns
      const recentMouseEvents = this.mouseEvents.filter(event => timestamp - event.timestamp < 30000)
      const mousePatterns = this.analyzeMousePatterns(recentMouseEvents)

      if (mousePatterns.length > 0) {
        mousePatterns.forEach(pattern => {
          this.reportCheat('suspicious_mouse_pattern', pattern)
        })
      }

      // Check for unusual activity score
      this.unusualActivityScore = this.calculateUnusualActivityScore()
      if (this.unusualActivityScore > this.SUSPICIOUS_ACTIVITY_THRESHOLD) {
        this.reportCheat('high_suspicious_activity', `High suspicious activity score: ${this.unusualActivityScore}`)
      }

    }, 30000) // Check every 30 seconds
  }

  analyzeKeyboardPatterns(events) {
    const patterns = []

    if (events.length < 5) return patterns

    // Check for repetitive key sequences
    const keySequence = events.map(e => e.key).join('')
    if (keySequence.includes('abcd') || keySequence.includes('1234')) {
      patterns.push('Sequential key pattern detected')
    }

    // Check for rapid alternating keys
    const timeDiffs = []
    for (let i = 1; i < events.length; i++) {
      timeDiffs.push(events[i].timestamp - events[i-1].timestamp)
    }

    const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length
    if (avgTimeDiff < 50 && events.length > 10) { // Very rapid typing
      patterns.push('Extremely rapid typing detected')
    }

    return patterns
  }

  analyzeMousePatterns(events) {
    const patterns = []

    if (events.length < 10) return patterns

    // Check for robotic mouse movements (perfect straight lines, etc.)
    const moveEvents = events.filter(e => e.type === 'move')
    if (moveEvents.length > 5) {
      let straightLineCount = 0
      for (let i = 2; i < moveEvents.length; i++) {
        const dx1 = moveEvents[i].x - moveEvents[i-1].x
        const dy1 = moveEvents[i].y - moveEvents[i-1].y
        const dx2 = moveEvents[i-1].x - moveEvents[i-2].x
        const dy2 = moveEvents[i-1].y - moveEvents[i-2].y

        // Check if three points are colinear (straight line)
        if (Math.abs(dx1 * dy2 - dy1 * dx2) < 10) {
          straightLineCount++
        }
      }

      if (straightLineCount > moveEvents.length * 0.7) {
        patterns.push('Unnaturally straight mouse movements detected')
      }
    }

    return patterns
  }

  calculateUnusualActivityScore() {
    let score = 0

    // Keyboard activity score
    const recentKeyboard = this.keyboardEvents.filter(e => Date.now() - e.timestamp < 60000).length
    score += Math.max(0, recentKeyboard - 50) * 0.1 // More than 50 keys per minute is suspicious

    // Mouse activity score
    const recentMouse = this.mouseEvents.filter(e => Date.now() - e.timestamp < 60000).length
    score += Math.max(0, recentMouse - 200) * 0.05 // More than 200 mouse events per minute

    // Tab switches
    score += this.tabSwitchCount * 2

    // Copy/paste attempts
    score += this.copyPasteAttempts * 1.5

    // Dev tools attempts
    score += this.devToolsOpenAttempts * 3

    // External window focus
    score += this.externalWindowFocus * 1

    return Math.round(score * 10) / 10
  }

  reportCheat(type, description) {
    if (this.onCheatDetected) {
      // Create comprehensive cheat report
      const cheatReport = {
        type,
        description,
        timestamp: Date.now(),
        tabSwitchCount: this.tabSwitchCount,
        copyPasteAttempts: this.copyPasteAttempts,
        devToolsAttempts: this.devToolsOpenAttempts,
        externalWindowFocus: this.externalWindowFocus,
        unusualActivityScore: this.unusualActivityScore,
        recentKeyboardEvents: this.keyboardEvents.length,
        recentMouseEvents: this.mouseEvents.length,
        sessionDuration: Date.now() - (this.sessionStartTime || Date.now()),
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`
      }

      // Log to console with different severity levels
      const severity = this.getCheatSeverity(type)
      switch (severity) {
        case 'high':
          console.error(`🚨 HIGH SEVERITY CHEAT: ${type} - ${description}`)
          break
        case 'medium':
          console.warn(`⚠️ MEDIUM SEVERITY CHEAT: ${type} - ${description}`)
          break
        case 'low':
          console.info(`ℹ️ LOW SEVERITY CHEAT: ${type} - ${description}`)
          break
      }

      // Store in suspicious behaviors log
      this.suspiciousBehaviors.push({
        ...cheatReport,
        severity
      })

      // Keep only recent behaviors (last 100)
      if (this.suspiciousBehaviors.length > 100) {
        this.suspiciousBehaviors = this.suspiciousBehaviors.slice(-100)
      }

      this.onCheatDetected(cheatReport)
    }
  }

  getCheatSeverity(type) {
    const highSeverity = [
      'persistent_dev_tools',
      'high_suspicious_activity',
      'rapid_keyboard_activity',
      'rapid_clicking',
      'unusual_mouse_movement',
      'frequent_window_switching',
      'console_manipulation'
    ]

    const mediumSeverity = [
      'dev_tools_opened',
      'dev_tools_attempt',
      'excessive_copy_paste',
      'suspicious_shortcut',
      'suspicious_keyboard_pattern',
      'suspicious_mouse_pattern'
    ]

    if (highSeverity.includes(type)) return 'high'
    if (mediumSeverity.includes(type)) return 'medium'
    return 'low'
  }

  getCheatSummary() {
    return {
      totalCheats: this.suspiciousBehaviors.length,
      highSeverityCount: this.suspiciousBehaviors.filter(b => b.severity === 'high').length,
      mediumSeverityCount: this.suspiciousBehaviors.filter(b => b.severity === 'medium').length,
      lowSeverityCount: this.suspiciousBehaviors.filter(b => b.severity === 'low').length,
      tabSwitches: this.tabSwitchCount,
      copyPasteAttempts: this.copyPasteAttempts,
      devToolsAttempts: this.devToolsOpenAttempts,
      externalFocusEvents: this.externalWindowFocus,
      currentActivityScore: this.unusualActivityScore,
      sessionStartTime: this.sessionStartTime || Date.now()
    }
  }

  resetCounters() {
    this.tabSwitchCount = 0
    this.copyPasteAttempts = 0
    this.devToolsOpenAttempts = 0
    this.externalWindowFocus = 0
    this.rapidClickCount = 0
    this.mouseMovementCount = 0
    this.unusualActivityScore = 0
    this.keyboardEvents = []
    this.mouseEvents = []
    this.suspiciousBehaviors = []
    this.sessionStartTime = Date.now()
  }
}

export default CheatDetectionManager