import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSessions } from '../utils/storage';
import { generateExerciseReport } from '../utils/pdfReport';
import exercises from '../data/exercises.json';

export default function ExerciseDashboardPage() {
    const { exerciseId } = useParams();
    const [allSessions] = useState(getSessions);

    const exercise = exercises.find(e => e.id === exerciseId);

    // Filter sessions for this exercise
    const sessions = useMemo(() =>
        allSessions.filter(s => s.exerciseId === exerciseId),
        [allSessions, exerciseId]);

    const handleDownloadReport = () => {
        generateExerciseReport(sessions, exerciseId, exercise);
    };

    const stats = useMemo(() => {
        if (sessions.length === 0) return null;

        const totalReps = sessions.reduce((sum, s) => sum + (s.repsCompleted || 0), 0);
        const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const avgSymmetry = Math.round(sessions.reduce((sum, s) => sum + (s.symmetryScore || 0), 0) / sessions.length);
        const avgPain = (sessions.reduce((sum, s) => sum + (s.painLevel ?? 0), 0) / sessions.length).toFixed(1);
        const maxROM = Math.max(...sessions.map(s => s.currentROM || 0));

        // Weekly data for this exercise
        const now = new Date();
        const dailyData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            const dayStr = date.toDateString();
            const daySessions = sessions.filter(s => new Date(s.timestamp).toDateString() === dayStr);
            dailyData.push({
                label: date.toLocaleDateString('en', { weekday: 'short' }),
                reps: daySessions.reduce((sum, s) => sum + (s.repsCompleted || 0), 0),
                pain: daySessions.length ? daySessions.reduce((sum, s) => sum + (s.painLevel || 0), 0) / daySessions.length : null
            });
        }

        return { totalReps, totalDuration, avgSymmetry, avgPain, maxROM, dailyData };
    }, [sessions]);

    if (!exercise) return <div className="p-8 text-center">Exercise not found</div>;

    if (sessions.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Link to="/dashboard" className="btn-secondary !px-3 !py-2">← Back</Link>
                    <h2 className="text-2xl font-bold glow-text">{exercise.name} Dashboard</h2>
                </div>
                <div className="card text-center py-16">
                    <span className="text-6xl mb-4 block">📊</span>
                    <h3 className="text-xl font-bold text-surface-200 mb-2">No Data Yet</h3>
                    <p className="text-surface-400 mb-6">Complete this exercise to see detailed statistics.</p>
                    <Link to={`/exercise/${exerciseId}`} className="btn-primary inline-block">
                        Start Exercise →
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
                <div className="flex items-center gap-3">
                    <Link to="/dashboard" className="btn-secondary !px-3 !py-2">← Back</Link>
                    <div>
                        <h2 className="text-2xl font-bold glow-text flex items-center gap-2">
                            <span>{exercise.icon}</span> {exercise.name}
                        </h2>
                        <p className="text-surface-400 text-sm">Detailed performance metrics</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleDownloadReport} className="btn-secondary !px-4 !py-2 text-sm bg-surface-800/50">
                        📄 PDF Report
                    </button>
                    <Link to={`/exercise/${exerciseId}`} className="btn-primary !px-4 !py-2 text-sm">
                        ▶️ Start Session
                    </Link>
                </div>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: 'Sessions', value: sessions.length, icon: '📋', color: 'text-primary-400' },
                    { label: 'Total Reps', value: stats.totalReps, icon: '🔄', color: 'text-accent-400' },
                    { label: 'Avg Symmetry', value: `${stats.avgSymmetry}%`, icon: '⚖️', color: 'text-warn-400' },
                    { label: 'Best ROM', value: `${Math.round(stats.maxROM)}°`, icon: '📐', color: 'text-primary-300' }, // New stat
                    { label: 'Avg Pain', value: `${stats.avgPain}/10`, icon: '😣', color: 'text-danger-400' },
                ].map((stat, i) => (
                    <div key={i} className="card text-center">
                        <span className="text-xl mb-1 block">{stat.icon}</span>
                        <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-[10px] text-surface-500 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Reps Chart */}
                <div className="card">
                    <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
                        <span>📈</span> Weekly Reps
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

                {/* Pain Trend */}
                <div className="card">
                    <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
                        <span>📉</span> Pain Trend (Last 7 Days)
                    </h3>
                    <div className="flex items-end gap-2 h-40 relative">
                        {/* 0-10 Scale lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                            <div className="border-t border-surface-400 w-full h-0"></div>
                            <div className="border-t border-surface-400 w-full h-0"></div>
                            <div className="border-t border-surface-400 w-full h-0"></div>
                        </div>

                        {stats.dailyData.map((day, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1 z-10">
                                {day.pain !== null && (
                                    <span className="text-xs text-danger-300 font-bold">{day.pain.toFixed(1)}</span>
                                )}
                                <div className="w-full relative flex justify-center" style={{ height: '120px' }}>
                                    {day.pain !== null ? (
                                        <div
                                            className="w-2 rounded-full bg-danger-500/80 transition-all duration-500"
                                            style={{
                                                height: `${(day.pain / 10) * 100}%`,
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
                        ))}
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="card">
                <h3 className="text-sm font-semibold text-surface-300 mb-4 flex items-center gap-2">
                    <span>🕐</span> Session History
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-surface-400">
                        <thead className="text-surface-500 border-b border-surface-700/50">
                            <tr>
                                <th className="pb-2 font-medium">Date</th>
                                <th className="pb-2 font-medium">Reps</th>
                                <th className="pb-2 font-medium">Sets</th>
                                <th className="pb-2 font-medium">Symmetry</th>
                                <th className="pb-2 font-medium">Pain</th>
                                <th className="pb-2 font-medium">Duration</th>
                                <th className="pb-2 font-medium">ROM</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-700/30">
                            {[...sessions].reverse().map((session, i) => (
                                <tr key={i} className="group hover:bg-surface-700/20 transition-colors">
                                    <td className="py-3 text-surface-200">{new Date(session.timestamp).toLocaleDateString()}</td>
                                    <td className="py-3">{session.repsCompleted}</td>
                                    <td className="py-3">{session.setsCompleted}</td>
                                    <td className="py-3">
                                        <span className={`${(session.symmetryScore ?? 0) >= 85 ? 'text-accent-400' : 'text-warn-400'}`}>
                                            {session.symmetryScore}%
                                        </span>
                                    </td>
                                    <td className="py-3">
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${session.painLevel <= 3 ? 'bg-accent-500/10 text-accent-400' :
                                            session.painLevel <= 6 ? 'bg-warn-500/10 text-warn-400' : 'bg-danger-500/10 text-danger-400'
                                            }`}>
                                            {session.painLevel}/10
                                        </span>
                                    </td>
                                    <td className="py-3 font-mono text-xs">{Math.floor(session.duration / 60)}:{(session.duration % 60).toString().padStart(2, '0')}</td>
                                    <td className="py-3">{session.currentROM ? Math.round(session.currentROM) + '°' : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
