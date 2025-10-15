import { useState, useEffect } from 'react';
import { Clock, Target, TrendingUp, Award, Zap } from 'lucide-react';

const TimeScoringVisualizer = ({ questionData, currentAnswer, onTimeUpdate }) => {
  const [timeRemaining, setTimeRemaining] = useState(questionData?.timeLimit || 60);
  const [potentialScore, setPotentialScore] = useState(questionData?.marks || 10);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [timeBonus, setTimeBonus] = useState(0);
  const [isTimeCritical, setIsTimeCritical] = useState(false);

  useEffect(() => {
    if (!questionData) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = Math.max(0, prev - 1);

        // Calculate scoring factors
        const timeUsed = questionData.timeLimit - newTime;
        const timeRatio = timeUsed / questionData.timeLimit;

        // Speed multiplier (faster = higher multiplier)
        const newSpeedMultiplier = Math.max(0.5, 2 - (timeRatio * 1.5));
        setSpeedMultiplier(newSpeedMultiplier);

        // Time bonus points
        const newTimeBonus = Math.max(0, Math.round((1 - timeRatio) * questionData.marks * 0.3));
        setTimeBonus(newTimeBonus);

        // Base score with time decay
        const baseScore = questionData.marks;
        const timeDecay = Math.max(0.3, 1 - (timeRatio * 0.7)); // Minimum 30% of points
        const newPotentialScore = Math.round(baseScore * timeDecay * newSpeedMultiplier + newTimeBonus);
        setPotentialScore(newPotentialScore);

        // Critical time warning
        setIsTimeCritical(newTime <= 10);

        // Notify parent component
        if (onTimeUpdate) {
          onTimeUpdate({
            timeRemaining: newTime,
            potentialScore: newPotentialScore,
            speedMultiplier: newSpeedMultiplier,
            timeBonus: newTimeBonus
          });
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [questionData, onTimeUpdate]);

  const getTimeColor = () => {
    if (timeRemaining <= 10) return 'text-red-500';
    if (timeRemaining <= 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getTimeProgressColor = () => {
    if (timeRemaining <= 10) return 'bg-red-500';
    if (timeRemaining <= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getScoreColor = () => {
    if (potentialScore >= questionData?.marks * 1.5) return 'text-green-600';
    if (potentialScore >= questionData?.marks) return 'text-blue-600';
    return 'text-orange-600';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!questionData) return null;

  const timeProgress = (timeRemaining / questionData.timeLimit) * 100;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Clock className={`h-5 w-5 ${getTimeColor()}`} />
          <span className="font-semibold text-gray-900">Time-Based Scoring</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`text-sm font-medium px-2 py-1 rounded-full ${
            speedMultiplier >= 1.3 ? 'bg-green-100 text-green-800' :
            speedMultiplier >= 1.1 ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {speedMultiplier.toFixed(1)}x Speed
          </span>
          {isTimeCritical && (
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full animate-pulse">
              ⚠️ Critical Time
            </span>
          )}
        </div>
      </div>

      {/* Time Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Time Remaining</span>
          <span className={`text-lg font-bold ${getTimeColor()}`}>
            {formatTime(timeRemaining)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-1000 ${getTimeProgressColor()}`}
            style={{ width: `${timeProgress}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0:00</span>
          <span>{formatTime(questionData.timeLimit)}</span>
        </div>
      </div>

      {/* Scoring Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
        <div className="bg-white rounded-lg p-3 border">
          <div className="flex items-center space-x-2 mb-1">
            <Target className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Base Points</span>
          </div>
          <div className="text-lg font-bold text-blue-600">{questionData.marks}</div>
        </div>

        <div className="bg-white rounded-lg p-3 border">
          <div className="flex items-center space-x-2 mb-1">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">Time Bonus</span>
          </div>
          <div className="text-lg font-bold text-purple-600">+{timeBonus}</div>
        </div>

        <div className="bg-white rounded-lg p-3 border">
          <div className="flex items-center space-x-2 mb-1">
            <Award className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700">Potential Score</span>
          </div>
          <div className={`text-lg font-bold ${getScoreColor()}`}>{potentialScore}</div>
        </div>
      </div>

      {/* Scoring Explanation */}
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <div className="flex items-start space-x-2">
          <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <span className="font-medium">How it works:</span> Answer faster to earn higher scores!
            Current potential: <span className={`font-bold ${getScoreColor()}`}>{potentialScore} points</span>
            {timeBonus > 0 && (
              <span className="text-purple-600 ml-1">(+{timeBonus} time bonus)</span>
            )}
            {speedMultiplier > 1 && (
              <span className="text-green-600 ml-1">({speedMultiplier.toFixed(1)}x speed multiplier)</span>
            )}
          </div>
        </div>
      </div>

      {/* Performance Indicator */}
      {currentAnswer && (
        <div className="mt-3 text-center">
          <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            potentialScore >= questionData.marks * 1.5 ? 'bg-green-100 text-green-800' :
            potentialScore >= questionData.marks ? 'bg-blue-100 text-blue-800' :
            'bg-orange-100 text-orange-800'
          }`}>
            <TrendingUp className="h-3 w-3" />
            <span>
              {potentialScore >= questionData.marks * 1.5 ? 'Excellent Performance!' :
               potentialScore >= questionData.marks ? 'Good Performance!' :
               'Keep Going!'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeScoringVisualizer;