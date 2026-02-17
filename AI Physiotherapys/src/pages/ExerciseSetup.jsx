import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import exercises from '../data/exercises.json';
import { usePatient } from '../context/PatientContext';

const DIFFICULTY_LEVELS = {
    easy: { label: 'Easy', multiplier: 0.5, romAdj: -10, color: 'text-success-400', border: 'border-success-500/50', bg: 'bg-success-500/10' },
    medium: { label: 'Medium', multiplier: 1.0, romAdj: 0, color: 'text-warn-400', border: 'border-warn-500/50', bg: 'bg-warn-500/10' },
    hard: { label: 'Hard', multiplier: 1.2, romAdj: 5, color: 'text-danger-400', border: 'border-danger-500/50', bg: 'bg-danger-500/10' },
};

export default function ExerciseSetup() {
    const navigate = useNavigate();
    const { patient, setExerciseConfig, painLevel, setPainLevel } = usePatient();
    const [selectedExerciseId, setSelectedExerciseId] = useState('');
    const [difficulty, setDifficulty] = useState('medium');

    if (!patient) {
        // Redirect if no patient data
        setTimeout(() => navigate('/'), 0);
        return null;
    }

    const selectedExercise = useMemo(() =>
        exercises.find(e => e.id === selectedExerciseId),
        [selectedExerciseId]);

    const targets = useMemo(() => {
        if (!selectedExercise) return null;
        const config = DIFFICULTY_LEVELS[difficulty];
        return {
            reps: Math.ceil(selectedExercise.defaultReps * config.multiplier),
            sets: selectedExercise.defaultSets,
            rom: (selectedExercise.romMin !== undefined ? `${selectedExercise.romMin + config.romAdj}°` : 'N/A') +
                (selectedExercise.romMax !== undefined ? ` - ${selectedExercise.romMax + config.romAdj}°` : ''),
        };
    }, [selectedExercise, difficulty]);

    const handleStart = () => {
        if (!selectedExerciseId) return;

        setExerciseConfig(selectedExerciseId, difficulty);
        navigate(`/session/${selectedExerciseId}`);
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-in">
            {/* Header with Patient Info */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold glow-text">Session Setup</h1>
                    <p className="text-surface-400 text-sm">Configure exercise parameters</p>
                </div>
                <div className="text-right bg-surface-800/50 px-4 py-2 rounded-xl border border-surface-700">
                    <p className="text-sm font-bold text-surface-200">{patient.name}</p>
                    <p className="text-xs text-surface-500">Age: {patient.age}</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* 1. Exercise Selection */}
                <div className="card">
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                        Select Exercise
                    </label>
                    <select
                        value={selectedExerciseId}
                        onChange={(e) => setSelectedExerciseId(e.target.value)}
                        className="w-full bg-surface-900/50 border border-surface-600 rounded-xl px-4 py-3 text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all cursor-pointer"
                    >
                        <option value="">-- Choose Exercise --</option>
                        {exercises.map(ex => (
                            <option key={ex.id} value={ex.id}>
                                {ex.name} ({ex.difficulty})
                            </option>
                        ))}
                    </select>

                    {selectedExercise && (
                        <div className="mt-4 p-4 bg-surface-800/50 rounded-xl border border-surface-700/50 flex gap-4">
                            <span className="text-4xl">{selectedExercise.icon}</span>
                            <div>
                                <p className="text-sm text-surface-300">{selectedExercise.description}</p>
                                <div className="flex gap-2 mt-2">
                                    <span className="badge badge-info">{selectedExercise.environment}</span>
                                    <span className="badge badge-warning">{selectedExercise.category}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Difficulty Selection */}
                {selectedExercise && (
                    <div className="card animate-fade-in">
                        <label className="block text-sm font-medium text-surface-300 mb-3">
                            Select Difficulty Level
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {Object.entries(DIFFICULTY_LEVELS).map(([key, config]) => (
                                <button
                                    key={key}
                                    onClick={() => setDifficulty(key)}
                                    className={`p-3 rounded-xl border transition-all text-center ${difficulty === key
                                        ? `${config.bg} ${config.border} ring-1 ring-${config.color.split('-')[1]}-500`
                                        : 'bg-surface-800/30 border-surface-700/30 hover:bg-surface-800/60'
                                        }`}
                                >
                                    <p className={`font-bold ${difficulty === key ? config.color : 'text-surface-400'}`}>
                                        {config.label}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. Pain Level Selection */}
                {selectedExercise && (
                    <div className="card animate-fade-in">
                        <label className="block text-sm font-medium text-surface-300 mb-3">
                            Current Pain Level (0-10)
                        </label>
                        <div className="flex gap-1 overflow-x-auto pb-2">
                            {[...Array(11)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPainLevel(i)}
                                    className={`flex-1 min-w-[40px] h-10 rounded-lg border font-bold transition-all ${painLevel === i
                                        ? i >= 7 ? 'bg-danger-500 text-white border-danger-400'
                                            : i >= 4 ? 'bg-warn-500 text-white border-warn-400'
                                                : 'bg-success-500 text-white border-success-400'
                                        : 'bg-surface-800/50 border-surface-700/50 text-surface-400 hover:bg-surface-700'
                                        }`}
                                >
                                    {i}
                                </button>
                            ))}
                        </div>
                        <p className="text-center text-xs mt-2 text-surface-400">
                            {painLevel === 0 ? 'No Pain' :
                                painLevel <= 3 ? 'Mild Pain' :
                                    painLevel <= 6 ? 'Moderate Pain' : 'Severe Pain'}
                        </p>
                    </div>
                )}

                {/* 4. Target Preview & Start */}
                {selectedExercise && targets && (
                    <div className="card bg-gradient-to-br from-primary-900/20 to-surface-800/50 border-primary-500/20">
                        <h3 className="text-sm font-semibold text-surface-300 mb-4">Target Parameters</h3>
                        <div className="grid grid-cols-3 gap-4 text-center mb-6">
                            <div className="bg-surface-900/40 p-3 rounded-xl">
                                <span className="text-2xl block text-primary-400 font-bold">{targets.reps}</span>
                                <span className="text-xs text-surface-500">Target Reps</span>
                            </div>
                            <div className="bg-surface-900/40 p-3 rounded-xl">
                                <span className="text-2xl block text-primary-400 font-bold">{targets.sets}</span>
                                <span className="text-xs text-surface-500">Target Sets</span>
                            </div>
                            <div className="bg-surface-900/40 p-3 rounded-xl">
                                <span className="text-sm block text-primary-400 font-bold py-1.5">{targets.rom}</span>
                                <span className="text-xs text-surface-500">Target ROM</span>
                            </div>
                        </div>

                        <button
                            onClick={handleStart}
                            className="btn-primary w-full py-4 text-lg shadow-lg shadow-primary-500/20"
                        >
                            🚀 Start Guided Session
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
