/**
 * FeedbackOverlay — floating overlay on camera feed showing form feedback,
 * quality scores, fatigue warnings, gesture indicators, and mode controls.
 */
export default function FeedbackOverlay({
    exerciseState,
    safetyStatus,
    compensation,
    qualityScore,
    fatigueStatus,
    gestureState,
    smartFeedback,
    viewMode,
    onToggleMode,
    isPaused,
}) {
    if (!exerciseState) return null;

    const { feedback, feedbackType, reps, sets, currentAngle, lastRepSpeed, phase } = exerciseState;

    const feedbackColors = {
        info: 'from-primary-500/90 to-primary-600/90 border-primary-400/30',
        success: 'from-accent-500/90 to-accent-600/90 border-accent-400/30',
        warning: 'from-warn-500/90 to-warn-600/90 border-warn-400/30',
        danger: 'from-danger-500/90 to-danger-600/90 border-danger-400/30',
    };

    const safetyColors = {
        safe: '',
        warning: 'border-2 border-warn-400 shadow-warn-400/30 shadow-lg',
        danger: 'border-2 border-danger-400 shadow-danger-400/40 shadow-xl',
        stop: 'border-4 border-danger-500 shadow-danger-500/50 shadow-2xl animate-pulse',
    };

    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* Top bar: Mode toggle + Privacy + Quality */}
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                {/* Left: Mode toggle */}
                <div className="flex flex-col gap-2 pointer-events-auto">
                    <button
                        onClick={onToggleMode}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-lg transition-all ${viewMode === 'coach'
                                ? 'bg-primary-500/80 text-white shadow-primary-500/30 shadow-lg'
                                : 'bg-surface-800/70 text-surface-300 hover:bg-surface-700/70'
                            }`}
                    >
                        {viewMode === 'coach' ? '🎯 Coach' : '🪞 Mirror'}
                    </button>
                    {/* Privacy indicator */}
                    <div className="flex items-center gap-1.5 bg-surface-800/70 backdrop-blur px-2 py-1 rounded-lg">
                        <span className="text-[10px]">🔒</span>
                        <span className="text-surface-400 text-[9px] font-medium">Local AI</span>
                    </div>
                </div>

                {/* Right: Quality score */}
                {qualityScore && (
                    <div className="bg-surface-900/85 backdrop-blur-lg rounded-xl p-2.5 min-w-[100px]">
                        <p className="text-[9px] text-surface-500 uppercase tracking-wider text-center">Quality</p>
                        <p className={`text-2xl font-bold text-center ${qualityScore.overall >= 85 ? 'text-accent-400' :
                                qualityScore.overall >= 65 ? 'text-warn-400' : 'text-danger-400'
                            }`}>
                            {qualityScore.overall}%
                        </p>
                        <p className="text-[9px] text-surface-400 text-center">{qualityScore.emoji} {qualityScore.label}</p>
                        {/* Mini breakdown */}
                        <div className="grid grid-cols-2 gap-1 mt-1.5">
                            {[
                                { label: 'ROM', value: qualityScore.rom },
                                { label: 'Smooth', value: qualityScore.smoothness },
                                { label: 'Control', value: qualityScore.control },
                                { label: 'Sym', value: qualityScore.symmetry },
                            ].map(m => (
                                <div key={m.label} className="text-center">
                                    <div className="h-1 rounded-full bg-surface-700 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${m.value >= 80 ? 'bg-accent-500' :
                                                    m.value >= 60 ? 'bg-warn-500' : 'bg-danger-500'
                                                }`}
                                            style={{ width: `${m.value}%` }}
                                        />
                                    </div>
                                    <span className="text-[8px] text-surface-500">{m.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Pause overlay */}
            {isPaused && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-950/60 backdrop-blur-sm z-10">
                    <div className="text-center">
                        <span className="text-6xl mb-3 block">⏸️</span>
                        <p className="text-2xl font-bold text-white mb-1">Paused</p>
                        <p className="text-surface-400 text-sm">Raise hand again or click to resume</p>
                    </div>
                </div>
            )}

            {/* Gesture indicator */}
            {gestureState && gestureState.gesture && !gestureState.activated && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                    <div className="bg-surface-900/90 backdrop-blur-lg rounded-2xl p-4 text-center">
                        <div className="relative w-16 h-16 mx-auto mb-2">
                            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(51,65,85,0.5)" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#338dff"
                                    strokeWidth="3" strokeDasharray={`${gestureState.progress * 100} 100`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-2xl">
                                {gestureState.gesture === 'pause' ? '✋' : '👍'}
                            </span>
                        </div>
                        <p className="text-sm text-white font-semibold">{gestureState.message}</p>
                    </div>
                </div>
            )}

            {/* Bottom section */}
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 space-y-2">
                {/* Fatigue warning */}
                {fatigueStatus && fatigueStatus.level !== 'none' && (
                    <div className={`backdrop-blur-lg rounded-xl px-3 py-2 border ${fatigueStatus.level === 'severe'
                            ? 'bg-danger-500/20 border-danger-500/40 animate-pulse'
                            : fatigueStatus.level === 'moderate'
                                ? 'bg-warn-500/20 border-warn-500/40'
                                : 'bg-surface-800/60 border-surface-600/30'
                        }`}>
                        <div className="flex items-center gap-2">
                            <span>{fatigueStatus.emoji}</span>
                            <p className={`text-xs font-semibold ${fatigueStatus.level === 'severe' ? 'text-danger-300' : 'text-warn-300'
                                }`}>
                                {fatigueStatus.message}
                            </p>
                        </div>
                    </div>
                )}

                {/* Smart coaching feedback */}
                {smartFeedback && smartFeedback.length > 0 && (
                    <div className="bg-surface-900/70 backdrop-blur-lg rounded-xl px-3 py-2 border border-primary-500/20">
                        {smartFeedback.map((fb, i) => (
                            <p key={i} className={`text-xs ${fb.priority === 'high' ? 'text-warn-300 font-semibold' :
                                    fb.category === 'praise' ? 'text-accent-300' : 'text-surface-300'
                                }`}>
                                💡 {fb.text}
                            </p>
                        ))}
                    </div>
                )}

                {/* Safety alerts */}
                {safetyStatus && safetyStatus.overallLevel !== 'safe' && (
                    <div className={`bg-surface-900/90 backdrop-blur-lg rounded-xl p-3 ${safetyColors[safetyStatus.overallLevel]}`}>
                        {safetyStatus.messages.map((msg, i) => (
                            <p key={i} className="text-sm font-semibold text-danger-300">{msg}</p>
                        ))}
                    </div>
                )}

                {/* Compensation alerts */}
                {compensation && (
                    <>
                        {compensation.trunkLean && compensation.trunkLean.level !== 'safe' && (
                            <div className="bg-warn-500/20 backdrop-blur-lg rounded-xl px-3 py-2 border border-warn-500/30">
                                <p className="text-xs text-warn-300">{compensation.trunkLean.message}</p>
                            </div>
                        )}
                        {compensation.momentum && compensation.momentum.level !== 'safe' && (
                            <div className="bg-warn-500/20 backdrop-blur-lg rounded-xl px-3 py-2 border border-warn-500/30">
                                <p className="text-xs text-warn-300">{compensation.momentum.message}</p>
                            </div>
                        )}
                    </>
                )}

                {/* Main feedback bar */}
                <div className={`bg-gradient-to-r ${feedbackColors[feedbackType] || feedbackColors.info} backdrop-blur-lg rounded-xl p-3 border`}>
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-white text-sm font-semibold">{feedback || 'Ready to begin'}</p>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                            {currentAngle !== null && currentAngle !== undefined && (
                                <div className="text-center">
                                    <p className="text-white/60 text-[10px] uppercase tracking-wider">Angle</p>
                                    <p className="text-white text-lg font-bold">{Math.round(currentAngle)}°</p>
                                </div>
                            )}
                            <div className="text-center">
                                <p className="text-white/60 text-[10px] uppercase tracking-wider">Reps</p>
                                <p className="text-white text-lg font-bold">{reps}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-white/60 text-[10px] uppercase tracking-wider">Sets</p>
                                <p className="text-white text-lg font-bold">{sets}</p>
                            </div>
                            {lastRepSpeed && (
                                <div className="text-center hidden sm:block">
                                    <p className="text-white/60 text-[10px] uppercase tracking-wider">Speed</p>
                                    <p className="text-white text-lg font-bold">{lastRepSpeed}s</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
