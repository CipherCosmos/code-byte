import { useState, useEffect } from 'react';
import { User, AlertTriangle, Clock, TrendingUp, Shield, X } from 'lucide-react';

const ParticipantCheatDetails = ({ participantId, socket, onClose }) => {
  const [participantData, setParticipantData] = useState(null);
  const [cheatHistory, setCheatHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [realTimeStats, setRealTimeStats] = useState({
    currentWarnings: 0,
    totalPenalties: 0,
    riskLevel: 'low',
    lastActivity: null
  });

  useEffect(() => {
    if (!socket || !participantId) return;

    // Request participant cheat details
    socket.emit('getParticipantCheatDetails', { participantId });

    const handleParticipantData = (data) => {
      if (data.participantId === participantId) {
        setParticipantData(data.participant);
        setCheatHistory(data.cheatHistory || []);
        setRealTimeStats({
          currentWarnings: data.currentWarnings || 0,
          totalPenalties: data.totalPenalties || 0,
          riskLevel: data.riskLevel || 'low',
          lastActivity: data.lastActivity ? new Date(data.lastActivity) : null
        });
        setLoading(false);
      }
    };

    const handleRealTimeUpdate = (data) => {
      if (data.participantId === participantId) {
        setRealTimeStats(prev => ({
          ...prev,
          currentWarnings: data.currentWarnings || prev.currentWarnings,
          totalPenalties: data.totalPenalties || prev.totalPenalties,
          riskLevel: data.riskLevel || prev.riskLevel,
          lastActivity: data.lastActivity ? new Date(data.lastActivity) : prev.lastActivity
        }));

        if (data.newViolation) {
          setCheatHistory(prev => [data.newViolation, ...prev]);
        }
      }
    };

    socket.on('participantCheatDetails', handleParticipantData);
    socket.on('participantCheatUpdate', handleRealTimeUpdate);

    return () => {
      socket.off('participantCheatDetails', handleParticipantData);
      socket.off('participantCheatUpdate', handleRealTimeUpdate);
    };
  }, [socket, participantId]);

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      default: return 'bg-green-500 text-white';
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

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading participant cheat details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{participantData?.avatar || '👤'}</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{participantData?.name}</h2>
              <p className="text-sm text-gray-600">ID: {participantId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(realTimeStats.riskLevel)}`}>
              {realTimeStats.riskLevel.toUpperCase()} RISK
            </span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Real-time Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card p-4 text-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-600">{realTimeStats.currentWarnings}</div>
              <div className="text-sm text-gray-600">Active Warnings</div>
            </div>

            <div className="card p-4 text-center">
              <TrendingUp className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">{realTimeStats.totalPenalties}</div>
              <div className="text-sm text-gray-600">Total Penalties</div>
            </div>

            <div className="card p-4 text-center">
              <Shield className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{cheatHistory.length}</div>
              <div className="text-sm text-gray-600">Total Violations</div>
            </div>

            <div className="card p-4 text-center">
              <Clock className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-lg font-bold text-green-600">
                {realTimeStats.lastActivity ? formatTime(realTimeStats.lastActivity) : 'Never'}
              </div>
              <div className="text-sm text-gray-600">Last Activity</div>
            </div>
          </div>

          {/* Violation History */}
          <div className="card p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
              Violation History
            </h3>

            {cheatHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No violations recorded for this participant</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cheatHistory.map((violation, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getViolationIcon(violation.type)}</span>
                        <div>
                          <span className="font-medium text-gray-900 capitalize">
                            {violation.type.replace('_', ' ')}
                          </span>
                          <div className="text-sm text-gray-500">
                            {formatTime(violation.timestamp)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {violation.penalty > 0 && (
                          <span className="text-red-600 font-medium">
                            -{violation.penalty}pts
                          </span>
                        )}
                        <div className="text-xs text-gray-500">
                          Warning #{violation.warningCount || 1}
                        </div>
                      </div>
                    </div>

                    {violation.details && (
                      <p className="text-sm text-gray-600 mt-2">{violation.details}</p>
                    )}

                    {violation.severity && (
                      <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                        violation.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        violation.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        violation.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {violation.severity.toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button className="btn btn-secondary">
              View Full Report
            </button>
            <button className="btn btn-primary">
              Take Action
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantCheatDetails;