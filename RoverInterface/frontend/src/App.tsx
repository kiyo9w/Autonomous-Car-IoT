import { useState, useEffect } from 'react';
import { CameraFeed } from './components/CameraFeed';
import { ControlPanel } from './components/ControlPanel';
import { TelemetryDisplay } from './components/TelemetryDisplay';
import { CommandLog } from './components/CommandLog';
import { ModeIndicator } from './components/ModeIndicator';
import { AIAnalysisPanel } from './components/AIAnalysisPanel';
import { EvidencePanel } from './components/EvidencePanel';
import { DetectionEvent } from './components/DetectionEvent';
import { RecoveryBanner } from './components/RecoveryBanner';
import { Radio } from 'lucide-react';
import { Wifi, WifiOff, CheckCircle } from 'lucide-react';
import { TelemetryBadges } from './components/TelemetryBadges';
import { Database } from 'lucide-react';

interface Command {
  id: string;
  type: string;
  timestamp: Date;
  status: 'success' | 'pending' | 'failed';
  source?: 'user' | 'ai';
}

type OperationalMode = 'scout' | 'survivor';

export default function App() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [mode, setMode] = useState<OperationalMode>('scout');
  const [lastHeartbeat, setLastHeartbeat] = useState(Date.now());
  const [detectionEvent, setDetectionEvent] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<string[]>([]);
  const [aiControlActive, setAiControlActive] = useState(false);
  const [currentAiAction, setCurrentAiAction] = useState<string | null>(null);

  // Simulate heartbeat and mode switching
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      const shouldReceive = Math.random() > 0.05; // 95% success rate (was 0.15)
      
      if (shouldReceive) {
        const wasDisconnected = mode === 'survivor';
        setLastHeartbeat(Date.now());
        
        // Show recovery banner if reconnecting
        if (wasDisconnected && evidenceFiles.length > 0) {
          setShowRecovery(true);
          setTimeout(() => setShowRecovery(false), 5000);
        }
      }
    }, 2000);

    const modeCheck = setInterval(() => {
      const timeSinceHeartbeat = Date.now() - lastHeartbeat;
      if (timeSinceHeartbeat > 2000) {
        setMode('survivor');
        // Simulate evidence collection in survivor mode
        if (Math.random() > 0.9) {
          setEvidenceFiles(prev => [...prev, `log_${String(prev.length + 1).padStart(2, '0')}.jpg`]);
        }
      } else {
        setMode('scout');
      }
    }, 500);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(modeCheck);
    };
  }, [lastHeartbeat, mode, evidenceFiles.length]);

  // Simulate random detection events in scout mode
  useEffect(() => {
    if (mode === 'scout') {
      const detectionInterval = setInterval(() => {
        if (Math.random() > 0.95) {
          setDetectionEvent(true);
          setTimeout(() => setDetectionEvent(false), 3000);
        }
      }, 5000);
      return () => clearInterval(detectionInterval);
    }
  }, [mode]);

  const handleCommand = (commandType: string) => {
    if (mode === 'survivor') return; // Commands disabled in survivor mode
    
    const newCommand: Command = {
      id: Math.random().toString(36).substr(2, 9),
      type: commandType,
      timestamp: new Date(),
      status: 'pending',
      source: 'user'
    };
    
    setCommands(prev => [newCommand, ...prev]);
    
    setTimeout(() => {
      setCommands(prev => 
        prev.map(cmd => 
          cmd.id === newCommand.id 
            ? { ...cmd, status: Math.random() > 0.1 ? 'success' : 'failed' }
            : cmd
        )
      );
    }, 500);
  };

  const handleAiCommand = (commandType: string) => {
    if (mode === 'survivor') return;
    
    const newCommand: Command = {
      id: Math.random().toString(36).substr(2, 9),
      type: commandType,
      timestamp: new Date(),
      status: 'pending',
      source: 'ai'
    };
    
    setCommands(prev => [newCommand, ...prev]);
    
    setTimeout(() => {
      setCommands(prev => 
        prev.map(cmd => 
          cmd.id === newCommand.id 
            ? { ...cmd, status: 'success' }
            : cmd
        )
      );
    }, 500);
  };

  const isConnected = mode === 'scout';

  return (
    <div className={`h-screen w-screen overflow-hidden p-2 transition-colors ${
      mode === 'scout' ? 'bg-gray-50' : 'bg-red-50'
    }`}>
      <div className="h-full max-w-[1800px] mx-auto flex flex-col gap-2">
        {/* Compact Header with Mode and Telemetry Badges */}
        <div className="flex items-center justify-between bg-white rounded-lg p-2 shadow-sm border border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-lg ${mode === 'scout' ? 'bg-blue-50' : 'bg-red-50'}`}>
              <Radio className={`w-4 h-4 ${mode === 'scout' ? 'text-blue-600' : 'text-red-600'}`} />
            </div>
            <div>
              <h1 className="text-sm text-gray-900">Rescue Rover Control</h1>
            </div>
          </div>
          
          {/* Compact Mode Badge and Telemetry */}
          <div className="flex items-center gap-2">
            <TelemetryBadges mode={mode} />
            <div className={`px-3 py-1 rounded-lg flex items-center gap-2 border-2 ${
              mode === 'scout' 
                ? 'bg-green-50 border-green-300 text-green-700' 
                : 'bg-red-50 border-red-300 text-red-700 animate-pulse'
            }`}>
              {mode === 'scout' ? (
                <>
                  <Wifi className="w-4 h-4" />
                  <span className="text-xs font-medium">MODE A</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span className="text-xs font-medium">MODE B</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Small Recovery Notification - Top Right Corner */}
        {showRecovery && (
          <div className="absolute top-16 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-pulse">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Connection Restored • {evidenceFiles.length} files syncing</span>
          </div>
        )}

        {/* Detection Event Overlay */}
        {detectionEvent && <DetectionEvent />}

        {/* Main Content Grid - Flexible height */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-2 flex-1 min-h-0">
          {/* Left Column - Camera (Large) */}
          <div className="xl:col-span-3 flex flex-col gap-2 min-h-0">
            <div className="flex-1 min-h-0">
              <CameraFeed isConnected={isConnected} mode={mode} />
            </div>
            
            {/* Minimal Command Log in Scout Mode (below camera) */}
            {mode === 'scout' && (
              <div className="flex-shrink-0 bg-blue-50 border border-blue-300 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs">$</span>
                    </div>
                    <span className="text-xs text-blue-700">Mission Log: {commands.length} commands</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    {commands.slice(0, 3).map((cmd) => (
                      <div key={cmd.id} className="flex items-center gap-1 bg-blue-100 px-2 py-0.5 rounded">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          cmd.status === 'success' ? 'bg-green-500' :
                          cmd.status === 'pending' ? 'bg-yellow-500 animate-pulse' :
                          'bg-red-500'
                        }`} />
                        <span className="text-blue-700">{cmd.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Minimal Evidence Panel in Survivor Mode (below camera) */}
            {mode === 'survivor' && evidenceFiles.length > 0 && (
              <div className="flex-shrink-0 bg-amber-50 border border-amber-300 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-amber-700">Evidence Files: {evidenceFiles.length}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    {evidenceFiles.slice(-3).map((file, i) => (
                      <span key={i} className="bg-amber-100 px-2 py-0.5 rounded">{file}</span>
                    ))}
                    {evidenceFiles.length > 3 && <span className="text-amber-600">+{evidenceFiles.length - 3} more</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Controls and AI Analysis */}
          <div className="xl:col-span-1 flex flex-col gap-2 min-h-0">
            <ControlPanel 
              onCommand={handleCommand} 
              disabled={!isConnected} 
              mode={mode}
              aiControlActive={aiControlActive}
              currentAiAction={currentAiAction}
            />
            {mode === 'scout' && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <AIAnalysisPanel 
                  onAiCommand={handleAiCommand} 
                  onAiControlChange={setAiControlActive}
                  onCurrentActionChange={setCurrentAiAction}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}