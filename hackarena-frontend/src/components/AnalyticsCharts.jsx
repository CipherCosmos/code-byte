import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { BarChart3, TrendingUp } from 'lucide-react'

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0']

const AnalyticsCharts = ({ data, type }) => {
  if (!data) return null

  const renderOverviewCharts = () => {
    const { overview, game } = data

    // Score distribution chart data
    const scoreData = overview.scoreDistribution.map(item => ({
      range: item.range,
      count: item.count
    }))

    // Mock accuracy over time (would need time-series data from backend)
    const accuracyData = [
      { period: 'Early', accuracy: overview.overallAccuracy },
      { period: 'Mid', accuracy: overview.overallAccuracy },
      { period: 'Late', accuracy: overview.overallAccuracy }
    ]

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Score Distribution */}
        <div className="card p-8 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-dsba-navy rounded-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Score Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e40af',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Bar dataKey="count" fill="#1e40af" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Overall Statistics */}
        <div className="card p-8 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-dsba-gold rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">DSBA Game Overview</h3>
          </div>
          <div className="space-y-5">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700 font-medium">Total Participants:</span>
              <span className="font-bold text-dsba-navy text-lg">{overview.totalParticipants}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700 font-medium">Total Questions:</span>
              <span className="font-bold text-dsba-navy text-lg">{overview.totalQuestions}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-gray-700 font-medium">Overall Accuracy:</span>
              <span className="font-bold text-blue-700 text-lg">{overview.overallAccuracy}%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700 font-medium">Average Completion Time:</span>
              <span className="font-bold text-dsba-navy text-lg">{overview.averageCompletionTime}s</span>
            </div>
            {game.duration && (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700 font-medium">Game Duration:</span>
                <span className="font-bold text-dsba-navy text-lg">{Math.round(game.duration)} minutes</span>
              </div>
            )}
            {game.qualificationType && game.qualificationType !== 'none' && (
              <>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="text-gray-700 font-medium">Qualification Type:</span>
                  <span className="font-bold text-yellow-700 text-lg">
                    {game.qualificationType === 'top_n' && `Top ${game.qualificationThreshold}`}
                    {game.qualificationType === 'top_percentage' && `Top ${game.qualificationThreshold}%`}
                    {game.qualificationType === 'custom_threshold' && `Score ≥ ${game.qualificationThreshold}`}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-700 font-medium">Qualified Participants:</span>
                  <span className="font-bold text-green-700 text-lg">{overview.qualificationStats.qualifiedCount} ({overview.qualificationStats.qualificationRate}%)</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderQuestionAnalytics = () => {
    const { questions } = data

    return (
      <div className="space-y-6">
        {/* Question Accuracy Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Question-wise Accuracy</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={questions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="questionOrder" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [
                  name === 'accuracy' ? `${value}%` : value,
                  name === 'accuracy' ? 'Accuracy' : name
                ]}
              />
              <Bar dataKey="accuracy" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Average Time per Question */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Average Time per Question</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={questions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="questionOrder" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="averageTime" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Question Details Table */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Question Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Score</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {questions.map((question) => (
                  <tr key={question.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {question.questionOrder}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {question.questionText}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {question.totalAttempts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {question.accuracy}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {question.averageTime}s
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {question.averageScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderParticipantAnalytics = () => {
    const { participants, qualificationStats } = data

    // Accuracy distribution for pie chart
    const accuracyRanges = [
      { name: '90-100%', value: participants.filter(p => p.accuracy >= 90).length },
      { name: '70-89%', value: participants.filter(p => p.accuracy >= 70 && p.accuracy < 90).length },
      { name: '50-69%', value: participants.filter(p => p.accuracy >= 50 && p.accuracy < 70).length },
      { name: '0-49%', value: participants.filter(p => p.accuracy < 50).length }
    ].filter(range => range.value > 0)

    // Qualification status distribution
    const qualificationData = [
      { name: 'Qualified', value: qualificationStats.totalQualified, color: '#10B981' },
      { name: 'Not Qualified', value: participants.length - qualificationStats.totalQualified, color: '#EF4444' }
    ].filter(item => item.value > 0)

    return (
      <div className="space-y-6">
        {/* Qualification Status */}
        {qualificationStats.totalQualified > 0 && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Qualification Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={qualificationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {qualificationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col justify-center">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Participants:</span>
                    <span className="font-semibold">{participants.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Qualified:</span>
                    <span className="font-semibold text-green-600">{qualificationStats.totalQualified}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Not Qualified:</span>
                    <span className="font-semibold text-red-600">{participants.length - qualificationStats.totalQualified}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Qualification Rate:</span>
                    <span className="font-semibold">{qualificationStats.qualificationRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Accuracy Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Accuracy Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={accuracyRanges}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {accuracyRanges.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Performers */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
          <div className="space-y-3">
            {participants.slice(0, 10).map((participant, index) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-bold text-gray-500">#{index + 1}</span>
                  <span className="text-2xl">{participant.avatar}</span>
                  <div>
                    <p className="font-medium">{participant.name}</p>
                    <p className="text-sm text-gray-600">Rank #{participant.finalRank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{participant.totalScore} pts</p>
                  <p className="text-sm text-gray-600">{participant.accuracy}% accuracy</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Participant Details Table */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">All Participants</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Questions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qualified</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {participants.map((participant) => (
                  <tr key={participant.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{participant.finalRank}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <span className="mr-2">{participant.avatar}</span>
                        {participant.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {participant.totalScore}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {participant.questionsAttempted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {participant.accuracy}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {participant.averageTime}s
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        participant.qualified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {participant.qualified ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const renderPerformanceBreakdown = () => {
    const { performanceBreakdown } = data

    const breakdownData = [
      {
        period: 'Early Game',
        accuracy: performanceBreakdown.earlyGame.accuracy,
        avgTime: performanceBreakdown.earlyGame.avgTime,
        avgScore: performanceBreakdown.earlyGame.avgScore,
        count: performanceBreakdown.earlyGame.count
      },
      {
        period: 'Mid Game',
        accuracy: performanceBreakdown.midGame.accuracy,
        avgTime: performanceBreakdown.midGame.avgTime,
        avgScore: performanceBreakdown.midGame.avgScore,
        count: performanceBreakdown.midGame.count
      },
      {
        period: 'Late Game',
        accuracy: performanceBreakdown.lateGame.accuracy,
        avgTime: performanceBreakdown.lateGame.avgTime,
        avgScore: performanceBreakdown.lateGame.avgScore,
        count: performanceBreakdown.lateGame.count
      }
    ]

    return (
      <div className="space-y-6">
        {/* Performance Over Time */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Breakdown by Game Phase</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={breakdownData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="accuracy" fill="#8884d8" name="Accuracy (%)" />
              <Line yAxisId="right" type="monotone" dataKey="avgTime" stroke="#82ca9d" name="Avg Time (s)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {breakdownData.map((period) => (
            <div key={period.period} className="card p-4">
              <h4 className="font-semibold mb-2">{period.period}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Accuracy:</span>
                  <span className="font-medium">{period.accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Time:</span>
                  <span className="font-medium">{period.avgTime}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Score:</span>
                  <span className="font-medium">{period.avgScore}</span>
                </div>
                <div className="flex justify-between">
                  <span>Answers:</span>
                  <span className="font-medium">{period.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  switch (type) {
    case 'overview':
      return renderOverviewCharts()
    case 'questions':
      return renderQuestionAnalytics()
    case 'participants':
      return renderParticipantAnalytics()
    case 'performance-breakdown':
      return renderPerformanceBreakdown()
    default:
      return <div>Unknown analytics type</div>
  }
}

export default AnalyticsCharts