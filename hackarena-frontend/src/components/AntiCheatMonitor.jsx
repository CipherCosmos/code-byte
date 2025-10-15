import { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, Eye, Users, Activity, TrendingUp } from 'lucide-react';

const AntiCheatMonitor = ({ gameId, socket }) => {
  const [cheatStats, setCheatStats] = useState({
    totalWarnings: 0,
    activeViolations: 0,
    monitoredParticipants: 0,
    recentActivities: []
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleCheatUpdate = (data) => {
      setCheatStats(prev => ({
        ...prev,
        totalWarnings: data.totalWarnings || prev.totalWarnings,
        activeViolations: data.activeViolations || prev.activeViolations,
        monitoredParticipants: data.monitoredParticipants || prev.monitoredParticipants,
        recentActivities: data.recentActivities || prev.recentActivities
      }));

      // Add to real-time updates
      setRealTimeUpdates(prev => [{
        id: Date.now(),
        type: 'cheat_detected',
        participant: data.participantName,
        violation: data.violationType,
        timestamp: new Date().toLocaleTimeString(),
        severity: data.severity || 'warning'
      }, ...prev.slice(0, 9)]);
    };

    socket.on('cheatStatsUpdate', handleCheatUpdate);
    socket.on('participantViolation', handleCheatUpdate);

    return () => {
      socket.off('cheatStatsUpdate', handleCheatUpdate);
      socket.off('participantViolation', handleCheatUpdate);
    };
  }, [socket]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getViolationIcon = (type) => {
    switch (type) {
      case 'tab_switch': return '🔄';
      case 'copy_paste': return '📋';
      case 'right_click': return '🖱️';
      case 'keyboard_shortcut': return '⌨️';
      case 'multiple_tabs': return '📑';
      default: return '⚠️';
    }
  };

  return (
    <div className="card p-4 bg-gradient-to-r from-slate-50 to-blue-50 border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Anti-Cheat Monitor</h3>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
            Real-time
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 p-1"
        >
          <Activity className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="text-center p-2 bg-white rounded-lg border">
          <div className="text-xl font-bold text-blue-600">{cheatStats.totalWarnings}</div>
          <div className="text-xs text-gray-600">Total Warnings</div>
        </div>
        <div className="text-center p-2 bg-white rounded-lg border">
          <div className="text-xl font-bold text-red-500">{cheatStats.activeViolations}</div>
          <div className="text-xs text-gray-600">Active Violations</div>
        </div>
        <div className="text-center p-2 bg-white rounded-lg border">
          <div className="text-xl font-bold text-green-600">{cheatStats.monitoredParticipants}</div>
          <div className="text-xs text-gray-600">Monitored</div>
        </div>
        <div className="text-center p-2 bg-white rounded-lg border">
          <div className="text-xl font-bold text-purple-600">
            {cheatStats.monitoredParticipants > 0 ?
              Math.round((cheatStats.activeViolations / cheatStats.monitoredParticipants) * 100) : 0}%
          </div>
          <div className="text-xs text-gray-600">Violation Rate</div>
        </div>
      </div>

      {/* Expandable Real-time Feed */}
      {isExpanded && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <TrendingUp className="h-4 w-4 mr-1" />
            Recent Activities
          </h4>

          {realTimeUpdates.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <Eye className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No recent violations detected</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {realTimeUpdates.map((update) => (
                <div
                  key={update.id}
                  className={`flex items-center space-x-3 p-2 rounded-lg border ${getSeverityColor(update.severity)}`}
                >
                  <span className="text-lg">{getViolationIcon(update.violation)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm truncate">{update.participant}</span>
                      <span className="text-xs opacity-75">{update.violation.replace('_', ' ')}</span>
                    </div>
                    <div className="text-xs opacity-60">{update.timestamp}</div>
                  </div>
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex space-x-2 mt-4">
            <button className="btn btn-secondary text-xs py-1 px-3">
              View Details
            </button>
            <button className="btn btn-primary text-xs py-1 px-3">
              Export Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AntiCheatMonitor;