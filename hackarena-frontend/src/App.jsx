import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

// Organizer Pages
import Dashboard from './pages/organizer/Dashboard'
import GameControl from './pages/organizer/GameControl'
import GameAnalytics from './pages/organizer/GameAnalytics'

// Participant Pages
import JoinGame from './pages/participant/JoinGame'
import GameInterface from './pages/participant/GameInterface'
import PostGameAnalytics from './pages/participant/PostGameAnalytics'

// Public Pages
import PublicLeaderboard from './pages/public/PublicLeaderboard'
import Home from './pages/Home'

// Components
import LoadingSpinner from './components/LoadingSpinner'
import ToastManager from './components/ToastManager'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <ErrorBoundary>
      <ToastManager />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />

        {/* Participant Routes */}
        <Route path="/join/:gameCode?" element={<JoinGame />} />
        <Route path="/game/:gameCode" element={<GameInterface />} />
        <Route path="/analytics" element={<PostGameAnalytics />} />

        {/* Public Leaderboard */}
        <Route path="/leaderboard/:gameCode" element={<PublicLeaderboard />} />

        {/* Protected Organizer Routes */}
        <Route
          path="/dashboard"
          element={user ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/game-control/:gameId"
          element={user ? <GameControl /> : <Navigate to="/login" />}
        />
        <Route
          path="/game-analytics/:gameId"
          element={user ? <GameAnalytics /> : <Navigate to="/login" />}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App