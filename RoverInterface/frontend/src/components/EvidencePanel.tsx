import { FolderOpen, HardDrive, FileImage, AlertCircle } from 'lucide-react';

interface EvidencePanelProps {
  evidenceFiles: string[];
}

export function EvidencePanel({ evidenceFiles }: EvidencePanelProps) {
  const usedStorage = evidenceFiles.length * 1.2; // MB
  const totalStorage = 512; // MB
  const usagePercent = (usedStorage / totalStorage) * 100;

  return (
    <div className="bg-white rounded-xl p-6 border-2 border-orange-300 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-lg">
            <FolderOpen className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-gray-900">Evidence Panel</h2>
            <p className="text-xs text-gray-500">Local Storage</p>
          </div>
        </div>
        <div className="px-3 py-1.5 bg-orange-100 text-orange-600 rounded-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse" />
          <span className="text-xs">RECORDING</span>
        </div>
      </div>

      {/* Status Alert */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-orange-700">
          Local evidence recording enabled. Files saved to SD card on detection.
        </div>
      </div>

      {/* File Counter */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileImage className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-700">Evidence Files</span>
          </div>
          <span className="text-2xl text-blue-600">{evidenceFiles.length}</span>
        </div>
        <div className="text-xs text-gray-600">
          Stored locally on rover SD card
        </div>
      </div>

      {/* Storage Indicator */}
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="w-5 h-5 text-purple-600" />
          <span className="text-sm text-gray-700">SD Card Storage</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>{usedStorage.toFixed(1)} MB used</span>
            <span>{totalStorage} MB total</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 transition-all"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 text-center">
            {(totalStorage - usedStorage).toFixed(1)} MB free
          </div>
        </div>
      </div>

      {/* File List */}
      {evidenceFiles.length > 0 && (
        <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-100">
          <div className="text-xs text-gray-600 mb-2">Recent Files:</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {evidenceFiles.slice(-5).reverse().map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs font-mono text-gray-700 bg-white px-3 py-2 rounded border border-gray-200">
                <FileImage className="w-3 h-3 text-orange-600" />
                /evidence/{file}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
