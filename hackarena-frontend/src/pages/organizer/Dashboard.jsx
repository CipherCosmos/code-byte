import toast from 'react-hot-toast';
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  Plus,
  Users,
  Play,
  Pause,
  BarChart3,
  Settings,
  Trophy,
  LogOut,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  Download,
  HelpCircle
} from 'lucide-react'
import { api } from '../../utils/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import { PageLoader } from '../../components/ProgressIndicator'
import { HelpTooltip } from '../../components/Tooltip'
import { useCommonShortcuts } from '../../hooks/useKeyboardShortcuts'
import Header from '../../components/Header'

const Dashboard = () => {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newGame, setNewGame] = useState({
    title: '',
    description: '',
    maxParticipants: 500,
    qualificationType: 'none',
    qualificationThreshold: 0
  })

  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Enable common keyboard shortcuts
  useCommonShortcuts()

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      const response = await api.get('/games')
      setGames(response.data)
    } catch (error) {
      console.error('Failed to fetch games:', error)
      toast.error('Failed to load games')
    } finally {
      setLoading(false)
    }
  }

  const createGame = async (e) => {
    e.preventDefault()
    
    if (!newGame.title.trim()) {
      toast.error('Game title is required')
      return
    }

    try {
      const response = await api.post('/games', newGame)
      setGames([response.data, ...games])
      setShowCreateModal(false)
      setNewGame({ title: '', description: '', maxParticipants: 500, qualificationType: 'none', qualificationThreshold: 0 })
      toast.success('Game created successfully!')
    } catch (error) {
      console.error('Failed to create game:', error)
      toast.error('Failed to create game')
    }
  }

  const deleteGame = async (gameId) => {
    if (!confirm('Are you sure you want to delete this game?')) return

    try {
      await api.delete(`/games/${gameId}`)
      setGames(games.filter(game => game.id !== gameId))
      toast.success('Game deleted successfully')
    } catch (error) {
      console.error('Failed to delete game:', error)
      toast.error('Failed to delete game')
    }
  }

  const handleExport = async (gameId, gameTitle, format) => {
    try {
      const response = await api.get(`/analytics/games/${gameId}/export/${format}`, {
        responseType: 'blob'
      })

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${gameTitle.replace(/[^a-zA-Z0-9]/g, '_')}_results.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success(`Exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error(`Failed to export ${format}:`, error)
      toast.error(`Failed to export as ${format.toUpperCase()}`)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Play className="h-3 w-3" />
      case 'paused': return <Pause className="h-3 w-3" />
      case 'completed': return <Trophy className="h-3 w-3" />
      default: return <Settings className="h-3 w-3" />
    }
  }

  if (loading) {
    return <PageLoader message="Loading your games..." />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Trophy className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Games</p>
                <p className="text-2xl font-bold text-gray-900">{games.length}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Play className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Games</p>
                <p className="text-2xl font-bold text-gray-900">
                  {games.filter(g => g.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Participants</p>
                <p className="text-2xl font-bold text-gray-900">
                  {games.reduce((sum, game) => sum + (game.participant_count || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed Games</p>
                <p className="text-2xl font-bold text-gray-900">
                  {games.filter(g => g.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Games Section */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-900">Your Games</h2>
            <HelpTooltip content="Create and manage your hackathon games. Each game can have up to 500 participants with real-time scoring and analytics.">
              <HelpCircle className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </HelpTooltip>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center"
            title="Create a new game (Ctrl+N)"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Game
          </button>
        </div>

        {games.length === 0 ? (
          <div className="card p-12 text-center">
            <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No games yet</h3>
            <p className="text-gray-600 mb-4">Create your first hackathon game to get started. Games can support up to 500 participants with real-time scoring.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Game
            </button>
            <div className="mt-4 text-sm text-gray-500">
              <p>💡 Tip: Use keyboard shortcuts - Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">G+D</kbd> to go to Dashboard, <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">?</kbd> for help</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <div key={game.id} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{game.title}</h3>
                    <p className="text-sm text-gray-600">{game.description || 'No description'}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(game.status)}`}>
                    {getStatusIcon(game.status)}
                    <span className="ml-1 capitalize">{game.status}</span>
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {game.participant_count || 0} participants
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {game.question_count || 0} questions
                  </div>
                  <div className="text-sm text-gray-600">
                    Code: <code className="bg-gray-100 px-2 py-1 rounded text-primary-600 font-mono">{game.game_code}</code>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Link
                    to={`/game-control/${game.id}`}
                    className="btn btn-primary flex-1 text-center"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Control
                  </Link>
                  {game.status === 'completed' && (
                    <>
                      <Link
                        to={`/game-analytics/${game.id}`}
                        className="btn btn-secondary"
                      >
                        <TrendingUp className="h-4 w-4" />
                      </Link>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleExport(game.id, game.title, 'csv')}
                          className="btn btn-secondary p-2"
                          title="Export as CSV"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleExport(game.id, game.title, 'pdf')}
                          className="btn btn-secondary p-2"
                          title="Export as PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                  <Link
                    to={`/leaderboard/${game.game_code}`}
                    className="btn btn-secondary"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => deleteGame(game.id)}
                    className="btn btn-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Game Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Game</h3>
            <form onSubmit={createGame} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Game Title *
                </label>
                <input
                  type="text"
                  value={newGame.title}
                  onChange={(e) => setNewGame(prev => ({ ...prev, title: e.target.value }))}
                  className="input w-full"
                  placeholder="Enter game title..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newGame.description}
                  onChange={(e) => setNewGame(prev => ({ ...prev, description: e.target.value }))}
                  className="input w-full h-20 resize-none"
                  placeholder="Enter game description..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Participants
                </label>
                <input
                  type="number"
                  value={newGame.maxParticipants}
                  onChange={(e) => setNewGame(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 500 }))}
                  className="input w-full"
                  min="10"
                  max="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qualification Type
                </label>
                <select
                  value={newGame.qualificationType}
                  onChange={(e) => setNewGame(prev => ({ ...prev, qualificationType: e.target.value }))}
                  className="input w-full"
                >
                  <option value="none">No Qualification</option>
                  <option value="top_n">Top N Participants</option>
                  <option value="top_percentage">Top X% of Participants</option>
                  <option value="custom_threshold">Custom Score Threshold</option>
                </select>
              </div>

              {newGame.qualificationType !== 'none' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {newGame.qualificationType === 'top_n' && 'Number of Qualifiers'}
                    {newGame.qualificationType === 'top_percentage' && 'Percentage (%)'}
                    {newGame.qualificationType === 'custom_threshold' && 'Minimum Score'}
                  </label>
                  <input
                    type="number"
                    value={newGame.qualificationThreshold}
                    onChange={(e) => setNewGame(prev => ({ ...prev, qualificationThreshold: parseInt(e.target.value) || 0 }))}
                    className="input w-full"
                    min="0"
                    max={newGame.qualificationType === 'top_percentage' ? 100 : undefined}
                    placeholder={
                      newGame.qualificationType === 'top_n' ? 'e.g., 10' :
                      newGame.qualificationType === 'top_percentage' ? 'e.g., 25' :
                      'e.g., 50'
                    }
                  />
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  Create Game
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard