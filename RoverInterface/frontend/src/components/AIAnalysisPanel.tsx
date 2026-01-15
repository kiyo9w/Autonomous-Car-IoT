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
    suggestion: 'ROTATE_LEFT',
    confidence: 0.87
  });
  const [autoMode, setAutoMode] = useState(false);

  // Simulate AI analysis updates and thinking stream
  useEffect(() => {
    const scenarios = [
      { 
        message: 'Clear path ahead', 
        suggestion: 'MOVE_FORWARD', 
        confidence: 0.95,
        thinking: 'Analyzing camera feed... No obstacles detected in 2m range... Path confidence high... Recommending forward movement.'
      },
      { 
        message: 'Obstacle detected ahead', 
        suggestion: 'ROTATE_LEFT', 
        confidence: 0.87,
        thinking: 'Object detection triggered... Obstacle at 0.8m distance... Left corridor appears clear... Calculating optimal rotation angle... Recommending left turn.'
      },
      { 
        message: 'Narrow passage detected', 
        suggestion: 'SLOW_FORWARD', 
        confidence: 0.72,
        thinking: 'Scanning environment... Passage width: 0.45m... Rover width: 0.35m... Clearance acceptable... Reducing speed for safety... Proceed with caution.'
      },
      { 
        message: 'Dead end detected', 
        suggestion: 'ROTATE_180', 
        confidence: 0.91,
        thinking: 'Wall detection on three sides... No viable forward paths... Analyzing backtrack options... Optimal strategy: 180° rotation... Searching for alternative routes.'
      },
      { 
        message: 'Potential target area', 
        suggestion: 'STOP_AND_SCAN', 
        confidence: 0.68,
        thinking: 'Visual anomaly detected... Heat signature analysis pending... Pattern matching suggests human presence... Initiating comprehensive scan protocol... Stopping for detailed analysis.'
      }
    ];

    const interval = setInterval(() => {
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      
      // Start thinking animation
      setIsThinking(true);
      setThinking('');
      
      // Stream the thinking text
      let currentText = '';
      const words = scenario.thinking.split(' ');
      let wordIndex = 0;
      
      const thinkingInterval = setInterval(() => {
        if (wordIndex < words.length) {
          currentText += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
          setThinking(currentText);
          wordIndex++;
        } else {
          clearInterval(thinkingInterval);
          setIsThinking(false);
          
          // Update analysis after thinking completes
          setAnalysis({
            status: 'complete',
            ...scenario
          });

          // Execute command if auto mode is on
          if (autoMode) {
            onCurrentActionChange(scenario.suggestion);
            onAiCommand(scenario.suggestion);
            setTimeout(() => onCurrentActionChange(null), 2000);
          }
        }
      }, 100);

      return () => clearInterval(thinkingInterval);
    }, 8000);

    return () => clearInterval(interval);
  }, [autoMode, onAiCommand, onCurrentActionChange]);

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
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg transition-all text-xs ${
              autoMode 
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {autoMode ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span className="text-xs">{autoMode ? 'AUTO' : 'MANUAL'}</span>
          </button>
          <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
            isThinking ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
          }`}>
            <div className={`w-1 h-1 rounded-full ${
              isThinking ? 'bg-blue-600 animate-pulse' : 'bg-green-600'
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
              {thinking || 'Awaiting next cycle...'}
              {isThinking && <span className="inline-block w-0.5 h-2.5 bg-purple-600 ml-1 animate-pulse" />}
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

      {/* Analysis Result */}
      <div className="bg-gray-50 rounded-lg p-2 mb-2 border border-gray-100">
        <div className="text-xs text-gray-500 mb-0.5">Current Assessment</div>
        <p className="text-xs text-gray-900">
          {analysis.message}
        </p>
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