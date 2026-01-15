import { Play, Wifi, WifiOff, Camera, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface DemoControlsProps {
  onForceMode: (mode: 'scout' | 'survivor') => void;
  onTriggerDetection: () => void;
  onTriggerRecovery: () => void;
  onAddEvidence: () => void;
  currentMode: 'scout' | 'survivor';
}

export function DemoControls({ 
  onForceMode, 
  onTriggerDetection, 
  onTriggerRecovery,
  onAddEvidence,
  currentMode 
}: DemoControlsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-purple-900/30 border-2 border-purple-500 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-purple-900/50 hover:bg-purple-900/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-purple-400" />
          <span className="text-white">Demo Controls</span>
          <span className="text-xs text-purple-300">(Test transitions)</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-purple-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-purple-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3">
          <div className="text-xs text-purple-300 mb-2">
            Manually trigger events to see full UI transitions
          </div>

          {/* Mode Controls */}
          <div className="space-y-2">
            <div className="text-sm text-slate-300">Force Mode Switch:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onForceMode('scout')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  currentMode === 'scout'
                    ? 'bg-green-600 text-white ring-2 ring-green-400'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <Wifi className="w-4 h-4" />
                <span className="text-sm">Scout Mode</span>
              </button>
              <button
                onClick={() => onForceMode('survivor')}
                className={`px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  currentMode === 'survivor'
                    ? 'bg-red-600 text-white ring-2 ring-red-400'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <WifiOff className="w-4 h-4" />
                <span className="text-sm">Survivor Mode</span>
              </button>
            </div>
          </div>

          {/* Event Triggers */}
          <div className="space-y-2">
            <div className="text-sm text-slate-300">Trigger Events:</div>
            <div className="space-y-2">
              <button
                onClick={onTriggerDetection}
                disabled={currentMode !== 'scout'}
                className={`w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  currentMode === 'scout'
                    ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span className="text-sm">Detection Event</span>
              </button>
              
              <button
                onClick={onAddEvidence}
                disabled={currentMode !== 'survivor'}
                className={`w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  currentMode === 'survivor'
                    ? 'bg-orange-600 hover:bg-orange-500 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span className="text-sm">Add Evidence File</span>
              </button>
              
              <button
                onClick={onTriggerRecovery}
                disabled={currentMode !== 'survivor'}
                className={`w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  currentMode === 'survivor'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm">Trigger Recovery</span>
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-purple-900/30 rounded p-3 text-xs text-purple-200 space-y-1">
            <div><strong>Try this sequence:</strong></div>
            <div>1. Start in Scout mode (connected)</div>
            <div>2. Click "Detection Event" to see capture sequence</div>
            <div>3. Switch to "Survivor Mode" to see autonomous state</div>
            <div>4. Click "Add Evidence File" a few times</div>
            <div>5. Click "Trigger Recovery" to see reconnection & sync</div>
          </div>
        </div>
      )}
    </div>
  );
}
