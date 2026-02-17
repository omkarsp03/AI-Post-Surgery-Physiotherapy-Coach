import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getSessions, getMilestones, getAllMilestoneDefs, clearSessions } from '../utils/storage';
import { generateReport } from '../utils/pdfReport';
import { predictRecovery } from '../engine/recoveryPredictor';

export default function DashboardPage() {
    const [sessions] = useState(getSessions);
    const [milestones] = useState(getMilestones);
    const allMilestones = getAllMilestoneDefs();

    const stats = useMemo(() => {
        if (sessions.length === 0) return null;
        const totalReps = sessions.reduce((sum, s) => sum + (s.repsCompleted || 0), 0);
        const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const avgSymmetry = Math.round(sessions.reduce((sum, s) => sum + (s.symmetryScore || 0), 0) / sessions.length);
        const avgPain = (sessions.reduce((sum, s) => sum + (s.painLevel ?? 0), 0) / sessions.length).toFixed(1);

        // Weekly data (last 7 days)
        const now = new Date();
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const thisWeek = sessions.filter(s => new Date(s.timestamp) >= weekAgo);

        // Daily breakdown for chart
        const dailyData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            const dayStr = date.toDateString();
            const daySessions = sessions.filter(s => new Date(s.timestamp).toDateString() === dayStr);
            dailyData.push({
                label: date.toLocaleDateString('en', { weekday: 'short' }),
                sessions: daySessions.length,
                reps: daySessions.reduce((sum, s) => sum + (s.repsCompleted || 0), 0),
            });
        }

        return { totalReps, totalDuration, avgSymmetry, avgPain, thisWeek: thisWeek.length, dailyData };
    }, [sessions]);

    const handleDownloadPdf = () => {
        generateReport(sessions, milestones);
    };

    const handleClearData = () => {
        if (window.confirm('Are you sure you want to clear all session data? This cannot be undone.')) {
            clearSessions();
            window.location.reload();
        }
    };

    if (sessions.length === 0) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold glow-text">Recovery Dashboard</h2>
                <div className="card text-center py-16">
                    <span className="text-6xl mb-4 block">📊</span>
                    <h3 className="text-xl font-bold text-surface-200 mb-2">No Sessions Yet</h3>
                    <p className="text-surface-400 mb-6">Complete your first exercise to start tracking your recovery progress.</p>
                    <Link to="/" className="btn-primary inline-block">
                        Start Your First Exercise →
                    </Link>
                </div>
            </div>
        );
    }

    const maxReps = Math.max(...(stats?.dailyData?.map(d => d.reps) || [1]), 1);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold glow-text">Recovery Dashboard</h2>
                    <p className="text-surface-400 text-sm">Track your progress and celebrate milestones</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleDownloadPdf} className="btn-primary !px-4 !py-2 text-sm">
                        📄 Download PDF
                    </button>
                    <button onClick={handleClearData} className="btn-secondary !px-4 !py-2 text-sm text-danger-400">
                        🗑️ Clear Data
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Total Sessions', value: sessions.length, icon: '📋', color: 'text-primary-400' },
                    { label: 'Total Reps', value: stats.totalReps, icon: '🔄', color: 'text-accent-400' },
                    { label: 'Avg Symmetry', value: `${stats.avgSymmetry}%`, icon: '⚖️', color: 'text-warn-400' },
                    { label: 'Avg Pain', value: `${stats.avgPain}/10`, icon: '😣', color: 'text-danger-400' },
                    { label: 'Total Time', value: `${Math.round(stats.totalDuration / 60)}m`, icon: '⏱️', color: 'text-primary-300' },
                    {
                        label: 'Best Streak',
                        value: (() => {
                            // Calculate max streak
                            const dates = [...new Set(sessions.map(s => new Date(s.timestamp).toDateString()))].sort((a, b) => new Date(a) - new Date(b));
                            let maxStreak = 0;
                            let currentStreak = 0;
                            for (let i = 0; i < dates.length; i++) {
                                if (i > 0) {
                                    const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / (1000 * 60 * 60 * 24);
                                    if (diff === 1) currentStreak++;
                                    else currentStreak = 1;
                                } else {
                                    currentStreak = 1;
                                }
                                maxStreak = Math.max(maxStreak, currentStreak);
                            }
                            return maxStreak;
                        })() + ' days',
                        icon: '🔥',
                        color: 'text-orange-400'
                    },
                ].map((stat, i) => (
                    <div key={i} className="card text-center p-3">
                        <span className="text-xl mb-1 block">{stat.icon}</span>
                        <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-[10px] text-surface-500 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Weekly Reps Chart */}
                <div className="card">
                    <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
                        <span>📈</span> Last 7 Days — Reps
                    </h3>
                    <div className="flex items-end gap-2 h-40">
                        {stats.dailyData.map((day, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-xs text-surface-400 font-mono">{day.reps > 0 ? day.reps : ''}</span>
                                <div className="w-full relative" style={{ height: '120px' }}>
                                    <div
                                        className="absolute bottom-0 w-full bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-lg transition-all duration-500"
                                        style={{
                                            height: day.reps > 0 ? `${Math.max(8, (day.reps / maxReps) * 100)}%` : '4px',
                                            opacity: day.reps > 0 ? 1 : 0.2,
                                        }}
                                    />
                                </div>
                                <span className="text-xs text-surface-500">{day.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Avg Pain Trend */}
                <div className="card">
                    <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
                        <span>📉</span> Avg Pain (Last 7 Days)
                    </h3>
                    <div className="flex items-end gap-2 h-40 relative">
                        {/* 0-10 Scale lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                            <div className="border-t border-surface-400 w-full h-0"></div>
                            <div className="border-t border-surface-400 w-full h-0"></div>
                            <div className="border-t border-surface-400 w-full h-0"></div>
                        </div>

                        {stats.dailyData.map((day, i) => {
                            // Calculate avg pain for this day
                            const daySessions = sessions.filter(s => new Date(s.timestamp).toDateString() === new Date(new Date() - (6 - i) * 86400000).toDateString());
                            const avgPain = daySessions.length > 0
                                ? daySessions.reduce((sum, s) => sum + (s.painLevel || 0), 0) / daySessions.length
                                : null;

                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1 z-10">
                                    {avgPain !== null && (
                                        <span className="text-xs text-danger-300 font-bold">{avgPain.toFixed(1)}</span>
                                    )}
                                    <div className="w-full relative flex justify-center" style={{ height: '120px' }}>
                                        {avgPain !== null ? (
                                            <div
                                                className="w-2 rounded-full bg-danger-500/80 transition-all duration-500"
                                                style={{
                                                    height: `${(avgPain / 10) * 100}%`,
                                                    position: 'absolute',
                                                    bottom: 0
                                                }}
                                            />
                                        ) : (
                                            <div className="w-1 h-1 bg-surface-700/50 rounded-full absolute bottom-0" />
                                        )}
                                    </div>
                                    <span className="text-xs text-surface-500">{day.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Recovery Timeline */}
            <div className="card">
                <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
                    <span>🕐</span> Recovery Timeline
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {[...sessions].reverse().slice(0, 20).map((session, i) => {
                        const date = new Date(session.timestamp);
                        return (
                            <div key={i} className="flex items-center gap-3 p-3 bg-surface-700/20 rounded-xl hover:bg-surface-700/40 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center text-lg flex-shrink-0">
                                    {session.painLevel <= 3 ? '💪' : session.painLevel <= 6 ? '😐' : '😣'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-surface-200 truncate">{session.exerciseName || 'Exercise'}</p>
                                    <p className="text-xs text-surface-500">
                                        {date.toLocaleDateString()} • {session.repsCompleted} reps • Pain {session.painLevel ?? '?'}/10
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className={`text-sm font-bold ${(session.symmetryScore ?? 0) >= 85 ? 'text-accent-400' :
                                        (session.symmetryScore ?? 0) >= 70 ? 'text-warn-400' : 'text-danger-400'
                                        }`}>
                                        {session.symmetryScore ?? '—'}%
                                    </p>
                                    <p className="text-[10px] text-surface-600">symmetry</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Exercise Breakdown */}
            <div className="card">
                <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
                    <span>🧩</span> Exercise Breakdown
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(() => {
                        const exerciseStats = {};
                        sessions.forEach(s => {
                            if (!exerciseStats[s.exerciseId]) {
                                exerciseStats[s.exerciseId] = {
                                    id: s.exerciseId,
                                    name: s.exerciseName,
                                    sessions: 0,
                                    reps: 0
                                };
                            }
                            exerciseStats[s.exerciseId].sessions++;
                            exerciseStats[s.exerciseId].reps += (s.repsCompleted || 0);
                        });

                        return Object.values(exerciseStats).map((stat) => (
                            <Link
                                key={stat.id}
                                to={`/dashboard/${stat.id}`}
                                className="flex items-center justify-between p-3 bg-surface-700/20 rounded-xl hover:bg-surface-700/40 transition-colors border border-transparent hover:border-primary-500/30 group"
                            >
                                <div>
                                    <p className="text-sm font-bold text-surface-200 group-hover:text-primary-300 transition-colors">{stat.name}</p>
                                    <p className="text-xs text-surface-500">{stat.sessions} sessions • {stat.reps} reps</p>
                                </div>
                                <span className="text-surface-600 group-hover:translate-x-1 transition-transform">→</span>
                            </Link>
                        ));
                    })()}
                </div>
            </div>

            {/* Milestones */}
            <div className="card">
                <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
                    <span>🏆</span> Milestones
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {allMilestones.map(def => {
                        const earned = milestones.find(m => m.id === def.id);
                        return (
                            <div
                                key={def.id}
                                className={`rounded-xl p-4 text-center transition-all duration-300 ${earned
                                    ? 'bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-accent-500/30'
                                    : 'bg-surface-800/30 border border-surface-700/30 opacity-40'
                                    }`}
                            >
                                <span className="text-3xl mb-2 block">{def.icon}</span>
                                <p className={`text-sm font-bold ${earned ? 'text-surface-200' : 'text-surface-500'}`}>
                                    {def.name}
                                </p>
                                <p className="text-xs text-surface-500 mt-1">{def.description}</p>
                                {earned && (
                                    <p className="text-[10px] text-accent-400 mt-2">
                                        ✓ {new Date(earned.earnedAt).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Gamification Badges */}
            <div className="card">
                <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
                    <span>🎮</span> Recovery Badges
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {(() => {
                        const badges = [
                            {
                                id: 'control_master', name: 'Control Master', icon: '🎯',
                                description: 'Avg quality score above 85%',
                                earned: sessions.some(s => s.avgQuality >= 85),
                            },
                            {
                                id: 'pain_warrior', name: 'Pain Warrior', icon: '⚔️',
                                description: 'Completed 3 sessions at pain level 5+',
                                earned: sessions.filter(s => (s.painLevel ?? 0) >= 5).length >= 3,
                            },
                            {
                                id: 'symmetry_star', name: 'Symmetry Star', icon: '⭐',
                                description: 'Symmetry score above 90% in a session',
                                earned: sessions.some(s => (s.symmetryScore ?? 0) >= 90),
                            },
                            {
                                id: 'endurance', name: 'Iron Will', icon: '🏋️',
                                description: 'Completed 10 total sessions',
                                earned: sessions.length >= 10,
                            },
                            {
                                id: 'week_streak', name: '7-Day Streak', icon: '🔥',
                                description: 'Exercise 7 days in a row',
                                earned: (() => {
                                    const dates = [...new Set(sessions.map(s => new Date(s.timestamp).toDateString()))].sort((a, b) => new Date(a) - new Date(b));
                                    let streak = 1;
                                    for (let i = 1; i < dates.length; i++) {
                                        const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / (1000 * 60 * 60 * 24);
                                        if (diff === 1) { streak++; if (streak >= 7) return true; }
                                        else streak = 1;
                                    }
                                    return false;
                                })(),
                            },
                            {
                                id: 'fatigue_fighter', name: 'Fatigue Fighter', icon: '💪',
                                description: 'Pushed through moderate fatigue',
                                earned: sessions.some(s => s.fatigueLevel === 'moderate' || s.fatigueLevel === 'severe'),
                            },
                            {
                                id: 'rom_improver', name: 'ROM Pusher', icon: '📐',
                                description: 'Improved ROM across 3 sessions',
                                earned: (() => {
                                    const roms = sessions.filter(s => s.currentROM).map(s => s.currentROM);
                                    if (roms.length < 3) return false;
                                    return roms[roms.length - 1] > roms[0];
                                })(),
                            },
                            {
                                id: 'hundred_reps', name: 'Century Club', icon: '💯',
                                description: 'Completed 100 total reps',
                                earned: sessions.reduce((s, se) => s + (se.repsCompleted || 0), 0) >= 100,
                            },
                            {
                                id: 'variety', name: 'Varied Athlete', icon: '🎪',
                                description: 'Tried 3 different exercises',
                                earned: new Set(sessions.map(s => s.exerciseId)).size >= 3,
                            },
                            {
                                id: 'perfect_form', name: 'Perfect Form', icon: '🌟',
                                description: 'Scored 95%+ quality on a rep',
                                earned: sessions.some(s => s.repScores && s.repScores.some(r => r >= 95)),
                            },
                        ];
                        return badges.map(badge => (
                            <div
                                key={badge.id}
                                className={`rounded-xl p-3 text-center transition-all ${badge.earned
                                    ? 'bg-gradient-to-br from-warn-500/15 to-accent-500/15 border border-warn-500/30 shadow-lg shadow-warn-500/10'
                                    : 'bg-surface-800/20 border border-surface-700/20 opacity-35 grayscale'
                                    }`}
                            >
                                <span className="text-2xl mb-1 block">{badge.icon}</span>
                                <p className={`text-xs font-bold ${badge.earned ? 'text-surface-200' : 'text-surface-500'}`}>
                                    {badge.name}
                                </p>
                                <p className="text-[9px] text-surface-500 mt-0.5">{badge.description}</p>
                            </div>
                        ));
                    })()}
                </div>
            </div>

            {/* Recovery Prediction */}
            {(() => {
                const recovery = predictRecovery(sessions);
                if (!recovery.hasEnoughData) return null;
                return (
                    <div className="card border-primary-500/20 bg-gradient-to-r from-primary-500/5 to-accent-500/5">
                        <h3 className="text-sm font-bold text-surface-300 mb-3 flex items-center gap-2">
                            <span>🔮</span> Recovery Prediction
                        </h3>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-lg font-bold text-surface-100">{recovery.trend}</p>
                                <p className="text-xs text-surface-500">
                                    {recovery.slopePerDay > 0 ? '+' : ''}{recovery.slopePerDay}°/day • Confidence: {recovery.confidence}
                                </p>
                            </div>
                            <p className="text-2xl font-bold text-primary-400">{recovery.currentROM}°</p>
                        </div>
                        {recovery.milestones.length > 0 && (
                            <div className="space-y-2">
                                {recovery.milestones.slice(0, 3).map((m, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-surface-700/30 rounded-lg px-3 py-2">
                                        <span className="text-primary-400 font-semibold text-sm">🎯 {m.label}</span>
                                        <span className="text-surface-300 text-sm">Est. {m.estimatedRange}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-sm text-primary-300 mt-3 bg-primary-500/10 rounded-lg px-3 py-2">
                            💡 {recovery.message}
                        </p>
                    </div>
                );
            })()}
        </div>
    );
}
