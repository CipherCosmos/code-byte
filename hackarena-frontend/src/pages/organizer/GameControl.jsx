import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Users,
  Play,
  Pause,
  Square,
  SkipForward,
  Eye,
  EyeOff,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  UserX,
  Settings,
  Trophy,
  Clock,
  Target,
  BarChart3,
  TrendingUp
} from 'lucide-react'
import { api } from '../../utils/api'
import socketManager from '../../utils/socket'
import LoadingSpinner from '../../components/LoadingSpinner'
import GameCodeDisplay from '../../components/GameCodeDisplay'
import QuestionForm from '../../components/QuestionForm'
import AnalyticsCharts from '../../components/AnalyticsCharts'
import Header from '../../components/Header'
import toast from 'react-hot-toast'

const GameControl = () => {
  const { gameId } = useParams()
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)
  const [liveStats, setLiveStats] = useState({
    connectedParticipants: 0,
    answeredCount: 0,
    currentQuestionStats: null
  })
  const [analytics, setAnalytics] = useState(null)
  const [socket, setSocket] = useState(null)
  const [isPaused, setIsPaused] = useState(false)
  const [eliminatedParticipants, setEliminatedParticipants] = useState([])
  const [flaggedParticipants, setFlaggedParticipants] = useState([])
  const [cheatStats, setCheatStats] = useState(null)

  useEffect(() => {
    fetchGameDetails()
    fetchFlaggedParticipants()
    
    // Setup socket connection
    const socketConnection = socketManager.connect()
    setSocket(socketConnection)

    return () => {
      if (socketConnection) {
        socketConnection.off('participantCountUpdate')
        socketConnection.off('participantFlagged')
        socketConnection.off('liveAnalytics')
        socketConnection.off('answerSubmitted')
      }
    }
  }, [gameId])

  useEffect(() => {
    if (socket && game) {
      // Join organizer room
      socket.emit('joinGameRoom', {
        gameCode: game.game_code,
        role: 'organizer'
      })

      // Listen for live updates
      socket.on('participantCountUpdate', (data) => {
        setLiveStats(prev => ({ ...prev, connectedParticipants: data.count }))
      })

      socket.on('participantFlagged', (data) => {
        toast.error(`Participant ${data.name} flagged for ${data.cheatType}`)
        fetchGameDetails() // Refresh participant list
      })

      socket.on('liveAnalytics', (data) => {
        setLiveStats(prev => ({ ...prev, currentQuestionStats: data }))
      })

      socket.on('answerSubmitted', (data) => {
        setLiveStats(prev => ({ ...prev, answeredCount: prev.answeredCount + 1 }))
      })

      // Request live analytics
      socket.emit('requestLiveAnalytics', { gameId: game.id })
    }
  }, [socket, game])

  const fetchGameDetails = async () => {
    try {
      const response = await api.get(`/games/${gameId}`)
      setGame(response.data)
      setIsPaused(response.data.status === 'paused')
      setLiveStats(prev => ({
        ...prev,
        connectedParticipants: response.data.participants?.length || 0
      }))

      // Separate eliminated participants
      const eliminated = response.data.participants?.filter(p => p.status === 'eliminated') || []
      setEliminatedParticipants(eliminated)

      // Fetch flagged participants and cheat stats
      fetchFlaggedParticipants()

      // Fetch analytics if game is completed
      if (response.data.status === 'completed') {
        try {
          const analyticsResponse = await api.get(`/analytics/games/${gameId}/overview`)
          setAnalytics(analyticsResponse.data)
        } catch (analyticsError) {
          console.error('Failed to fetch analytics:', analyticsError)
        }
      }
    } catch (error) {
      console.error('Failed to fetch game details:', error)
      toast.error('Failed to load game details')
    } finally {
      setLoading(false)
    }
  }

  const fetchFlaggedParticipants = async () => {
    try {
      const response = await api.get(`/participants/flagged/${gameId}`)
      setFlaggedParticipants(response.data.flaggedParticipants || [])
      setCheatStats(response.data.cheatStats || null)
    } catch (error) {
      console.error('Failed to fetch flagged participants:', error)
    }
  }

  const startGame = async () => {
    if (!game.questions || game.questions.length === 0) {
      toast.error('Add at least one question before starting the game')
      return
    }

    try {
      await api.post(`/games/${gameId}/start`)
      toast.success('Game started! Timer begins with first question.')
      fetchGameDetails()
    } catch (error) {
      console.error('Failed to start game:', error)
      toast.error('Failed to start game')
    }
  }

  const nextQuestion = async () => {
    try {
      await api.post(`/games/${gameId}/next-question`)
      toast.success('Next question started! Timer begins now.')
      setLiveStats(prev => ({ ...prev, answeredCount: 0 }))
      fetchGameDetails()
    } catch (error) {
      console.error('Failed to start next question:', error)
      toast.error(error.response?.data?.error || 'Failed to start next question')
    }
  }

  const revealAnswer = async () => {
    try {
      await api.post(`/games/${gameId}/reveal-answer`)
      toast.success('Answer revealed!')
      fetchGameDetails()
    } catch (error) {
      console.error('Failed to reveal answer:', error)
      toast.error('Failed to reveal answer')
    }
  }

  const endGame = async () => {
    if (!confirm('Are you sure you want to end this game?')) return

    try {
      await api.post(`/games/${gameId}/end`)
      toast.success('Game ended successfully!')
      fetchGameDetails()
    } catch (error) {
      console.error('Failed to end game:', error)
      toast.error('Failed to end game')
    }
  }

  const pauseGame = async () => {
    try {
      await api.post(`/games/${gameId}/pause`)
      toast.success('Game paused successfully!')
      setIsPaused(true)
      fetchGameDetails()
    } catch (error) {
      console.error('Failed to pause game:', error)
      toast.error('Failed to pause game')
    }
  }

  const resumeGame = async () => {
    try {
      await api.post(`/games/${gameId}/resume`)
      toast.success('Game resumed successfully!')
      setIsPaused(false)
      fetchGameDetails()
    } catch (error) {
      console.error('Failed to resume game:', error)
      toast.error('Failed to resume game')
    }
  }

  const saveQuestion = async (questionData) => {
    try {
      if (editingQuestion) {
        await api.put(`/games/${gameId}/questions/${editingQuestion.id}`, questionData)
        toast.success('Question updated successfully!')
      } else {
        await api.post(`/games/${gameId}/questions`, questionData)
        toast.success('Question added successfully!')
      }

      setShowQuestionForm(false)
      setEditingQuestion(null)
      fetchGameDetails()
    } catch (error) {
      console.error('Failed to save question:', error)
      toast.error('Failed to save question')
    }
  }

  const deleteQuestion = async (questionId) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    try {
      await api.delete(`/games/${gameId}/questions/${questionId}`)
      toast.success('Question deleted successfully!')
      fetchGameDetails()
    } catch (error) {
      console.error('Failed to delete question:', error)
      toast.error('Failed to delete question')
    }
  }

  const eliminateParticipant = async (participantId) => {
    if (!confirm('Are you sure you want to eliminate this participant?')) return

    try {
      socket?.emit('eliminateParticipant', { participantId, gameId })
      toast.success('Participant eliminated')
      fetchGameDetails()
    } catch (error) {
      console.error('Failed to eliminate participant:', error)
      toast.error('Failed to eliminate participant')
    }
  }

  const warnParticipant = async (participantId) => {
    const penalty = prompt('Enter penalty points (default: 5):', '5')
    if (penalty === null) return

    try {
      socket?.emit('warnParticipant', {
        participantId,
        gameId,
        customPenalty: parseInt(penalty) || 5
      })
      toast.success('Warning sent to participant')
      fetchGameDetails()
    } catch (error) {
      console.error('Failed to warn participant:', error)
      toast.error('Failed to warn participant')
    }
  }

  const reAdmitParticipant = async (participantId) => {
    if (!confirm('Are you sure you want to re-admit this participant?')) return

    try {
      socket?.emit('reAdmitParticipant', { participantId, gameId })
      toast.success('Participant re-admitted successfully')
      fetchGameDetails()
      fetchFlaggedParticipants()
    } catch (error) {
      console.error('Failed to re-admit participant:', error)
      toast.error('Failed to re-admit participant')
    }
  }

  const applyPenalty = async (participantId, currentScore = 0) => {
    const penaltyPoints = prompt(`Enter penalty points (current score: ${currentScore}):`, '10')
    if (penaltyPoints === null) return

    const reason = prompt('Enter reason for penalty:', 'Anti-cheat violation')
    if (reason === null) return

    try {
      await api.post(`/participants/penalty/${participantId}`, {
        penaltyType: 'manual',
        penaltyPoints: parseInt(penaltyPoints) || 10,
        reason: reason,
        organizerId: game.organizer_id
      })
      
      toast.success(`Penalty of ${penaltyPoints} points applied`)
      fetchGameDetails()
      fetchFlaggedParticipants()
    } catch (error) {
      console.error('Failed to apply penalty:', error)
      toast.error('Failed to apply penalty')
    }
  }

  const getCurrentQuestion = () => {
    if (!game?.questions || !game?.current_question_index) return null
    return game.questions.find(q => q.question_order === game.current_question_index)
  }

  if (loading) {
    return <LoadingSpinner message="Loading game control panel..." />
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

  const currentQuestion = getCurrentQuestion()
  const activeParticipants = game.participants?.filter(p => p.status === 'active') || []
  const eliminatedParticipantsList = game.participants?.filter(p => p.status === 'eliminated') || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
              ← Code Byte Dashboard
            </Link>
            <h1 className="text-xl font-bold text-gray-900">{game.title}</h1>
            <span className={`px-3 py-1 text-sm rounded-full ${
              game.status === 'active' ? 'bg-green-100 text-green-800' :
              game.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
              game.status === 'completed' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {game.status}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to={`/leaderboard/${game.game_code}`}
              target="_blank"
              className="btn btn-secondary"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Public Board
            </Link>

            <div className="flex items-center space-x-2">
              {game.status === 'draft' && (
                <button onClick={startGame} className="btn btn-primary">
                  <Play className="h-4 w-4 mr-2" />
                  Start Game
                </button>
              )}

              {game.status === 'active' && (
                <>
                  <button onClick={pauseGame} className="btn btn-secondary">
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Game
                  </button>
                  <button onClick={nextQuestion} className="btn btn-primary">
                    <SkipForward className="h-4 w-4 mr-2" />
                    Next Question
                  </button>
                  <button onClick={revealAnswer} className="btn btn-secondary">
                    <Eye className="h-4 w-4 mr-2" />
                    Reveal Answer
                  </button>
                  <button onClick={endGame} className="btn btn-danger">
                    <Square className="h-4 w-4 mr-2" />
                    End Game
                  </button>
                </>
              )}

              {game.status === 'paused' && (
                <>
                  <button onClick={resumeGame} className="btn btn-primary">
                    <Play className="h-4 w-4 mr-2" />
                    Resume Game
                  </button>
                  <button onClick={endGame} className="btn btn-danger">
                    <Square className="h-4 w-4 mr-2" />
                    End Game
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Game Info & Current Question */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game Code */}
            <GameCodeDisplay
              gameCode={game.game_code}
              qrCode={game.qrCode}
              joinUrl={game.joinUrl}
            />

            {/* Live Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Connected</p>
                    <p className="text-xl font-bold">{liveStats.connectedParticipants}</p>
                  </div>
                </div>
              </div>
              
              <div className="card p-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Answered</p>
                    <p className="text-xl font-bold">{liveStats.answeredCount}</p>
                  </div>
                </div>
              </div>
              
              <div className="card p-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Questions</p>
                    <p className="text-xl font-bold">{game.questions?.length || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="card p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Current Q</p>
                    <p className="text-xl font-bold">{game.current_question_index || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Question Display */}
            {currentQuestion && game.status === 'active' && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Current Question</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">
                      Question {currentQuestion.question_order}
                    </span>
                    <span className="text-sm text-blue-600">
                      {currentQuestion.time_limit}s • {currentQuestion.marks} pts
                    </span>
                  </div>
                  <p className="text-gray-900 font-medium mb-2">{currentQuestion.question_text}</p>
                  {currentQuestion.options && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {(Array.isArray(currentQuestion.options)
                        ? currentQuestion.options
                        : typeof currentQuestion.options === 'string'
                          ? currentQuestion.options.startsWith('[')
                            ? (() => { try { return JSON.parse(currentQuestion.options); } catch { return currentQuestion.options.split(','); } })()
                            : currentQuestion.options.split(',')
                          : []
                      ).map((option, index) => (
                        <span key={index} className="text-gray-700">
                          {String.fromCharCode(65 + index)}. {option}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Questions Management */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Questions</h3>
                <button
                  onClick={() => setShowQuestionForm(true)}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </button>
              </div>

              {game.questions?.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No questions added yet</p>
                  <button
                    onClick={() => setShowQuestionForm(true)}
                    className="btn btn-primary"
                  >
                    Add First Question
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {game.questions?.map((question, index) => (
                    <div
                      key={question.id}
                      className={`border rounded-lg p-4 ${
                        question.question_order === game.current_question_index
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-gray-600">
                              Q{question.question_order}
                            </span>
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                              {question.question_type.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {question.time_limit}s • {question.marks}pts
                            </span>
                          </div>
                          <p className="font-medium text-gray-900 mb-2">
                            {question.question_text}
                          </p>
                          {question.hint && (
                            <p className="text-sm text-gray-600">
                              Hint: {question.hint} (-{question.hint_penalty}pts)
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => {
                              setEditingQuestion(question)
                              setShowQuestionForm(true)
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteQuestion(question.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Participants & Analytics */}
          <div className="space-y-6">
            {/* Flagged Participants Alert */}
            {flaggedParticipants.length > 0 && (
              <div className="card p-4 border-red-200 bg-red-50">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-800">Flagged Participants</h3>
                </div>
                <div className="space-y-2">
                  {flaggedParticipants.map(participant => (
                    <div key={participant.id} className="flex items-center justify-between">
                      <span className="text-sm">
                        {participant.avatar} {participant.name}
                        <span className="text-red-600 ml-2">
                          ({participant.cheat_warnings} warnings)
                        </span>
                      </span>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => warnParticipant(participant.id)}
                          className="text-xs btn btn-secondary"
                        >
                          Warn
                        </button>
                        <button
                          onClick={() => eliminateParticipant(participant.id)}
                          className="text-xs btn btn-danger"
                        >
                          <UserX className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Eliminated Participants */}
            {eliminatedParticipantsList.length > 0 && (
              <div className="card p-4 border-orange-200 bg-orange-50">
                <div className="flex items-center space-x-2 mb-3">
                  <UserX className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-800">Eliminated Participants</h3>
                </div>
                <div className="space-y-2">
                  {eliminatedParticipantsList.map(participant => (
                    <div key={participant.id} className="flex items-center justify-between">
                      <span className="text-sm">
                        {participant.avatar} {participant.name}
                        <span className="text-orange-600 ml-2">
                          (Eliminated)
                        </span>
                      </span>
                      <button
                        onClick={() => reAdmitParticipant(participant.id)}
                        className="text-xs btn btn-primary"
                      >
                        Re-admit
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Leaderboard */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Live Leaderboard</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activeParticipants
                  .sort((a, b) => b.total_score - a.total_score)
                  .slice(0, 10)
                  .map((participant, index) => (
                    <div key={participant.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
                      <span className="text-sm font-medium text-gray-500 w-6">
                        #{index + 1}
                      </span>
                      <span className="text-lg">{participant.avatar}</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{participant.name}</p>
                        <p className="text-sm text-gray-600">{participant.total_score} points</p>
                      </div>
                      {participant.cheat_warnings > 0 && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Flagged Participants - Anti-Cheat Monitoring */}
            {flaggedParticipants.length > 0 && (
              <div className="card p-6 border-l-4 border-red-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-red-800 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Flagged Participants ({flaggedParticipants.length})
                  </h3>
                  {cheatStats && (
                    <div className="text-sm text-gray-600">
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                        {cheatStats.critical_count || 0} Critical
                      </span>
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded ml-2">
                        {cheatStats.high_risk_count || 0} High Risk
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {flaggedParticipants.map(participant => (
                    <div key={participant.id} className={`p-3 rounded-lg border ${
                      participant.risk_level === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                      participant.risk_level === 'HIGH' ? 'bg-orange-50 border-orange-200' :
                      participant.risk_level === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{participant.avatar}</span>
                          <div>
                            <p className="font-medium text-gray-900">{participant.name}</p>
                            <div className="flex items-center space-x-2 text-sm">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                participant.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                participant.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                participant.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {participant.risk_level} RISK
                              </span>
                              <span className="text-gray-600">
                                Score: {participant.total_score} • Cheat Score: {participant.cheat_score}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => applyPenalty(participant.id, participant.total_score)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Apply penalty"
                          >
                            <Target className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => eliminateParticipant(participant.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Eliminate participant"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {participant.cheat_events && participant.cheat_events.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          <details>
                            <summary className="cursor-pointer hover:text-gray-800">
                              Recent violations ({participant.cheat_events.length})
                            </summary>
                            <div className="mt-1 space-y-1 max-h-20 overflow-y-auto">
                              {participant.cheat_events.slice(-3).map((event, idx) => (
                                <div key={idx} className="text-xs bg-white/50 p-1 rounded">
                                  {event.type}: {event.description}
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Participants */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">
                All Participants ({activeParticipants.length})
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {activeParticipants.map(participant => (
                  <div key={participant.id} className={`flex items-center justify-between p-2 rounded hover:bg-gray-50 ${
                    participant.cheat_warnings > 0 ? 'border-l-4 border-orange-400 bg-orange-50/30' : ''
                  }`}>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{participant.avatar}</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">{participant.name}</p>
                          {participant.cheat_warnings > 0 && (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Rank #{participant.current_rank} • {participant.total_score} pts
                          {participant.cheat_warnings > 0 && (
                            <span className="text-orange-600 ml-2">({participant.cheat_warnings} warnings)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {participant.cheat_warnings > 0 && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                          {participant.cheat_warnings} warns
                        </span>
                      )}
                      <button
                        onClick={() => applyPenalty(participant.id, participant.total_score)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Apply penalty"
                      >
                        <Target className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => warnParticipant(participant.id)}
                        className="text-yellow-600 hover:text-yellow-800 p-1"
                        title="Warn participant"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => eliminateParticipant(participant.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Eliminate participant"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Analytics - Only show for completed games */}
            {game.status === 'completed' && analytics && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Game Analytics</h3>
                  <Link
                    to={`/game-analytics/${game.id}`}
                    className="btn btn-secondary text-sm"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Full Analytics
                  </Link>
                </div>
                <AnalyticsCharts data={analytics} type="overview" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Question Form Modal */}
      {showQuestionForm && (
        <QuestionForm
          question={editingQuestion}
          onSave={saveQuestion}
          onCancel={() => {
            setShowQuestionForm(false)
            setEditingQuestion(null)
          }}
        />
      )}
    </div>
  )
}

export default GameControl