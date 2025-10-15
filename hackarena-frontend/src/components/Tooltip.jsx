import { useState, useRef, useEffect } from 'react'
import { HelpCircle, Info, AlertTriangle } from 'lucide-react'

const Tooltip = ({
  content,
  children,
  position = 'top',
  delay = 300,
  className = '',
  variant = 'default', // default, info, warning, help
  size = 'default', // small, default, large
  interactive = false,
  showArrow = true,
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef(null)
  const tooltipRef = useRef(null)
  const timeoutRef = useRef(null)

  const showTooltip = () => {
    if (disabled) return
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const scrollX = window.scrollX
    const scrollY = window.scrollY

    let x = 0
    let y = 0

    switch (position) {
      case 'top':
        x = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2) + scrollX
        y = triggerRect.top - tooltipRect.height - 8 + scrollY
        break
      case 'bottom':
        x = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2) + scrollX
        y = triggerRect.bottom + 8 + scrollY
        break
      case 'left':
        x = triggerRect.left - tooltipRect.width - 8 + scrollX
        y = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2) + scrollY
        break
      case 'right':
        x = triggerRect.right + 8 + scrollX
        y = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2) + scrollY
        break
    }

    // Keep tooltip within viewport
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (x < 8) x = 8
    if (x + tooltipRect.width > viewportWidth - 8) x = viewportWidth - tooltipRect.width - 8
    if (y < 8) y = 8
    if (y + tooltipRect.height > viewportHeight - 8) y = viewportHeight - tooltipRect.height - 8

    setCoords({ x, y })
  }

  useEffect(() => {
    if (isVisible) {
      updatePosition()
      window.addEventListener('scroll', updatePosition)
      window.addEventListener('resize', updatePosition)
    }

    return () => {
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isVisible, position])

  const getVariantStyles = () => {
    switch (variant) {
      case 'info':
        return 'bg-blue-50 text-blue-800 border-blue-200'
      case 'warning':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200'
      case 'help':
        return 'bg-purple-50 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-900 text-white border-gray-700'
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return 'text-xs px-2 py-1 max-w-xs'
      case 'large':
        return 'text-base px-4 py-3 max-w-lg'
      default:
        return 'text-sm px-3 py-2 max-w-sm'
    }
  }

  const getIcon = () => {
    switch (variant) {
      case 'info':
        return <Info className="h-4 w-4" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'help':
        return <HelpCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-block ${className}`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-50 rounded-lg border shadow-lg ${getVariantStyles()} ${getSizeStyles()}`}
          style={{
            left: coords.x,
            top: coords.y,
            pointerEvents: interactive ? 'auto' : 'none'
          }}
          role="tooltip"
        >
          <div className="flex items-start space-x-2">
            {getIcon() && (
              <div className="flex-shrink-0 mt-0.5">
                {getIcon()}
              </div>
            )}
            <div className="flex-1">
              {content}
            </div>
          </div>

          {showArrow && (
            <div
              className={`absolute w-2 h-2 transform rotate-45 ${getVariantStyles()} border`}
              style={{
                ...(position === 'top' && { bottom: '-4px', left: '50%', transform: 'translateX(-50%) rotate-45' }),
                ...(position === 'bottom' && { top: '-4px', left: '50%', transform: 'translateX(-50%) rotate-45' }),
                ...(position === 'left' && { right: '-4px', top: '50%', transform: 'translateY(-50%) rotate-45' }),
                ...(position === 'right' && { left: '-4px', top: '50%', transform: 'translateY(-50%) rotate-45' })
              }}
            />
          )}
        </div>
      )}
    </>
  )
}

// Pre-built tooltip components
export const HelpTooltip = ({ content, children, ...props }) => (
  <Tooltip content={content} variant="help" {...props}>
    {children || <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />}
  </Tooltip>
)

export const InfoTooltip = ({ content, children, ...props }) => (
  <Tooltip content={content} variant="info" {...props}>
    {children || <Info className="h-4 w-4 text-blue-500 hover:text-blue-700 cursor-help" />}
  </Tooltip>
)

export const WarningTooltip = ({ content, children, ...props }) => (
  <Tooltip content={content} variant="warning" {...props}>
    {children || <AlertTriangle className="h-4 w-4 text-yellow-500 hover:text-yellow-700 cursor-help" />}
  </Tooltip>
)

export default Tooltip