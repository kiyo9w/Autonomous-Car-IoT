import { Wifi, WifiOff, Radio, AlertTriangle } from 'lucide-react';

interface ModeIndicatorProps {
  mode: 'scout' | 'survivor';
  lastHeartbeat: number;
}

export function ModeIndicator({ mode, lastHeartbeat }: ModeIndicatorProps) {
  const timeSinceHeartbeat = Date.now() - lastHeartbeat;
  
  return (
    <div className={`rounded-lg p-2 border-2 transition-all shadow-sm ${
      mode === 'scout' 
        ? 'bg-gradient-to-r from-green-50 to-blue-50 border-green-300' 
        : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300 animate-pulse'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded-lg ${
            mode === 'scout' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {mode === 'scout' ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className={`text-sm ${mode === 'scout' ? 'text-green-700' : 'text-red-700'}`}>
                {mode === 'scout' ? 'MODE A: THE SCOUT' : 'MODE B: THE SURVIVOR'}
              </h2>
              {mode === 'survivor' && (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
              )}
            </div>
            <p className={`text-xs ${mode === 'scout' ? 'text-green-600' : 'text-red-600'}`}>
              {mode === 'scout' 
                ? 'Connected — Live Control Active'
                : 'DISCONNECTED — AUTONOMOUS MODE'
              }
            </p>
          </div>
        </div>
        
        <div className="text-right bg-white rounded-lg px-3 py-1 shadow-sm border border-gray-200">
          <div className="flex items-center gap-1.5 justify-end mb-0.5">
            <Radio className={`w-3 h-3 ${mode === 'scout' ? 'text-green-600' : 'text-red-600'}`} />
            <span className={`text-xs ${mode === 'scout' ? 'text-green-600' : 'text-red-600'}`}>
              Heartbeat
            </span>
          </div>
          <div className={`text-base font-mono ${
            mode === 'scout' ? 'text-green-600' : 'text-red-600 animate-pulse'
          }`}>
            {timeSinceHeartbeat < 2000 
              ? `${timeSinceHeartbeat}ms` 
              : mode === 'survivor' ? 'LOST' : `${(timeSinceHeartbeat / 1000).toFixed(1)}s`
            }
          </div>
          <div className="text-xs text-gray-500">
            {mode === 'scout' ? 'Last ping' : 'Time since'}
          </div>
        </div>
      </div>
    </div>
  );
}