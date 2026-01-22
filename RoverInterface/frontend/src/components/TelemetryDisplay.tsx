import { useState, useEffect } from 'react';
import {
  Battery,
  Gauge,
  Compass,
  MapPin,
  Signal,
  AlertCircle
} from 'lucide-react';

interface TelemetryResponse {
  voltage?: number;
  distance?: number;
  status?: string;
  fps?: number;
}

interface TelemetryDisplayProps {
  mode: 'scout' | 'survivor';
}

export function TelemetryDisplay({ mode }: TelemetryDisplayProps) {
  const [telemetry, setTelemetry] = useState({
    battery: 0,
    speed: 0,
    heading: 0,
    signal: 0,
    latitude: 0,
    longitude: 0,
    altitude: 0,
    distance: 0
  });

  const [cachedTelemetry, setCachedTelemetry] = useState(telemetry);

  // Fetch actual telemetry from backend
  useEffect(() => {
    if (mode === 'scout') {
      const interval = setInterval(async () => {
        try {
          const res = await fetch('http://localhost:8080/api/telemetry');
          if (res.ok) {
            const data: TelemetryResponse = await res.json();
            setTelemetry(prev => {
              const updated = {
                ...prev,
                battery: data.voltage ? (data.voltage / 12.6) * 100 : 0,
                distance: data.distance || 0,
                status: data.status || 'DISCONNECTED',
                speed: data.fps ? data.fps / 10 : 0, // Estimate from FPS
                heading: 0, // No Compass
                signal: data.status === 'CONNECTED' ? 100 : 0
              };
              setCachedTelemetry(updated);
              return updated;
            });
          }
        } catch (err) {
          console.error('Telemetry fetch failed:', err);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [mode]);

  const displayTelemetry = mode === 'scout' ? telemetry : cachedTelemetry;
  const isLive = mode === 'scout';

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-600';
    if (level > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBatteryBgColor = (level: number) => {
    if (level > 50) return 'bg-green-50';
    if (level > 20) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getSignalColor = (level: number) => {
    if (level > 70) return 'text-green-600';
    if (level > 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`rounded-lg p-2 ${mode === 'scout' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-white/50 border-2 border-orange-300'
      }`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-gray-900 text-xs">Telemetry</h2>
          <p className="text-xs text-gray-500">Real-time</p>
        </div>
        <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${isLive
          ? 'bg-green-50 text-green-600'
          : 'bg-orange-50 text-orange-600'
          }`}>
          <div className={`w-1 h-1 rounded-full ${isLive ? 'bg-green-600 animate-pulse' : 'bg-orange-600'}`} />
          <span className="text-xs">{isLive ? 'LIVE' : 'CACHE'}</span>
        </div>
      </div>

      {!isLive && (
        <div className="bg-orange-50 border border-orange-200 rounded p-1.5 mb-2 flex items-start gap-1.5">
          <AlertCircle className="w-3 h-3 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-orange-700">
            Showing last known values
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        {/* Battery */}
        <div className={`rounded p-1.5 border ${isLive ? getBatteryBgColor(displayTelemetry.battery) : 'bg-gray-50'
          } ${isLive ? 'border-gray-200' : 'border-gray-100'}`}>
          <div className="flex items-center gap-1 mb-1">
            <Battery className={`w-3 h-3 ${isLive ? getBatteryColor(displayTelemetry.battery) : 'text-gray-400'}`} />
            <span className="text-xs text-gray-600">Battery</span>
          </div>
          <div className={`text-sm mb-0.5 ${isLive ? getBatteryColor(displayTelemetry.battery) : 'text-gray-400'}`}>
            {displayTelemetry.battery.toFixed(1)}%
          </div>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${isLive
                ? displayTelemetry.battery > 50 ? 'bg-green-500' : displayTelemetry.battery > 20 ? 'bg-yellow-500' : 'bg-red-500'
                : 'bg-gray-300'
                }`}
              style={{ width: `${displayTelemetry.battery}%` }}
            />
          </div>
        </div>

        {/* Speed */}
        <div className={`rounded p-1.5 border ${isLive ? 'bg-blue-50' : 'bg-gray-50'} ${isLive ? 'border-gray-200' : 'border-gray-100'}`}>
          <div className="flex items-center gap-1 mb-1">
            <Gauge className={`w-3 h-3 ${isLive ? 'text-blue-600' : 'text-gray-400'}`} />
            <span className="text-xs text-gray-600">Speed</span>
          </div>
          <div className={`text-sm ${isLive ? 'text-blue-600' : 'text-gray-400'}`}>
            {displayTelemetry.speed.toFixed(1)} m/s
          </div>
        </div>

        {/* Distance Sensor */}
        <div className={`rounded p-1.5 border ${isLive ? 'bg-purple-50' : 'bg-gray-50'} ${isLive ? 'border-gray-200' : 'border-gray-100'}`}>
          <div className="flex items-center gap-1 mb-1">
            <Signal className={`w-3 h-3 ${isLive ? 'text-purple-600' : 'text-gray-400'}`} />
            <span className="text-xs text-gray-600">Distance</span>
          </div>
          <div className={`text-sm ${isLive ? 'text-purple-600' : 'text-gray-400'}`}>
            {displayTelemetry.distance.toFixed(0)} cm
          </div>
        </div>

        {/* Heading - NOT AVAILABLE */}
        <div className={`rounded p-1.5 border border-gray-100 bg-gray-50 opacity-50`}>
          <div className="flex items-center gap-1 mb-1">
            <Compass className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500">Heading</span>
          </div>
          <div className="text-xs text-gray-400 italic">No Sensor</div>
        </div>
      </div>

      {/* GPS Coordinates */}
      <div className={`mt-1.5 rounded p-1.5 border ${isLive ? 'bg-teal-50' : 'bg-gray-50'} ${isLive ? 'border-gray-200' : 'border-gray-100'}`}>
        <div className="flex items-center gap-1 mb-1">
          <MapPin className={`w-3 h-3 ${isLive ? 'text-teal-600' : 'text-gray-400'}`} />
          <span className="text-xs text-gray-600">GPS Position</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <div className="text-xs text-gray-500">Lat</div>
            <div className={`text-xs font-mono ${isLive ? 'text-teal-600' : 'text-gray-400'}`}>
              {displayTelemetry.latitude.toFixed(4)}°
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Lon</div>
            <div className={`text-xs font-mono ${isLive ? 'text-teal-600' : 'text-gray-400'}`}>
              {displayTelemetry.longitude.toFixed(4)}°
            </div>
          </div>
        </div>
      </div>

      {/* FSM State */}
      <div className={`mt-1.5 rounded p-1.5 border ${isLive ? 'bg-gray-50' : 'bg-orange-50'
        } ${isLive ? 'border-gray-200' : 'border-orange-200'}`}>
        <div className="text-xs text-gray-600 mb-0.5">FSM State</div>
        <div className={`text-xs font-mono ${mode === 'scout' ? 'text-green-600' : 'text-orange-600'
          }`}>
          {mode === 'scout' ? 'REMOTE_CONTROL' : 'AUTONOMOUS'}
        </div>
      </div>
    </div>
  );
}