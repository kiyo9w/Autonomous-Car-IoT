import { useEffect, useState } from 'react';
import { Battery, Gauge, Signal, Compass } from 'lucide-react';

interface TelemetryBadgesProps {
  mode: 'scout' | 'survivor';
}

export function TelemetryBadges({ mode }: TelemetryBadgesProps) {
  const [telemetry, setTelemetry] = useState({
    battery: 85.5,
    speed: 1.2,
    distance: 127,
    heading: 45
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (mode === 'scout') {
        setTelemetry({
          battery: Math.max(20, Math.min(100, telemetry.battery + (Math.random() - 0.5) * 2)),
          speed: Math.max(0, Math.min(3, telemetry.speed + (Math.random() - 0.5) * 0.5)),
          distance: Math.max(10, Math.min(400, telemetry.distance + (Math.random() - 0.5) * 20)),
          heading: (telemetry.heading + (Math.random() - 0.5) * 10 + 360) % 360
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [mode, telemetry.battery, telemetry.speed, telemetry.distance, telemetry.heading]);

  const getBatteryColor = (battery: number) => {
    if (battery > 50) return 'text-green-600';
    if (battery > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex items-center gap-2">
      {/* Battery */}
      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${
        mode === 'scout' ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
      }`}>
        <Battery className={`w-3.5 h-3.5 ${mode === 'scout' ? getBatteryColor(telemetry.battery) : 'text-gray-400'}`} />
        <span className={`text-xs font-mono ${mode === 'scout' ? getBatteryColor(telemetry.battery) : 'text-gray-400'}`}>
          {telemetry.battery.toFixed(0)}%
        </span>
      </div>

      {/* Speed */}
      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${
        mode === 'scout' ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
      }`}>
        <Gauge className={`w-3.5 h-3.5 ${mode === 'scout' ? 'text-blue-600' : 'text-gray-400'}`} />
        <span className={`text-xs font-mono ${mode === 'scout' ? 'text-blue-600' : 'text-gray-400'}`}>
          {telemetry.speed.toFixed(1)}
        </span>
      </div>

      {/* Distance */}
      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${
        mode === 'scout' ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
      }`}>
        <Signal className={`w-3.5 h-3.5 ${mode === 'scout' ? 'text-purple-600' : 'text-gray-400'}`} />
        <span className={`text-xs font-mono ${mode === 'scout' ? 'text-purple-600' : 'text-gray-400'}`}>
          {telemetry.distance.toFixed(0)}
        </span>
      </div>

      {/* Heading */}
      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${
        mode === 'scout' ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
      }`}>
        <Compass className={`w-3.5 h-3.5 ${mode === 'scout' ? 'text-cyan-600' : 'text-gray-400'}`} />
        <span className={`text-xs font-mono ${mode === 'scout' ? 'text-cyan-600' : 'text-gray-400'}`}>
          {telemetry.heading.toFixed(0)}°
        </span>
      </div>
    </div>
  );
}
