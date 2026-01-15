import { useState, useEffect } from 'react';
import { Wifi, Download, CheckCircle, FileImage } from 'lucide-react';

interface RecoveryBannerProps {
  evidenceFiles: string[];
}

export function RecoveryBanner({ evidenceFiles }: RecoveryBannerProps) {
  const [syncProgress, setSyncProgress] = useState(0);
  const [downloadedFiles, setDownloadedFiles] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncProgress(prev => {
        const next = prev + 15;
        if (next >= 100) {
          clearInterval(interval);
          setDownloadedFiles(evidenceFiles.length);
          return 100;
        }
        return next;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [evidenceFiles.length]);

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-400 rounded-xl p-6 animate-in slide-in-from-top shadow-lg">
      <div className="flex items-start gap-4">
        <Wifi className="w-8 h-8 text-green-600 flex-shrink-0 animate-pulse" />
        
        <div className="flex-1">
          <h3 className="text-xl text-green-700 mb-2 flex items-center gap-2">
            Connection Restored
            {syncProgress === 100 && <CheckCircle className="w-6 h-6" />}
          </h3>
          
          <p className="text-gray-700 mb-3">
            {syncProgress < 100 
              ? 'Syncing evidence from rover...' 
              : 'Evidence synchronization complete'
            }
          </p>

          {/* Manifest List */}
          <div className="bg-white rounded-lg p-3 mb-3 border border-green-200">
            <div className="text-sm text-gray-600 mb-2">Evidence Manifest:</div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {evidenceFiles.map((file, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-2 text-sm font-mono text-gray-700"
                >
                  <FileImage className="w-4 h-4 text-orange-600" />
                  <span>/evidence/{file}</span>
                  {downloadedFiles > idx && (
                    <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <div className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                <span>Downloading {evidenceFiles.length} file(s)</span>
              </div>
              <span>{syncProgress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>

          {syncProgress === 100 && (
            <div className="text-sm text-green-700">
              ✓ All evidence files successfully retrieved
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
