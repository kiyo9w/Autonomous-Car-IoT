import { useState, useCallback } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  RotateCw,
  Zap,
  AlertTriangle,
  Camera,
  Lock,
  Brain
} from 'lucide-react';
import { Speedometer } from './Speedometer';

interface ControlPanelProps {
  onCommand: (command: string) => void;
  disabled: boolean;
  mode: 'scout' | 'survivor';
  aiControlActive?: boolean;
  currentAiAction?: string | null;
}

export function ControlPanel({
  onCommand,
  disabled,
  mode,
  aiControlActive = false,
  currentAiAction = null
}: ControlPanelProps) {
  const [speed, setSpeed] = useState(100);
  const [activeCommand, setActiveCommand] = useState<string | null>(null);

  const handleCommand = async (command: string) => {
    if (disabled) return;
    setActiveCommand(command);

    try {
      // Use specific endpoint for capture
      if (command === 'CAPTURE') {
        const response = await fetch('http://localhost:8080/api/evidence', {
          method: 'POST'
        });
        onCommand('CAPTURE_EVIDENCE');
        if (!response.ok) console.error('Capture failed');
      } else {
        // Regular motion commands
        const response = await fetch('http://localhost:8080/api/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command })
        });
        if (!response.ok) console.error('Command failed to send');
        onCommand(command);
      }
    } catch (err) {
      console.error('API Error:', err);
    }
    setTimeout(() => setActiveCommand(null), 200);
  };

  const handleSpeedChange = useCallback(async (newSpeed: number) => {
    setSpeed(newSpeed);
    if (disabled) return;

    try {
      const response = await fetch('http://localhost:8080/api/speed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed: newSpeed })
      });
      if (!response.ok) console.error('Speed update failed');
    } catch (err) {
      console.error('API Speed Error:', err);
    }
  }, [disabled]);

  const isAiControllingCommand = (command: string) => {
    return aiControlActive && currentAiAction === command;
  };

  const buttonClass = (cmd: string) => {
    const isActive = activeCommand === cmd;
    return `p-1.5 rounded-lg transition-all ${disabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
      : isActive
        ? 'bg-blue-600 text-white shadow-lg'
        : aiControlActive
          ? 'bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300'
          : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
      }`;
  };

  return (
    <div className={`rounded-lg p-2 space-y-2 transition-all ${mode === 'scout'
      ? aiControlActive
        ? 'bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300 shadow-lg shadow-purple-500/20'
        : 'bg-white border border-gray-200 shadow-sm'
      : 'bg-white/50 border-2 border-red-300'
      }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`p-1 rounded-lg ${aiControlActive ? 'bg-purple-100' : mode === 'scout' ? 'bg-blue-50' : 'bg-gray-100'
            }`}>
            <Zap className={`w-3.5 h-3.5 ${aiControlActive ? 'text-purple-600' : mode === 'scout' ? 'text-blue-600' : 'text-gray-400'
              }`} />
          </div>
          <div>
            <h2 className="text-gray-900 text-xs">Control Panel</h2>
            <p className="text-xs text-gray-500">Movement & Speed</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {aiControlActive && (
            <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded animate-pulse">
              <Brain className="w-3 h-3" />
              AI
            </div>
          )}
          {disabled && (
            <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
              <Lock className="w-3 h-3" />
              LOCK
            </div>
          )}
        </div>
      </div>

      {disabled && (
        <div className="bg-red-50 border border-red-200 rounded p-1.5 text-xs text-red-700">
          Control unavailable
        </div>
      )}

      {/* Speedometer Gauge */}
      {!disabled && mode === 'scout' && (
        <div className="py-2 flex justify-center bg-slate-900 rounded-xl my-2 shadow-inner border border-slate-800">
          <Speedometer
            value={speed}
            onChange={handleSpeedChange}
            disabled={disabled}
          />
        </div>
      )}

      {/* Directional Controls */}
      <div className="space-y-1">
        <div className="grid grid-cols-3 gap-1">
          <div />
          <button
            onClick={() => handleCommand('F')}
            className={buttonClass('F')}
            disabled={disabled}
            title="Forward (F)"
          >
            <ArrowUp className="w-4 h-4 mx-auto" />
          </button>
          <div />

          <button
            onClick={() => handleCommand('L')}
            className={buttonClass('L')}
            disabled={disabled}
            title="Turn Left (L)"
          >
            <RotateCcw className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={() => handleCommand('S')}
            className={`p-2 rounded-lg transition-all text-xs ${disabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
              }`}
            disabled={disabled}
            title="Stop (S)"
          >
            STOP
          </button>
          <button
            onClick={() => handleCommand('R')}
            className={buttonClass('R')}
            disabled={disabled}
            title="Turn Right (R)"
          >
            <RotateCw className="w-4 h-4 mx-auto" />
          </button>

          <button
            onClick={() => handleCommand('L')}
            className={buttonClass('L')}
            disabled={disabled}
            title="Move Left (L)"
          >
            <ArrowLeft className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={() => handleCommand('B')}
            className={buttonClass('B')}
            disabled={disabled}
            title="Backward (B)"
          >
            <ArrowDown className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={() => handleCommand('R')}
            className={buttonClass('R')}
            disabled={disabled}
            title="Move Right (R)"
          >
            <ArrowRight className="w-4 h-4 mx-auto" />
          </button>
        </div>
      </div>

      {/* Capture Control */}
      <button
        onClick={() => handleCommand('CAPTURE')}
        className={`w-full p-2 rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs ${disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
          : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30'
          }`}
        disabled={disabled}
      >
        <Camera className="w-3.5 h-3.5" />
        <span>Capture Remote Evidence</span>
      </button>

      {/* Emergency Stop */}
      <button
        onClick={() => handleCommand('S')}
        className="w-full p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-all flex items-center justify-center gap-1.5 text-white shadow-lg shadow-red-500/30 text-xs mt-2"
        title="Emergency Stop (S)"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Emergency Stop</span>
      </button>
    </div>
  );
}