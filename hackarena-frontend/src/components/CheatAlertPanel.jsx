import { useState, useEffect } from 'react';
import { AlertTriangle, X, Clock, User, Shield, Zap } from 'lucide-react';

const CheatAlertPanel = ({ socket, onDismiss, isVisible }) => {
  const [alerts, setAlerts] = useState([]);
  const [autoHideTimeout, setAutoHideTimeout] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleCheatAlert = (data) => {
      const newAlert = {
        id: Date.now(),
        type: data.type || 'warning',
        message: data.message,
        participantName: data.participantName,
        violationType: data.violationType,
        timestamp: new Date(),
        severity: data.severity || 'warning',
        penalty: data.penalty || 0,
        warningCount: data.warningCount || 1
      };

      setAlerts(prev => [newAlert, ...prev.slice(0, 4)]); // Keep only 5 most recent alerts

      // Auto-dismiss after 8 seconds for non-critical alerts
      if (newAlert.severity !== 'critical') {
        const timeout = setTimeout(() => {
          dismissAlert(newAlert.id);
        }, 8000);
        setAutoHideTimeout(timeout);
      }
    };

    socket.on('cheatAlert', handleCheatAlert);
    socket.on('participantViolation', handleCheatAlert);

    return () => {
      socket.off('cheatAlert', handleCheatAlert);
      socket.off('participantViolation', handleCheatAlert);
      if (autoHideTimeout) {
        clearTimeout(autoHideTimeout);
      }
    };
  }, [socket]);

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout);
    }
  };

  const getAlertStyle = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-700';
      case 'high':
        return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-700';
      case 'medium':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-yellow-700';
      default:
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-700';
    }
  };

  const getAlertIcon = (type, violationType) => {
    if (type === 'eliminate') return <Shield className="h-6 w-6" />;
    if (type === 'severe_warning') return <Zap className="h-6 w-6" />;

    switch (violationType) {
      case 'tab_switch': return <span className="text-xl">🔄</span>;
      case 'copy_paste': return <span className="text-xl">📋</span>;
      case 'right_click': return <span className="text-xl">🖱️</span>;
      case 'keyboard_shortcut': return <span className="text-xl">⌨️</span>;
      case 'multiple_tabs': return <span className="text-xl">📑</span>;
      default: return <AlertTriangle className="h-6 w-6" />;
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  if (!isVisible || alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`rounded-lg border-2 p-4 shadow-lg transform transition-all duration-300 animate-slide-in-right ${getAlertStyle(alert.severity)}`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {getAlertIcon(alert.type, alert.violationType)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 opacity-90" />
                  <span className="font-medium text-sm truncate">
                    {alert.participantName}
                  </span>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-sm font-medium mb-2 opacity-95">
                {alert.message}
              </p>

              <div className="flex items-center justify-between text-xs opacity-80">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(alert.timestamp)}
                  </span>
                  {alert.warningCount > 1 && (
                    <span className="bg-black bg-opacity-30 px-2 py-1 rounded-full">
                      #{alert.warningCount}
                    </span>
                  )}
                </div>

                {alert.penalty > 0 && (
                  <span className="bg-black bg-opacity-30 px-2 py-1 rounded-full">
                    -{alert.penalty}pts
                  </span>
                )}
              </div>

              {alert.violationType && (
                <div className="mt-2 text-xs opacity-75 bg-black bg-opacity-20 px-2 py-1 rounded">
                  {alert.violationType.replace('_', ' ').toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Progress bar for auto-dismiss */}
          {alert.severity !== 'critical' && (
            <div className="mt-3 bg-black bg-opacity-20 rounded-full h-1">
              <div className="bg-white bg-opacity-60 h-1 rounded-full animate-progress"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CheatAlertPanel;