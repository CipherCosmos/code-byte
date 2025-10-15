import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home, ArrowLeft } from 'lucide-react'

const BreadcrumbNavigation = ({
  customBreadcrumbs = [],
  showBackButton = true,
  backTo = null,
  backLabel = 'Back'
}) => {
  const location = useLocation()

  // Generate breadcrumbs from current path
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const breadcrumbs = [{ label: 'Home', path: '/', icon: Home }]

    let currentPath = ''
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`

      // Human-readable labels for common routes
      const labels = {
        dashboard: 'Dashboard',
        'game-control': 'Game Control',
        'game-analytics': 'Analytics',
        join: 'Join Game',
        game: 'Game',
        analytics: 'Results',
        leaderboard: 'Leaderboard',
        login: 'Login',
        register: 'Register'
      }

      const label = labels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
      const isLast = index === pathSegments.length - 1

      breadcrumbs.push({
        label,
        path: currentPath,
        isActive: isLast
      })
    })

    return breadcrumbs
  }

  const breadcrumbs = customBreadcrumbs.length > 0 ? customBreadcrumbs : generateBreadcrumbs()

  // Determine back navigation
  const getBackNavigation = () => {
    if (backTo) return backTo

    // Default back logic
    const pathSegments = location.pathname.split('/').filter(Boolean)
    if (pathSegments.length <= 1) return '/'

    // Remove last segment
    const backPath = '/' + pathSegments.slice(0, -1).join('/')
    return backPath
  }

  const backPath = getBackNavigation()

  return (
    <nav className="flex items-center justify-between py-4 px-4 bg-white border-b border-gray-200">
      {/* Back Button */}
      {showBackButton && backPath !== location.pathname && (
        <Link
          to={backPath}
          className="flex items-center space-x-2 text-gray-600 hover:text-dsba-navy transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">{backLabel}</span>
        </Link>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.path} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
            )}

            {crumb.isActive ? (
              <span className="flex items-center space-x-1 text-dsba-navy font-medium">
                {crumb.icon && <crumb.icon className="h-4 w-4" />}
                <span>{crumb.label}</span>
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="flex items-center space-x-1 text-gray-600 hover:text-dsba-navy transition-colors"
              >
                {crumb.icon && <crumb.icon className="h-4 w-4" />}
                <span>{crumb.label}</span>
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Spacer for centering breadcrumbs when back button is present */}
      {showBackButton && backPath !== location.pathname && (
        <div className="w-16" /> // Same width as back button area
      )}
    </nav>
  )
}

// Specialized breadcrumb components for common pages
export const GameBreadcrumbs = ({ gameId, gameTitle, currentPage }) => {
  const breadcrumbs = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Dashboard', path: '/dashboard' },
    { label: gameTitle || 'Game Control', path: `/game-control/${gameId}`, isActive: currentPage === 'control' },
  ]

  if (currentPage === 'analytics') {
    breadcrumbs.push({
      label: 'Analytics',
      path: `/game-analytics/${gameId}`,
      isActive: true
    })
  }

  return <BreadcrumbNavigation customBreadcrumbs={breadcrumbs} />
}

export const ParticipantBreadcrumbs = ({ gameCode, currentPage }) => {
  const breadcrumbs = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Join Game', path: `/join/${gameCode}` },
  ]

  if (currentPage === 'game') {
    breadcrumbs.push({
      label: 'Game',
      path: `/game/${gameCode}`,
      isActive: true
    })
  } else if (currentPage === 'analytics') {
    breadcrumbs.push({
      label: 'Results',
      path: '/analytics',
      isActive: true
    })
  }

  return <BreadcrumbNavigation customBreadcrumbs={breadcrumbs} />
}

export default BreadcrumbNavigation