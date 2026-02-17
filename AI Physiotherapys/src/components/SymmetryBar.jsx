/**
 * SymmetryBar — horizontal bar showing left/right balance.
 */
export default function SymmetryBar({ symmetryData }) {
    if (!symmetryData || symmetryData.level === 'neutral') return null;

    const { score, leftAngle, rightAngle, message, level } = symmetryData;

    const colors = {
        good: { bar: 'bg-accent-500', glow: 'shadow-accent-500/30', text: 'text-accent-400' },
        fair: { bar: 'bg-warn-500', glow: 'shadow-warn-500/30', text: 'text-warn-400' },
        poor: { bar: 'bg-danger-500', glow: 'shadow-danger-500/30', text: 'text-danger-400' },
    };

    const color = colors[level] || colors.good;

    return (
        <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-surface-300 flex items-center gap-2">
                    <span>⚖️</span> Symmetry
                </h3>
                <span className={`text-lg font-bold ${color.text}`}>{score}%</span>
            </div>

            {/* Progress bar */}
            <div className="relative h-3 bg-surface-700/50 rounded-full overflow-hidden">
                <div
                    className={`absolute inset-y-0 left-0 ${color.bar} rounded-full transition-all duration-500 shadow-lg ${color.glow}`}
                    style={{ width: `${score}%` }}
                />
                {/* Center marker */}
                <div className="absolute inset-y-0 left-1/2 w-0.5 bg-surface-400/30" />
            </div>

            {/* L/R angles */}
            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-surface-500">L</span>
                    <span className="text-sm font-mono text-surface-300">
                        {leftAngle !== null ? `${leftAngle}°` : '—'}
                    </span>
                </div>
                <p className={`text-xs ${color.text} text-center flex-1 mx-2`}>{message}</p>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-surface-300">
                        {rightAngle !== null ? `${rightAngle}°` : '—'}
                    </span>
                    <span className="text-xs text-surface-500">R</span>
                </div>
            </div>
        </div>
    );
}
