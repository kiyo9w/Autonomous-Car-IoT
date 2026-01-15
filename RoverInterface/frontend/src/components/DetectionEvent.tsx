import { useState, useEffect } from 'react';
import { AlertTriangle, Camera, CheckCircle } from 'lucide-react';

export function DetectionEvent() {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'detecting' | 'capturing' | 'transmitting' | 'complete'>('detecting');

  useEffect(() => {
    // Detecting stage
    setTimeout(() => setStage('capturing'), 500);
    
    // Capturing stage with progress
    setTimeout(() => {
      setStage('transmitting');
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setStage('complete');
            return 100;
          }
          return prev + 10;
        });
      }, 100);
    }, 1000);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Flash effect */}
      <div className={`absolute inset-0 transition-all duration-300 ${
        stage === 'detecting' ? 'bg-yellow-400/30' : 
        stage === 'capturing' ? 'bg-red-400/40' : 
        'bg-transparent'
      }`} />
      
      {/* Alert Box */}
      <div className="relative bg-white border-4 border-red-500 rounded-xl p-8 shadow-2xl pointer-events-auto max-w-md">
        <div className="flex items-center gap-4 mb-4">
          <AlertTriangle className="w-12 h-12 text-red-600 animate-pulse" />
          <div>
            <h3 className="text-2xl text-red-600">Human Detected</h3>
            <p className="text-gray-600 text-sm">Initiating capture sequence</p>
          </div>
        </div>

        {/* Status Messages */}
        <div className="space-y-3 mb-4">
          <div className={`flex items-center gap-2 ${stage === 'detecting' ? 'text-yellow-600' : 'text-green-600'}`}>
            {stage === 'detecting' ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            <span>TFLite detection triggered</span>
          </div>
          
          <div className={`flex items-center gap-2 ${
            stage === 'detecting' ? 'text-gray-400' :
            stage === 'capturing' ? 'text-yellow-600' : 
            'text-green-600'
          }`}>
            {stage === 'capturing' ? (
              <Camera className="w-5 h-5 animate-pulse" />
            ) : stage === 'detecting' ? (
              <Camera className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            <span>Capturing HD image (SVGA)</span>
          </div>
          
          <div className={`flex items-center gap-2 ${
            stage === 'detecting' || stage === 'capturing' ? 'text-gray-400' :
            stage === 'transmitting' ? 'text-yellow-600' : 
            'text-green-600'
          }`}>
            {stage === 'transmitting' ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : stage === 'complete' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
            )}
            <span>Transmitting via ACK protocol</span>
          </div>
        </div>

        {/* Progress Bar */}
        {(stage === 'transmitting' || stage === 'complete') && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Transfer Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Completion Message */}
        {stage === 'complete' && (
          <div className="bg-green-50 border border-green-300 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700">Evidence received and stored</span>
          </div>
        )}
      </div>
    </div>
  );
}
