import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Target, Clock, TrendingUp, ArrowLeft, BarChart3 } from 'lucide-react'
import { api } from '../../utils/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import toast from 'react-hot-toast'

const PostGameAnalytics = () => {
  console.log('PostGameAnalytics component rendered')
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/participants/analytics')
      setAnalytics(response.data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading your performance analytics..." />
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics Not Available</h2>
          <p className="text-gray-600 mb-4">You haven't participated in any completed games yet.</p>
          <Link to="/" className="btn btn-primary">Back to Home</Link>
        </div>
      </div>
    )
  }

  const { participant, stats, answers } = analytics

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Your DSBA Performance Analytics</h1>
              <p className="text-sm text-gray-600">DSBA Game completed • Final Rank #{participant.finalRank}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{participant.avatar}</span>
            <span className="font-medium">{participant.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Trophy className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Final Rank</p>
                <p className="text-2xl font-bold text-gray-900">#{participant.finalRank}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Accuracy</p>
                <p className="text-2xl font-bold text-gray-900">{stats.accuracy}%</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Score</p>
                <p className="text-2xl font-bold text-gray-900">{participant.totalScore}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Time</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageTime}s</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Performance */}
        <div className="card p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Question-by-Question Performance</h3>
          <div className="space-y-4">
            {answers.map((answer, index) => (
              <div key={index} className={`border rounded-lg p-4 ${
                answer.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        Question {index + 1}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        answer.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {answer.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                      {answer.hintUsed && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Hint Used
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 mb-2">{answer.questionText}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Your Answer:</p>
                        <p className={`font-medium ${answer.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          {answer.yourAnswer || 'No answer'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Correct Answer:</p>
                        <p className="font-medium text-green-700">{answer.correctAnswer}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-gray-900">{answer.scoreEarned} pts</p>
                    <p className="text-sm text-gray-600">out of {answer.maxScore}</p>
                    <p className="text-sm text-gray-600">{answer.timeTaken}s</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Statistics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Questions:</span>
                  <span className="font-medium">{stats.totalQuestions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Correct Answers:</span>
                  <span className="font-medium text-green-600">{stats.correctAnswers}</span>
                </div>
                <div className="flex justify-between">
                  <span>Incorrect Answers:</span>
                  <span className="font-medium text-red-600">{stats.totalQuestions - stats.correctAnswers}</span>
                </div>
                <div className="flex justify-between">
                  <span>Accuracy Rate:</span>
                  <span className="font-medium">{stats.accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Score Earned:</span>
                  <span className="font-medium">{stats.totalScore}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Time per Question:</span>
                  <span className="font-medium">{stats.averageTime}s</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Additional Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Cheat Warnings:</span>
                  <span className={`font-medium ${participant.cheatWarnings > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {participant.cheatWarnings}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Final Rank:</span>
                  <span className="font-medium">#{participant.finalRank}</span>
                </div>
                <div className="flex justify-between">
                  <span>Final Score:</span>
                  <span className="font-medium">{participant.totalScore}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default PostGameAnalytics