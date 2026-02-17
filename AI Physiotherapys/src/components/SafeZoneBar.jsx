/**
 * SafeZoneBar — vertical bar showing current angle within safe/warning/danger zones.
 * Renders as JSX component with animated cursor.
 */

export default function SafeZoneBar({ currentAngle, safetyLimits, angleRange }) {
    if (currentAngle === null || currentAngle === undefined || !safetyLimits || !angleRange) {
        return null;
    }

    const { maxAngle, minAngle } = safetyLimits;
    const totalRange = maxAngle - minAngle;
    if (totalRange <= 0) return null;

    // Calculate zone boundaries as percentages
    const warningBuffer = totalRange * 0.1;
    const safeMin = angleRange.min;
    const safeMax = angleRange.max;
    const warnMinLow = minAngle;
    const warnMinHigh = minAngle + warningBuffer;
    const warnMaxLow = maxAngle - warningBuffer;
    const warnMaxHigh = maxAngle;

    // Calculate cursor position (0% = minAngle, 100% = maxAngle)
    const cursorPercent = Math.max(0, Math.min(100,
        ((currentAngle - minAngle) / totalRange) * 100
    ));

    // Determine current zone
    let zone = 'safe';
    let zoneColor = 'text-accent-400';
    if (currentAngle <= minAngle || currentAngle >= maxAngle) {
        zone = 'danger';
        zoneColor = 'text-danger-400';
    } else if (currentAngle <= minAngle + warningBuffer || currentAngle >= maxAngle - warningBuffer) {
        zone = 'warning';
        zoneColor = 'text-warn-400';
    }

    return (
        <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-surface-300 flex items-center gap-2">
                    <span>🎯</span> Safe Zone
                </h3>
                <span className={`text-lg font-bold font-mono ${zoneColor}`}>
                    {Math.round(currentAngle)}°
                </span>
            </div>

            {/* Zone bar */}
            <div className="relative h-6 rounded-full overflow-hidden bg-surface-700/50">
                {/* Danger zone (low) */}
                <div
                    className="absolute inset-y-0 left-0 bg-danger-500/40"
                    style={{ width: `${((warnMinLow - minAngle + warningBuffer) / totalRange) * 100}%` }}
                />

                {/* Warning zone (low) */}
                <div
                    className="absolute inset-y-0 bg-warn-500/30"
                    style={{
                        left: `${((warnMinHigh - minAngle) / totalRange) * 100}%`,
                        width: `${((safeMin - warnMinHigh) / totalRange) * 100}%`,
                    }}
                />

                {/* Safe zone */}
                <div
                    className="absolute inset-y-0 bg-accent-500/30"
                    style={{
                        left: `${((safeMin - minAngle) / totalRange) * 100}%`,
                        width: `${((safeMax - safeMin) / totalRange) * 100}%`,
                    }}
                />

                {/* Warning zone (high) */}
                <div
                    className="absolute inset-y-0 bg-warn-500/30"
                    style={{
                        left: `${((safeMax - minAngle) / totalRange) * 100}%`,
                        width: `${((warnMaxLow - safeMax) / totalRange) * 100}%`,
                    }}
                />

                {/* Danger zone (high) */}
                <div
                    className="absolute inset-y-0 right-0 bg-danger-500/40"
                    style={{ width: `${(warningBuffer / totalRange) * 100}%` }}
                />

                {/* Cursor */}
                <div
                    className="absolute top-0 bottom-0 w-1 transition-all duration-150 ease-out"
                    style={{
                        left: `${cursorPercent}%`,
                        transform: 'translateX(-50%)',
                    }}
                >
                    <div className={`w-3 h-3 rounded-full -mt-0.5 -ml-1 shadow-lg ${zone === 'danger' ? 'bg-danger-400 shadow-danger-400/50 animate-pulse' :
                            zone === 'warning' ? 'bg-warn-400 shadow-warn-400/50' :
                                'bg-accent-400 shadow-accent-400/50'
                        }`} />
                    <div className={`w-1 h-full ${zone === 'danger' ? 'bg-danger-400' :
                            zone === 'warning' ? 'bg-warn-400' :
                                'bg-accent-400'
                        }`} />
                </div>
            </div>

            {/* Labels */}
            <div className="flex justify-between mt-1.5 text-[10px]">
                <span className="text-danger-400">{minAngle}°</span>
                <span className="text-accent-400">{safeMin}°–{safeMax}°</span>
                <span className="text-danger-400">{maxAngle}°</span>
            </div>

            {/* Zone indicator */}
            <div className={`mt-2 text-center text-xs font-semibold ${zoneColor}`}>
                {zone === 'danger' && '🔴 DANGER ZONE — Reduce range immediately!'}
                {zone === 'warning' && '🟡 Approaching limit — Be careful'}
                {zone === 'safe' && '🟢 Safe range'}
            </div>
        </div>
    );
}
