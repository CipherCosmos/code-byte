import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, BarChart3, Users, Target, TrendingUp, Download } from 'lucide-react'
import { api } from '../../utils/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import AnalyticsCharts from '../../components/AnalyticsCharts'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import toast from 'react-hot-toast'

const GameAnalytics = () => {
  const { gameId } = useParams()
  const [game, setGame] = useState(null)
  const [analytics, setAnalytics] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchAnalytics()
  }, [gameId])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      // Fetch game details
      const gameResponse = await api.get(`/games/${gameId}`)
      setGame(gameResponse.data)

      // Fetch analytics data
      const [overviewRes, questionsRes, participantsRes, breakdownRes] = await Promise.all([
        api.get(`/analytics/games/${gameId}/overview`),
        api.get(`/analytics/games/${gameId}/questions`),
        api.get(`/analytics/games/${gameId}/participants`),
        api.get(`/analytics/games/${gameId}/performance-breakdown`)
      ])

      setAnalytics({
        overview: overviewRes.data,
        questions: questionsRes.data,
        participants: participantsRes.data,
        performanceBreakdown: breakdownRes.data
      })
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format) => {
    try {
      const response = await api.get(`/analytics/games/${gameId}/export/${format}`, {
        responseType: 'blob'
      })

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${game.title.replace(/[^a-zA-Z0-9]/g, '_')}_results.${format}`)
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'questions', label: 'Questions', icon: Target },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'performance-breakdown', label: 'Performance', icon: TrendingUp }
  ]

  if (loading) {
    return <LoadingSpinner message="Loading analytics..." />
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Game Not Found</h2>
          <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{game.title} - DSBA Analytics</h1>
              <p className="text-sm text-gray-600">DSBA Game Code: {game.game_code}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <span className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800">
               Completed
             </span>
             <div className="flex items-center space-x-2">
               <button
                 onClick={() => handleExport('csv')}
                 className="btn btn-secondary flex items-center"
               >
                 <Download className="h-4 w-4 mr-2" />
                 Export CSV
               </button>
               <button
                 onClick={() => handleExport('pdf')}
                 className="btn btn-secondary flex items-center"
               >
                 <Download className="h-4 w-4 mr-2" />
                 Export PDF
               </button>
             </div>
             <Link
               to={`/leaderboard/${game.game_code}`}
               target="_blank"
               className="btn btn-secondary"
             >
               View Public Board
             </Link>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Analytics Content */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <AnalyticsCharts data={analytics.overview} type="overview" />
          )}

          {activeTab === 'questions' && (
            <AnalyticsCharts data={analytics.questions} type="questions" />
          )}

          {activeTab === 'participants' && (
            <AnalyticsCharts data={analytics.participants} type="participants" />
          )}

          {activeTab === 'performance-breakdown' && (
            <AnalyticsCharts data={analytics.performanceBreakdown} type="performance-breakdown" />
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default GameAnalytics