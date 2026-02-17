import { useState, useMemo } from 'react';
import { getSessions } from '../utils/storage';
import exercises from '../data/exercises.json';
import { predictRecovery } from '../engine/recoveryPredictor';

export default function TherapistDashboard() {
    const [selectedExercise, setSelectedExercise] = useState('all');
    const sessions = getSessions();

    const stats = useMemo(() => {
        let filtered = sessions;
        if (selectedExercise !== 'all') {
            filtered = sessions.filter(s => s.exerciseId === selectedExercise);
        }

        if (filtered.length === 0) return null;

        // Sort chronologically
        filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Pain trend
        const painTrend = filtered.map(s => ({
            date: new Date(s.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
            pain: s.painLevel ?? 0,
            timestamp: s.timestamp,
        }));

        // ROM trend
        const romTrend = filtered.filter(s => s.currentROM).map(s => ({
            date: new Date(s.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
            rom: Math.round(s.currentROM),
            timestamp: s.timestamp,
        }));

        // Quality trend
        const qualityTrend = filtered.filter(s => s.avgQuality).map(s => ({
            date: new Date(s.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
            quality: s.avgQuality,
            label: s.qualityLabel,
            timestamp: s.timestamp,
        }));

        // Symmetry trend
        const symmetryTrend = filtered.filter(s => s.symmetryScore).map(s => ({
            date: new Date(s.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
            symmetry: s.symmetryScore,
            timestamp: s.timestamp,
        }));

        // Fatigue events
        const fatigueEvents = filtered.filter(s => s.fatigueLevel && s.fatigueLevel !== 'none').map(s => ({
            date: new Date(s.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
            level: s.fatigueLevel,
            score: s.fatigueScore,
            exercise: s.exerciseName,
            timestamp: s.timestamp,
        }));

        // Risk alerts (high pain + high fatigue + low quality)
        const riskAlerts = filtered.filter(s =>
            (s.painLevel && s.painLevel >= 6) ||
            (s.fatigueLevel === 'severe') ||
            (s.avgQuality !== null && s.avgQuality < 40)
        ).map(s => {
            const reasons = [];
            if (s.painLevel >= 6) reasons.push(`Pain: ${s.painLevel}/10`);
            if (s.fatigueLevel === 'severe') reasons.push('Severe fatigue');
            if (s.avgQuality !== null && s.avgQuality < 40) reasons.push(`Low quality: ${s.avgQuality}%`);
            return {
                date: new Date(s.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
                exercise: s.exerciseName,
                reasons,
                timestamp: s.timestamp,
            };
        });

        // Summary stats
        const avgPain = painTrend.length > 0 ? (painTrend.reduce((s, p) => s + p.pain, 0) / painTrend.length).toFixed(1) : '—';
        const avgROM = romTrend.length > 0 ? Math.round(romTrend.reduce((s, r) => s + r.rom, 0) / romTrend.length) : '—';
        const avgQuality = qualityTrend.length > 0 ? Math.round(qualityTrend.reduce((s, q) => s + q.quality, 0) / qualityTrend.length) : '—';
        const avgSymmetry = symmetryTrend.length > 0 ? Math.round(symmetryTrend.reduce((s, sy) => s + sy.symmetry, 0) / symmetryTrend.length) : '—';

        // Recovery prediction
        const recovery = predictRecovery(sessions, selectedExercise !== 'all' ? selectedExercise : null);

        return {
            totalSessions: filtered.length,
            painTrend, romTrend, qualityTrend, symmetryTrend,
            fatigueEvents, riskAlerts,
            avgPain, avgROM, avgQuality, avgSymmetry,
            recovery,
        };
    }, [sessions, selectedExercise]);

    // Get unique exercises from sessions
    const exerciseOptions = useMemo(() => {
        const ids = [...new Set(sessions.map(s => s.exerciseId))];
        return ids.map(id => {
            const ex = exercises.find(e => e.id === id);
            return { id, name: ex ? ex.name : id };
        });
    }, [sessions]);

    const renderTrendChart = (data, valueKey, color, label, suffix = '') => {
        if (!data || data.length < 2) return <p className="text-surface-500 text-sm py-4 text-center">Need more sessions</p>;
        const maxVal = Math.max(...data.map(d => d[valueKey]), 1);
        return (
            <div>
                <div className="flex items-end gap-1 h-28">
                    {data.slice(-15).map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                            <span className="text-[8px] text-surface-400">{d[valueKey]}{suffix}</span>
                            <div
                                className={`w-full rounded-t ${color} min-h-[4px] transition-all`}
                                style={{ height: `${(d[valueKey] / maxVal) * 100}%` }}
                                title={`${d.date}: ${d[valueKey]}${suffix}`}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[8px] text-surface-500">{data[Math.max(0, data.length - 15)]?.date}</span>
                    <span className="text-[8px] text-surface-500">{data[data.length - 1]?.date}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
                        <span>🩺</span> Therapist Dashboard
                    </h1>
                    <p className="text-surface-400 text-sm mt-1">Comprehensive patient rehab analytics</p>
                </div>

                {/* Exercise filter */}
                <select
                    value={selectedExercise}
                    onChange={e => setSelectedExercise(e.target.value)}
                    className="bg-surface-800 border border-surface-600 text-surface-200 px-3 py-2 rounded-xl text-sm"
                >
                    <option value="all">All Exercises</option>
                    {exerciseOptions.map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                </select>
            </div>

            {!stats ? (
                <div className="card text-center py-12">
                    <span className="text-4xl mb-3 block">📊</span>
                    <p className="text-surface-400">No session data available yet.</p>
                    <p className="text-surface-500 text-sm mt-1">Complete some exercises to see analytics here.</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                            { label: 'Total Sessions', value: stats.totalSessions, color: 'text-primary-400', emoji: '📅' },
                            { label: 'Avg Pain', value: stats.avgPain, color: stats.avgPain > 5 ? 'text-danger-400' : 'text-accent-400', emoji: '💊', suffix: '/10' },
                            { label: 'Avg ROM', value: stats.avgROM, color: 'text-primary-400', emoji: '📐', suffix: '°' },
                            { label: 'Avg Quality', value: stats.avgQuality, color: stats.avgQuality >= 70 ? 'text-accent-400' : 'text-warn-400', emoji: '🌟', suffix: '%' },
                            { label: 'Avg Symmetry', value: stats.avgSymmetry, color: stats.avgSymmetry >= 80 ? 'text-accent-400' : 'text-warn-400', emoji: '⚖️', suffix: '%' },
                        ].map(stat => (
                            <div key={stat.label} className="card text-center">
                                <span className="text-lg">{stat.emoji}</span>
                                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}{stat.suffix}</p>
                                <p className="text-xs text-surface-500 mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Risk Alerts */}
                    {stats.riskAlerts.length > 0 && (
                        <div className="card border-danger-500/30 bg-danger-500/5">
                            <h3 className="text-sm font-bold text-danger-400 mb-3 flex items-center gap-2">
                                <span>⚠️</span> Risk Alerts ({stats.riskAlerts.length})
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                {stats.riskAlerts.slice(-10).reverse().map((alert, i) => (
                                    <div key={i} className="flex items-center justify-between bg-surface-800/50 rounded-lg px-3 py-2">
                                        <div>
                                            <p className="text-sm text-surface-200">{alert.exercise}</p>
                                            <p className="text-xs text-danger-400">{alert.reasons.join(' • ')}</p>
                                        </div>
                                        <span className="text-xs text-surface-500">{alert.date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Trend Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="card">
                            <h3 className="text-sm font-bold text-surface-300 mb-3">📊 Pain Trend</h3>
                            {renderTrendChart(stats.painTrend, 'pain', 'bg-danger-500', 'Pain', '/10')}
                        </div>
                        <div className="card">
                            <h3 className="text-sm font-bold text-surface-300 mb-3">📐 ROM Trend</h3>
                            {renderTrendChart(stats.romTrend, 'rom', 'bg-primary-500', 'ROM', '°')}
                        </div>
                        <div className="card">
                            <h3 className="text-sm font-bold text-surface-300 mb-3">🌟 Quality Score Trend</h3>
                            {renderTrendChart(stats.qualityTrend, 'quality', 'bg-accent-500', 'Quality', '%')}
                        </div>
                        <div className="card">
                            <h3 className="text-sm font-bold text-surface-300 mb-3">⚖️ Symmetry Trend</h3>
                            {renderTrendChart(stats.symmetryTrend, 'symmetry', 'bg-cyan-500', 'Symmetry', '%')}
                        </div>
                    </div>

                    {/* Fatigue Events */}
                    {stats.fatigueEvents.length > 0 && (
                        <div className="card">
                            <h3 className="text-sm font-bold text-surface-300 mb-3 flex items-center gap-2">
                                <span>😰</span> Fatigue Events ({stats.fatigueEvents.length})
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                {stats.fatigueEvents.slice(-8).reverse().map((evt, i) => (
                                    <div key={i} className="flex items-center justify-between bg-surface-700/30 rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm ${evt.level === 'severe' ? 'text-danger-400' : evt.level === 'moderate' ? 'text-warn-400' : 'text-surface-400'}`}>
                                                {evt.level === 'severe' ? '🔴' : evt.level === 'moderate' ? '🟠' : '🟡'}
                                            </span>
                                            <div>
                                                <p className="text-sm text-surface-200">{evt.exercise}</p>
                                                <p className="text-xs text-surface-500 capitalize">{evt.level} fatigue (score: {evt.score})</p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-surface-500">{evt.date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recovery Prediction */}
                    {stats.recovery && (
                        <div className="card border-primary-500/20 bg-gradient-to-r from-primary-500/5 to-accent-500/5">
                            <h3 className="text-sm font-bold text-surface-300 mb-3 flex items-center gap-2">
                                <span>🔮</span> Recovery Prediction
                            </h3>
                            {stats.recovery.hasEnoughData ? (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="text-lg font-bold text-surface-100">{stats.recovery.trend}</p>
                                            <p className="text-xs text-surface-500">
                                                {stats.recovery.slopePerDay > 0 ? '+' : ''}{stats.recovery.slopePerDay}°/day •
                                                Confidence: {stats.recovery.confidence} •
                                                {stats.recovery.sessionsAnalyzed} sessions analyzed
                                            </p>
                                        </div>
                                        <p className="text-2xl font-bold text-primary-400">{stats.recovery.currentROM}°</p>
                                    </div>

                                    {/* Milestones */}
                                    {stats.recovery.milestones.length > 0 && (
                                        <div className="space-y-2 mt-3">
                                            {stats.recovery.milestones.map((m, i) => (
                                                <div key={i} className="flex items-center gap-3 bg-surface-700/30 rounded-lg px-3 py-2">
                                                    <span className="text-primary-400 font-semibold">🎯 {m.label}</span>
                                                    <span className="text-surface-300 text-sm">Est. {m.estimatedRange}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-sm text-primary-300 mt-3 bg-primary-500/10 rounded-lg px-3 py-2">
                                        💡 {stats.recovery.message}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-surface-400 text-sm">{stats.recovery.message}</p>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
