import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import exercises from '../data/exercises.json';
import { filterExercisesByPain, adjustForPain } from '../engine/painAdjuster';
import { getSessions } from '../utils/storage';

const ENVIRONMENTS = [
    { value: 'all', label: 'All', icon: '🏠' },
    { value: 'bed', label: 'Bed', icon: '🛏️' },
    { value: 'chair', label: 'Chair', icon: '🪑' },
    { value: 'standing', label: 'Standing', icon: '🧍' },
];

const CATEGORIES = [
    { value: 'all', label: 'All' },
    { value: 'knee', label: '🦵 Knee' },
    { value: 'shoulder', label: '💪 Shoulder' },
    { value: 'hip', label: '🦿 Hip' },
    { value: 'ankle', label: '🦶 Ankle' },
];

export default function Home({ painLevel, setPainLevel, environment, setEnvironment }) {
    const [category, setCategory] = useState('all');
    const navigate = useNavigate();
    const [allSessions] = useState(getSessions);

    const filteredExercises = useMemo(() => {
        let filtered = filterExercisesByPain(exercises, painLevel);
        if (environment !== 'all') {
            filtered = filtered.filter(e => e.environment === environment);
        }
        if (category !== 'all') {
            filtered = filtered.filter(e => e.category === category);
        }
        return filtered.map(e => adjustForPain(painLevel, e));
    }, [painLevel, environment, category]);

    const painColor = painLevel <= 3 ? 'text-accent-400' : painLevel <= 6 ? 'text-warn-400' : 'text-danger-400';
    const painBg = painLevel <= 3 ? 'from-accent-500' : painLevel <= 6 ? 'from-warn-500' : 'from-danger-500';

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Hero */}
            <div className="card bg-gradient-to-br from-primary-900/40 to-surface-800/60 border-primary-700/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold glow-text mb-1">Your Recovery Journey</h2>
                        <p className="text-surface-400 text-sm">Select an exercise to begin your in-browser guided session</p>
                    </div>
                    <div className="flex items-center gap-2 bg-surface-800/60 px-4 py-2 rounded-xl border border-surface-700/50">
                        <span className="text-xl">🔒</span>
                        <span className="text-xs text-surface-400">100% Private<br />In-Browser Only</span>
                    </div>
                </div>
            </div>

            {/* Pain Level Slider */}
            <div className="card">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-surface-300 flex items-center gap-2">
                        <span>😣</span> Current Pain Level
                    </h3>
                    <span className={`text-2xl font-bold ${painColor}`}>{painLevel}/10</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="10"
                    value={painLevel}
                    onChange={(e) => setPainLevel(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                        background: `linear-gradient(to right, #17b37c ${painLevel * 10}%, #334155 ${painLevel * 10}%)`,
                    }}
                />
                <div className="flex justify-between text-xs text-surface-500 mt-1">
                    <span>No Pain</span>
                    <span>Moderate</span>
                    <span>Severe</span>
                </div>
                {painLevel >= 8 && (
                    <div className="mt-3 p-3 bg-danger-500/10 border border-danger-500/30 rounded-xl">
                        <p className="text-danger-400 text-sm font-medium">
                            ⛔ Severe pain detected — only gentle exercises are available. Please consult your physiotherapist.
                        </p>
                    </div>
                )}
                {painLevel >= 5 && painLevel < 8 && (
                    <div className="mt-3 p-3 bg-warn-500/10 border border-warn-500/30 rounded-xl">
                        <p className="text-warn-400 text-sm font-medium">
                            ⚠️ Exercise intensity has been reduced. Listen to your body and stop if pain increases.
                        </p>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Environment Filter */}
                <div className="flex gap-2 flex-wrap">
                    {ENVIRONMENTS.map(env => (
                        <button
                            key={env.value}
                            onClick={() => setEnvironment(env.value)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${environment === env.value
                                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                                : 'bg-surface-800/60 text-surface-400 border border-surface-700/50 hover:bg-surface-700/60'
                                }`}
                        >
                            <span>{env.icon}</span>
                            <span>{env.label}</span>
                        </button>
                    ))}
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 flex-wrap">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.value}
                            onClick={() => setCategory(cat.value)}
                            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${category === cat.value
                                ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30'
                                : 'bg-surface-800/60 text-surface-400 border border-surface-700/50 hover:bg-surface-700/60'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Exercise Cards */}
            {filteredExercises.length === 0 ? (
                <div className="card text-center py-12">
                    <span className="text-4xl mb-3 block">🔍</span>
                    <p className="text-surface-400">No exercises match the current filters. Try adjusting your pain level or environment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredExercises.map(exercise => (
                        <button
                            key={exercise.id}
                            onClick={() => !exercise.shouldStop && navigate(`/exercise/${exercise.id}`)}
                            disabled={exercise.shouldStop}
                            className="card-hover text-left group disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <span className="text-3xl">{exercise.icon}</span>
                                <div className="flex gap-1.5">
                                    <span className={`badge ${exercise.difficulty === 'easy' ? 'badge-success' :
                                        exercise.difficulty === 'medium' ? 'badge-warning' : 'badge-danger'
                                        }`}>
                                        {exercise.difficulty}
                                    </span>
                                    <span className="badge badge-info">{exercise.environment}</span>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-surface-100 mb-1 group-hover:text-primary-300 transition-colors">
                                {exercise.name}
                            </h3>
                            <p className="text-surface-400 text-sm mb-3 line-clamp-2">{exercise.description}</p>
                            <div className="flex items-center gap-4 text-xs text-surface-500">
                                <span>🔄 {exercise.adjustedReps || exercise.defaultReps} reps</span>
                                <span>📋 {exercise.adjustedSets || exercise.defaultSets} sets</span>
                                <span>📐 {exercise.category}</span>
                            </div>

                            {/* Link to dashboard if data exists */}
                            {allSessions.some(s => s.exerciseId === exercise.id) && (
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/dashboard/${exercise.id}`);
                                    }}
                                    className="mt-3 text-xs font-semibold text-primary-400 hover:text-primary-300 flex items-center gap-1 z-10 relative"
                                >
                                    <span>📊 View Progress</span>
                                </div>
                            )}
                            {exercise.recommendation && painLevel > 0 && (
                                <p className={`mt-2 text-xs ${exercise.painCategory === 'severe' ? 'text-danger-400' :
                                    exercise.painCategory === 'significant' ? 'text-warn-400' : 'text-surface-400'
                                    }`}>
                                    {exercise.recommendation}
                                </p>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
