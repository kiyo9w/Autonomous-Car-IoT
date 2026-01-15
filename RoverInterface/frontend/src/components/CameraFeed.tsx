import { Video, VideoOff } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface CameraFeedProps {
  isConnected: boolean;
  mode: 'scout' | 'survivor';
}

export function CameraFeed({ isConnected, mode }: CameraFeedProps) {
  // Update this IP to match your ESP32's actual IP address printed in Serial Monitor
  const streamUrl = 'http://localhost:8080/video_feed';
  const [lastFrameUrl, setLastFrameUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Capture last frame when going offline
  useEffect(() => {
    if (!isConnected && imgRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = imgRef.current;

      if (ctx && img.complete && img.naturalWidth > 0) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        setLastFrameUrl(canvas.toDataURL('image/jpeg'));
      }
    }
  }, [isConnected]);

  return (
    <div className="h-full flex flex-col bg-white rounded-lg p-2 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className={`p-1 rounded-lg ${mode === 'scout' ? 'bg-blue-50' : 'bg-amber-50'}`}>
            <Video className={`w-3.5 h-3.5 ${mode === 'scout' ? 'text-blue-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <h2 className="text-gray-900 text-xs">Camera Feed</h2>
            <p className="text-xs text-gray-500">{mode === 'scout' ? 'MJPEG Stream' : 'Last Frame'}</p>
          </div>
        </div>
        <div className={`px-2 py-0.5 rounded flex items-center gap-1 ${isConnected
          ? 'bg-red-100 text-red-600'
          : 'bg-gray-100 text-gray-500'
          }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-red-600 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>

      {/* Hidden canvas for capturing last frame */}
      <canvas ref={canvasRef} className="hidden" />

      <div className={`relative rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 flex-1 ${mode === 'survivor' ? 'border-2 border-amber-400' : 'border border-gray-300'
        }`}>
        {isConnected ? (
          <>
            {/* Live MJPEG Stream */}
            <img
              ref={imgRef}
              src={streamUrl}
              alt="Rover camera feed"
              className="w-full h-full object-contain"
              crossOrigin="anonymous"
              onError={(e) => {
                // Fallback if stream is not available
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />

            {/* Fallback message if stream fails */}
            <div className="hidden w-full h-full items-center justify-center text-gray-400">
              <div className="text-center">
                <VideoOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Stream unavailable</p>
                <p className="text-xs text-gray-500">{streamUrl}</p>
              </div>
            </div>

            {/* Live indicators */}
            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              REC
            </div>

            <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-0.5 rounded text-xs font-mono">
              {new Date().toLocaleTimeString()}
            </div>

            {/* Bottom Info Bar */}
            <div className="absolute bottom-2 left-2 right-2 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
              <div className="flex items-center justify-between text-white text-xs">
                <span className="font-mono">MJPEG • 1080p</span>
                <span className="font-mono">{streamUrl.split('//')[1]}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Show last frame if available, otherwise show offline message */}
            {lastFrameUrl ? (
              <>
                <img
                  src={lastFrameUrl}
                  alt="Last captured frame"
                  className="w-full h-full object-contain opacity-80"
                />

                {/* Offline Overlay */}
                <div className="absolute top-2 left-2 bg-gray-500 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  LAST FRAME
                </div>

                <div className="absolute bottom-2 left-2 right-2 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                  <div className="flex items-center justify-between text-white text-xs">
                    <span className="font-mono">OFFLINE • Last Captured</span>
                    <span className="font-mono text-gray-400">Awaiting connection...</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <VideoOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Camera Offline</p>
                  <p className="text-xs text-gray-500">Awaiting connection...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}