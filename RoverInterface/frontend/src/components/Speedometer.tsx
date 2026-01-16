
import React, { useState, useRef, useEffect } from 'react';


interface SpeedometerProps {
    value: number; // 0-100
    onChange: (value: number) => void;
    disabled?: boolean;
}

export function Speedometer({ value, onChange, disabled }: SpeedometerProps) {
    const [internalValue, setInternalValue] = useState(value);
    const [isDragging, setIsDragging] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    // Sync internal value with props when not dragging
    useEffect(() => {
        if (!isDragging) {
            setInternalValue(value);
        }
    }, [value, isDragging]);

    const calculateAngle = (val: number) => {
        // Map 0-100 to -135 to 135 degrees (270 degree span)
        return (val / 100) * 270 - 135;
    };

    const calculateValueFromEvent = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!svgRef.current) return internalValue;

        const rect = svgRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

        const dx = clientX - centerX;
        const dy = clientY - centerY;

        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        // angle is -180 to 180. 0 is right.
        // We want 0 at -135 degrees (bottom leftish) to 135 (bottom rightish)
        // -135deg is starting point.
        // Rotate so start is 0.
        // Target range: -135 (0%) to 135 (100%)

        // Normalize to 0-360 starting from 6 o'clock?
        // Let's align with the arc.
        // Arc starts at -135 (South West) ends at 135 (South East).
        // Atan2: 0=Right, 90=Down, 180=Left, -90=Up
        // 0% -> -135deg (Top Left? No, up is -90. -135 is Top Left)
        // Wait, typical gauge: 
        // Start 135 deg (Bottom Left) -> Top -> End 45 deg (Bottom Right)
        // Or Start 225 deg -> ...

        // Let's use SVG coordinates. 0 deg is 3 o'clock.
        // Standard gauge: 135deg to 405deg?
        // Let's use standard "Left bottom to Right bottom".
        // 135 deg to 45 deg (crossing 0)? No.
        // 0%=135deg (Bottom Left), 50%=270deg (Top), 100%=405deg (Bottom Right).
        // Total span 270 deg.

        // My calculateAngle used -135 to 135.
        // -135 = Top Left?
        // SVG transform rotate: 0 is 3 oclock. Positive is CW.
        // -135 is AntiCW from 3 oclock -> Top Left. Correct. 
        // 135 is CW from 3 oclock -> Bottom Left. Wait.

        // Let's just use simple mapping.
        // Angle + 90 (to make 12oclock 0)
        // Let's solve relative to center:
        let deg = angle + 90; // 0 is 6 o'clock?
        // Atan2: 0=Right (3 o'clock).
        // speed 0: -135 deg (Top left? No, usually gauges act like 7 oclock to 5 oclock)
        // 7 oclock is ~135 deg (positive, passed 90).
        // 5 oclock is ~45 deg.

        // Let's use specific angles:
        // Start: 135 degrees (Bottom Left)
        // End: 405 degrees (Bottom Right) (which is 45 deg)
        // Span: 270 deg.

        // Convert atan2 angle to 0-360 positive
        if (deg < 0) deg += 360;

        // Actually, simpler:
        // Atan2 returns -180 to 180.
        // We want to map pointer angle to 0-100.
        // Right (0) -> 0
        // Down (90) -> 90
        // Left (180) -> 180
        // Up (-90) -> 270

        // Gauge Start: 135 (Bottom Left)
        // Gauge End: 45 (Bottom Right). But we go CW.
        // So 135 -> 180 -> 270 (-90) -> 360 (0) -> 405 (45).

        let activeAngle = angle - 135; // Shift so start is 0?
        // if angle is 135 (start), activeAngle = 0.
        // if angle is -90 (top), activeAngle = -225 => +360 = 135.
        // if angle is 45 (end), activeAngle = -90 => +360 = 270.

        if (activeAngle < 0) activeAngle += 360;

        // Clamp to valid range (allow some buffer)
        // Valid range 0-270.
        // If angle is in the dead zone (270-360), clamp to nearest.

        let newVal = (activeAngle / 270) * 100;

        if (newVal > 100 && newVal < 115) newVal = 100; // Overshoot buffer
        if (newVal < 0 || newVal > 115) newVal = 0; // Undershoot buffer or dead zone logic

        // Dead zone handling (bottom gap)
        if (activeAngle > 270) {
            if (activeAngle < 315) newVal = 100;
            else newVal = 0;
        }

        return Math.max(0, Math.min(100, Math.round(newVal)));
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (disabled) return;
        setIsDragging(true);
        // e.preventDefault(); // Prevent scroll on touch
        const newVal = calculateValueFromEvent(e);
        setInternalValue(newVal);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        const newVal = calculateValueFromEvent(e);
        setInternalValue(newVal);
    };

    const handleEnd = () => {
        if (isDragging) {
            setIsDragging(false);
            onChange(internalValue);
        }
    };

    // Global event listeners for drag
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMove, { passive: false });
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('touchend', handleEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, internalValue]); // internalValue dependency not strictly needed for listener, but for closure

    // Visual Geometry
    const radius = 60;
    const strokeWidth = 12; // Thicker for premium feel
    const center = 70; // viewBox 140x140
    const circumference = 2 * Math.PI * radius;
    // Arc length 270 degrees = 0.75 circle
    const arcLength = circumference * 0.75;
    const dashArray = `${arcLength} ${circumference}`;
    const dashOffset = arcLength - (internalValue / 100) * arcLength;

    // Rotation: Start at 135deg. SVG circle starts at 3 oclock (0deg).
    // We want start at Bottom Left (135deg). So rotate 135deg.

    // Background track should fill full 270deg.
    // const trackDashOffset = 0; // Filled
    // Actually track is background.

    // Needle tip position
    const angleRad = ((internalValue / 100) * 270 + 135) * (Math.PI / 180);
    const needleLen = radius - 5;
    const needleX = center + needleLen * Math.cos(angleRad);
    const needleY = center + needleLen * Math.sin(angleRad);

    // Tick marks
    const ticks = [0, 20, 40, 60, 80, 100];

    return (
        <div className={`relative w-full aspect-square max-w-[200px] mx-auto select-none ${disabled ? 'opacity-50 grayscale' : ''}`}>
            <svg
                ref={svgRef}
                viewBox="0 0 140 140"
                className="w-full h-full drop-shadow-xl"
                onMouseDown={handleStart}
                onTouchStart={handleStart}
                style={{ cursor: disabled ? 'not-allowed' : 'grab' }}
            >
                {/* Glow Filter */}
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" /> {/* Blue */}
                        <stop offset="100%" stopColor="#22c55e" /> {/* Green */}
                    </linearGradient>
                </defs>

                {/* Outer Bezel (Optional) */}
                <circle cx={center} cy={center} r={radius + 8} fill="#1e293b" className="shadow-inner" />
                <circle cx={center} cy={center} r={radius + 6} fill="#0f172a" />

                {/* Background Track */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#334155"
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    strokeLinecap="round"
                    transform={`rotate(135 ${center} ${center})`}
                />

                {/* Value Arc */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="url(#speedGradient)"
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    transform={`rotate(135 ${center} ${center})`}
                    filter="url(#glow)"
                />

                {/* Ticks */}
                {ticks.map(t => {
                    const deg = (t / 100) * 270 + 135;
                    const rad = deg * (Math.PI / 180);
                    const innerR = radius - 15;
                    const outerR = radius - 2;
                    const x1 = center + innerR * Math.cos(rad);
                    const y1 = center + innerR * Math.sin(rad);
                    const x2 = center + outerR * Math.cos(rad);
                    const y2 = center + outerR * Math.sin(rad);
                    return (
                        <line
                            key={t}
                            x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke="white"
                            strokeWidth={t % 20 === 0 ? 2 : 1}
                            opacity={0.5}
                        />
                    );
                })}

                {/* Central Display */}
                <foreignObject x={center - 35} y={center - 25} width={70} height={50}>
                    <div className="flex flex-col items-center justify-center h-full text-white">
                        <div className="text-xs text-blue-400 font-semibold tracking-wider">SPEED</div>
                        <div className="text-2xl font-bold font-mono leading-none">{internalValue}</div>
                        <div className="text-[10px] text-gray-500">%</div>
                    </div>
                </foreignObject>

                {/* Needle / Handle */}
                <circle cx={center} cy={center} r={4} fill="#60a5fa" />
                {/* <line x1={center} y1={center} x2={needleX} y2={needleY} stroke="#60a5fa" strokeWidth={3} strokeLinecap="round" /> */}
                {/* Draggable Knob at tip */}
                <circle
                    cx={needleX}
                    cy={needleY}
                    r={8}
                    fill="white"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    className={`transition-transform duration-100 ${isDragging ? 'scale-125' : ''}`}
                    filter="url(#glow)"
                />

            </svg>

            {/* Helper text */}
            <div className="absolute -bottom-2 w-full text-center text-[10px] text-slate-400 font-medium">
                DRAG TO SET
            </div>
        </div>
    );
}
