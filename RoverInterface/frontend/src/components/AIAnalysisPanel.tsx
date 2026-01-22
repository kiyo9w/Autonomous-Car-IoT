import { useState, useEffect } from 'react';
import { Brain, Activity, Zap, Play, Pause } from 'lucide-react';

interface AIAnalysisPanelProps {
  onAiCommand: (command: string) => void;
  onAiControlChange: (active: boolean) => void;
  onCurrentActionChange: (action: string | null) => void;
}

export function AIAnalysisPanel({
  onAiCommand,
  onAiControlChange,
  onCurrentActionChange
}: AIAnalysisPanelProps) {
  const [thinking, setThinking] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [analysis, setAnalysis] = useState({
    status: 'analyzing',
    message: 'Obstacle detected ahead',
    suggestion: 'L', // ESP32 command: L = Turn Left
    confidence: 0.87
  });
  const [autoMode, setAutoMode] = useState(false);

  // Poll AI status from backend
  useEffect(() => {
    let mounted = true;

    const pollStatus = async () => {
      try {
        // Use port 8080 for backend API (where app.py runs)
        const apiBase = `http://${window.location.hostname}:8080`;
        const response = await fetch(`${apiBase}/api/ai_status`);
        if (!mounted || !response.ok) return;

        const data = await response.json();

        // Debug: Log received data to browser console
        console.log('AI Status received:', data);

        // Always update if we have reasoning data
        const reasoning = data.last_reasoning || data.stats?.last_reasoning || '';
        const cmd = data.last_cmd || data.stats?.last_cmd || '';

        if (reasoning) {
          setThinking(reasoning);
          setAnalysis(prev => ({
            ...prev,
            message: reasoning,
            suggestion: cmd || prev.suggestion,
            confidence: 0.9
          }));
        }

        setIsThinking(data.running && !data.strategic_ready);
      } catch (e) {
        console.error("Failed to poll AI status", e);
      }
    };

    const interval = setInterval(pollStatus, 1000);
    pollStatus(); // Call immediately on mount
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleAutoModeToggle = () => {
    const newAutoMode = !autoMode;
    setAutoMode(newAutoMode);
    onAiControlChange(newAutoMode);
  };

  return (
    <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="p-1 bg-purple-50 rounded-lg">
            <Brain className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-gray-900 text-xs">AI Analysis</h2>
            <p className="text-xs text-gray-500">Decision System</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleAutoModeToggle}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg transition-all text-xs ${autoMode
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {autoMode ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span className="text-xs">{autoMode ? 'AUTO' : 'MANUAL'}</span>
          </button>
          <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${isThinking ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
            }`}>
            <div className={`w-1 h-1 rounded-full ${isThinking ? 'bg-blue-600 animate-pulse' : 'bg-green-600'
              }`} />
            <span className="text-xs">{isThinking ? 'THINKING' : 'READY'}</span>
          </div>
        </div>
      </div>

      {/* Thinking Stream */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-2 mb-2 border border-purple-100">
        <div className="flex items-start gap-1.5 mb-1">
          <Activity className="w-3 h-3 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-700 mb-0.5">AI Reasoning</div>
            <div className="text-xs text-gray-600 leading-relaxed max-h-[80px] overflow-y-auto">
              {thinking || 'Initializing VLM connection...'}
            </div>
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-xs text-gray-500">Confidence:</span>
          <div className="flex-1 h-1 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000"
              style={{ width: `${analysis.confidence * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-700 min-w-[30px] text-right">
            {(analysis.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Suggested Action */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-blue-600" />
            <span className="text-xs text-blue-700">Recommended</span>
          </div>
          {autoMode && (
            <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
              Auto
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <code className="text-xs text-blue-700 font-mono bg-white px-1.5 py-0.5 rounded border border-blue-100">
            {analysis.suggestion}
          </code>
          {!autoMode && (
            <div className="flex gap-1">
              <button
                onClick={() => onAiCommand(analysis.suggestion)}
                className="px-2 py-0.5 bg-green-500 hover:bg-green-600 text-white rounded text-xs transition-colors"
              >
                Execute
              </button>
              <button className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs transition-colors">
                Skip
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Last Inference */}
      <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <span>Last: {new Date().toLocaleTimeString()}</span>
        <span>0.125 Hz</span>
      </div>
    </div>
  );
}