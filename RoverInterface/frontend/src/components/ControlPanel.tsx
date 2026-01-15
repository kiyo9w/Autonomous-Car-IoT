import { useState } from 'react';
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
  const [speed, setSpeed] = useState(50);
  const [activeCommand, setActiveCommand] = useState<string | null>(null);

  const handleCommand = (command: string) => {
    if (disabled) return;
    setActiveCommand(command);
    onCommand(command);
    setTimeout(() => setActiveCommand(null), 200);
  };

  const isAiControllingCommand = (command: string) => {
    return aiControlActive && currentAiAction === command;
  };

  const buttonClass = (cmd: string) => {
    const isActive = activeCommand === cmd;
    return `p-1.5 rounded-lg transition-all ${
      disabled 
        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
        : isActive
          ? 'bg-blue-600 text-white shadow-lg'
          : aiControlActive
            ? 'bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300'
            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
    }`;
  };

  return (
    <div className={`rounded-lg p-2 space-y-2 transition-all ${
      mode === 'scout' 
        ? aiControlActive 
          ? 'bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300 shadow-lg shadow-purple-500/20' 
          : 'bg-white border border-gray-200 shadow-sm'
        : 'bg-white/50 border-2 border-red-300'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`p-1 rounded-lg ${
            aiControlActive ? 'bg-purple-100' : mode === 'scout' ? 'bg-blue-50' : 'bg-gray-100'
          }`}>
            <Zap className={`w-3.5 h-3.5 ${
              aiControlActive ? 'text-purple-600' : mode === 'scout' ? 'text-blue-600' : 'text-gray-400'
            }`} />
          </div>
          <div>
            <h2 className="text-gray-900 text-xs">Control Panel</h2>
            <p className="text-xs text-gray-500">Movement</p>
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

      {/* Directional Controls */}
      <div className="space-y-1">
        <div className="grid grid-cols-3 gap-1">
          <div />
          <button
            onClick={() => handleCommand('MOVE_FORWARD')}
            className={buttonClass('MOVE_FORWARD')}
            disabled={disabled}
          >
            <ArrowUp className="w-4 h-4 mx-auto" />
          </button>
          <div />
          
          <button
            onClick={() => handleCommand('ROTATE_LEFT')}
            className={buttonClass('ROTATE_LEFT')}
            disabled={disabled}
          >
            <RotateCcw className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={() => handleCommand('STOP')}
            className={`p-2 rounded-lg transition-all text-xs ${
              disabled 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
            }`}
            disabled={disabled}
          >
            STOP
          </button>
          <button
            onClick={() => handleCommand('ROTATE_RIGHT')}
            className={buttonClass('ROTATE_RIGHT')}
            disabled={disabled}
          >
            <RotateCw className="w-4 h-4 mx-auto" />
          </button>
          
          <button
            onClick={() => handleCommand('MOVE_LEFT')}
            className={buttonClass('MOVE_LEFT')}
            disabled={disabled}
          >
            <ArrowLeft className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={() => handleCommand('MOVE_BACKWARD')}
            className={buttonClass('MOVE_BACKWARD')}
            disabled={disabled}
          >
            <ArrowDown className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={() => handleCommand('MOVE_RIGHT')}
            className={buttonClass('MOVE_RIGHT')}
            disabled={disabled}
          >
            <ArrowRight className="w-4 h-4 mx-auto" />
          </button>
        </div>
      </div>

      {/* Speed Control */}
      <div className="space-y-1 bg-gray-50 rounded-lg p-2 border border-gray-100">
        <div className="flex items-center justify-between">
          <p className={`text-xs ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>Speed</p>
          <span className={`text-xs font-mono ${disabled ? 'text-gray-400' : 'text-blue-600'}`}>{speed}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={speed}
          onChange={(e) => {
            setSpeed(Number(e.target.value));
            onCommand(`SET_SPEED_${e.target.value}`);
          }}
          disabled={disabled}
          className={`w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />
      </div>

      {/* Capture Control */}
      <button
        onClick={() => handleCommand('STOP_AND_CAPTURE')}
        className={`w-full p-2 rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs ${
          disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
            : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30'
        }`}
        disabled={disabled}
      >
        <Camera className="w-3.5 h-3.5" />
        <span>Capture HD</span>
      </button>

      {/* Emergency Stop */}
      <button
        onClick={() => handleCommand('EMERGENCY_STOP')}
        className="w-full p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-all flex items-center justify-center gap-1.5 text-white shadow-lg shadow-red-500/30 text-xs"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Emergency</span>
      </button>
    </div>
  );
}