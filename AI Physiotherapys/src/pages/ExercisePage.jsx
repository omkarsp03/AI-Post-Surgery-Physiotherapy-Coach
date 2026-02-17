import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import exercises from '../data/exercises.json';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { getJointAngle, AngleSmoother } from '../utils/angleUtils';
import { RepCounter } from '../engine/exerciseEngine';
import { checkAngleSafety, detectCompensation, getOverallSafety } from '../engine/safetyEngine';
import { calculateSymmetry, SymmetryTracker } from '../engine/symmetryEngine';
import { adjustForPain } from '../engine/painAdjuster';
import { MovementQualityTracker } from '../engine/movementQuality';
import { FatigueDetector } from '../engine/fatigueDetector';
import { applyAdaptive, evaluateAndAdapt } from '../engine/adaptiveEngine';
import { getSmartFeedback, detectGesture, GestureController, suggestAlternative } from '../engine/smartCoach';
import { saveSession, savePainLevel } from '../utils/storage';
import { generateSessionReport } from '../utils/pdfReport'; // Auto-report
import { usePatient } from '../context/PatientContext'; // Patient Context
import CameraFeed from '../components/CameraFeed';
import FeedbackOverlay from '../components/FeedbackOverlay';
import SymmetryBar from '../components/SymmetryBar';
import SafeZoneBar from '../components/SafeZoneBar';
import { drawGhostSkeleton } from '../components/GhostSkeleton';
import { calculateHeatmap, drawHeatmap } from '../components/CompensationHeatmap';

export default function ExercisePage() {
    const { exerciseId } = useParams();
    const navigate = useNavigate();
    const { patient, sessionConfig, painLevel } = usePatient(); // Get patient context

    // Redirect to intake if no patient
    useEffect(() => {
        if (!patient) navigate('/');
    }, [patient, navigate]);

    const rawExercise = exercises.find(e => e.id === exerciseId);

    // Apply Difficulty from Context (Overrides default)
    const exercise = useMemo(() => {
        if (!rawExercise) return null;
        let modified = { ...rawExercise };

        // Apply Patient Difficulty Config
        if (sessionConfig && sessionConfig.difficulty) {
            const diffMap = {
                easy: { mult: 0.5, rom: -10 },
                medium: { mult: 1.0, rom: 0 },
                hard: { mult: 1.2, rom: 5 }
            };
            const settings = diffMap[sessionConfig.difficulty] || diffMap.medium;

            modified.defaultReps = Math.ceil(modified.defaultReps * settings.mult);
            modified.adjustedReps = modified.defaultReps; // Ensure this is set

            if (modified.romMin !== undefined) {
                modified.romMin += settings.rom;
                modified.romMax += settings.rom;
                modified.angleRange = { min: modified.romMin, max: modified.romMax };
            }
        }

        const painAdjusted = adjustForPain(painLevel, modified);
        return applyAdaptive(painAdjusted, exerciseId);
    }, [rawExercise, painLevel, exerciseId, sessionConfig]);

    const { landmarks, isLoading, isRunning, error, start, stop } = usePoseDetection();

    const [isActive, setIsActive] = useState(false);
    const [exerciseState, setExerciseState] = useState(null);
    const [safetyStatus, setSafetyStatus] = useState(null);
    const [compensation, setCompensation] = useState(null);
    const [symmetryData, setSymmetryData] = useState(null);
    const [sessionTimer, setSessionTimer] = useState(0);
    const [sessionComplete, setSessionComplete] = useState(false);

    // New feature states
    const [viewMode, setViewMode] = useState('coach'); // 'mirror' | 'coach'
    const [qualityScore, setQualityScore] = useState(null);
    const [fatigueStatus, setFatigueStatus] = useState(null);
    const [gestureState, setGestureState] = useState(null);
    const [smartFeedback, setSmartFeedback] = useState([]);
    const [isPaused, setIsPaused] = useState(false);
    const [alternativeSuggestion, setAlternativeSuggestion] = useState(null);
    const [adaptiveResult, setAdaptiveResult] = useState(null);
    const [isDemoMode, setIsDemoMode] = useState(false);

    const cameraFeedRef = useRef(null);
    const repCounterRef = useRef(null);
    const symmetryTrackerRef = useRef(new SymmetryTracker());
    const timerRef = useRef(null);
    const prevLandmarksLocal = useRef(null);
    const prevTimeLocal = useRef(null);
    const angleSmootherRef = useRef(new AngleSmoother(0.4));

    // New engine refs
    const qualityTrackerRef = useRef(new MovementQualityTracker());
    const fatigueDetectorRef = useRef(new FatigueDetector());
    const gestureControllerRef = useRef(new GestureController());
    const prevRepsRef = useRef(0);

    // Initialize rep counter
    useEffect(() => {
        if (exercise) {
            repCounterRef.current = new RepCounter(exercise);
            if (angleSmootherRef.current) angleSmootherRef.current.reset();
            qualityTrackerRef.current.reset();
            fatigueDetectorRef.current.reset();
            gestureControllerRef.current.reset();
        }
    }, [exercise]);

    // Session timer
    useEffect(() => {
        if (isActive && !sessionComplete && !isPaused) {
            timerRef.current = setInterval(() => {
                setSessionTimer(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [isActive, sessionComplete, isPaused]);

    // Demo mode: generate simulated landmarks
    const demoLandmarksRef = useRef(null);
    const demoAngleRef = useRef(90);
    const demoDirectionRef = useRef(1);

    useEffect(() => {
        if (!isDemoMode || !isActive) return;
        const interval = setInterval(() => {
            demoAngleRef.current += demoDirectionRef.current * 2;
            if (demoAngleRef.current >= 170) demoDirectionRef.current = -1;
            if (demoAngleRef.current <= 30) demoDirectionRef.current = 1;
            // Create minimal simulated landmark data
            const simLandmarks = Array(33).fill(null).map((_, i) => ({
                x: 0.5 + (Math.random() - 0.5) * 0.01,
                y: 0.3 + (i / 33) * 0.5 + (Math.random() - 0.5) * 0.01,
                z: 0,
                visibility: 0.95,
            }));
            demoLandmarksRef.current = simLandmarks;
        }, 50);
        return () => clearInterval(interval);
    }, [isDemoMode, isActive]);

    // Process pose landmarks (main processing loop)
    useEffect(() => {
        if (!exercise || !repCounterRef.current || !isActive || sessionComplete || isPaused) return;

        const currentLandmarks = isDemoMode ? demoLandmarksRef.current : landmarks;
        if (!currentLandmarks) return;

        const now = performance.now();

        // Get primary joint angle
        const primaryJoint = exercise.targetJoints[0];
        const rawAngle = isDemoMode ? demoAngleRef.current : getJointAngle(currentLandmarks, primaryJoint.landmarks);
        const angle = angleSmootherRef.current.addReading(rawAngle);

        // Feed angle sample to quality tracker
        qualityTrackerRef.current.addSample(angle, now);

        // Update rep counter
        const state = repCounterRef.current.update(angle, now);
        setExerciseState(state);

        // Check if a new rep was completed
        if (state.reps > prevRepsRef.current || (state.reps === 0 && state.sets > 0)) {
            // Score the completed rep
            const sym = calculateSymmetry(currentLandmarks, exercise);
            const repQuality = qualityTrackerRef.current.scoreRep({
                targetROMMin: exercise.angleRange.min,
                targetROMMax: exercise.angleRange.max,
                symmetryScore: sym.score,
            });
            if (repQuality) {
                setQualityScore(repQuality);

                // Feed data to fatigue detector
                const repSpeed = state.lastRepSpeed ? parseFloat(state.lastRepSpeed) : null;
                fatigueDetectorRef.current.addRepData({
                    speed: repSpeed,
                    rom: state.currentROM,
                    symmetryScore: sym.score,
                });
                setFatigueStatus(fatigueDetectorRef.current.getStatus());

                // Check for exercise auto-switch suggestion
                const avgQuality = qualityTrackerRef.current.getAverageQuality();
                if (avgQuality && state.reps >= 3) {
                    const suggestion = suggestAlternative(exerciseId, {
                        avgQuality: avgQuality.score,
                        completionRate: state.reps / (exercise.adjustedReps || exercise.defaultReps),
                        fatigueLevel: fatigueDetectorRef.current.getStatus().level,
                    });
                    if (suggestion) setAlternativeSuggestion(suggestion);
                }
            }
            prevRepsRef.current = state.reps;
        }

        // Safety check
        const angleSafety = checkAngleSafety(angle, exercise.safetyLimits);

        // Compensation detection
        const dt = prevTimeLocal.current ? (now - prevTimeLocal.current) / 1000 : 0;
        const comp = detectCompensation(currentLandmarks, prevLandmarksLocal.current, dt);
        setCompensation(comp);

        const overall = getOverallSafety(angleSafety, comp);
        setSafetyStatus(overall);

        // Symmetry
        const sym = calculateSymmetry(currentLandmarks, exercise);
        setSymmetryData(sym);
        symmetryTrackerRef.current.addReading(sym);

        // Fatigue jitter tracking
        fatigueDetectorRef.current.addJitterSample(currentLandmarks, prevLandmarksLocal.current);

        // Smart coaching feedback (every ~30 frames to avoid spam)
        if (Math.random() < 0.05) {
            const coaching = getSmartFeedback({
                trunkLean: comp.trunkLean,
                momentum: comp.momentum,
                repSpeed: state.lastRepSpeed ? parseFloat(state.lastRepSpeed) : null,
                romPercentage: state.currentROM && exercise.angleRange
                    ? (state.currentROM / (exercise.angleRange.max - exercise.angleRange.min)) * 100
                    : null,
                symmetryScore: sym.score,
                quality: qualityScore?.overall || null,
                landmarks: currentLandmarks,
            });
            if (coaching.length > 0) setSmartFeedback(coaching);
        }

        // Gesture detection
        if (!isDemoMode) {
            const gesture = detectGesture(currentLandmarks);
            const gestureResult = gestureControllerRef.current.update(gesture, now);
            setGestureState(gestureResult);

            if (gestureResult.activated) {
                if (gestureResult.gesture === 'pause') {
                    setIsPaused(prev => !prev);
                }
            }
        }

        // Coach mode: draw overlays on canvas
        if (viewMode === 'coach' && cameraFeedRef.current) {
            const canvas = cameraFeedRef.current.getCanvas();
            if (canvas) {
                const ctx = canvas.getContext('2d');
                // Draw ghost skeleton
                drawGhostSkeleton(ctx, currentLandmarks, exercise, canvas.width, canvas.height);
                // Draw compensation heatmap
                const heatPoints = calculateHeatmap(currentLandmarks, exercise, comp);
                drawHeatmap(ctx, heatPoints, canvas.width, canvas.height);
            }
        }

        // Check set/rep completion for session end
        if (state.sets >= (exercise.adjustedSets || exercise.defaultSets)) {
            handleSessionComplete(state);
        }

        prevLandmarksLocal.current = currentLandmarks.map(l => ({ ...l }));
        prevTimeLocal.current = now;
    }, [landmarks, exercise, isActive, sessionComplete, isPaused, isDemoMode, viewMode, exerciseId, qualityScore]);

    const handleStart = useCallback(async () => {
        if (!cameraFeedRef.current) return;
        const video = cameraFeedRef.current.getVideo();
        const canvas = cameraFeedRef.current.getCanvas();
        if (!video || !canvas) {
            console.error('Video or canvas element not found');
            return;
        }

        setSessionTimer(0);
        setSessionComplete(false);
        setQualityScore(null);
        setFatigueStatus(null);
        setSmartFeedback([]);
        setAlternativeSuggestion(null);
        setIsPaused(false);
        prevRepsRef.current = 0;
        if (repCounterRef.current) repCounterRef.current.reset();
        qualityTrackerRef.current.reset();
        fatigueDetectorRef.current.reset();
        gestureControllerRef.current.reset();
        symmetryTrackerRef.current.reset();

        await start(video, canvas);
        setIsActive(true);
    }, [start]);

    const handleStop = useCallback(() => {
        const state = repCounterRef.current?.getState();
        if (state && (state.reps > 0 || state.sets > 0)) {
            handleSessionComplete(state);
        }
        stop();
        setIsActive(false);
        setIsPaused(false);
    }, [stop]);

    const handleSessionComplete = useCallback((state) => {
        setSessionComplete(true);
        clearInterval(timerRef.current);

        const avgQuality = qualityTrackerRef.current.getAverageQuality();
        const fatigue = fatigueDetectorRef.current.getStatus();

        const sessionData = {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            repsCompleted: state.sets * (exercise.adjustedReps || exercise.defaultReps) + state.reps,
            setsCompleted: state.sets,
            painLevel,
            symmetryScore: symmetryTrackerRef.current.getAverageScore(),
            duration: sessionTimer,
            avgRepSpeed: state.avgRepSpeed,
            reachedFullROM: state.reachedFullROM,
            currentROM: state.currentROM,
            difficulty: sessionConfig?.difficulty || 'medium', // Stored difficulty
            // New metrics
            avgQuality: avgQuality?.score || null,
            qualityLabel: avgQuality?.label || null,
            repScores: qualityTrackerRef.current.getAllScores().map(s => s.overall),
            fatigueLevel: fatigue.level,
            fatigueScore: fatigue.score,
        };

        saveSession(sessionData);
        savePainLevel(painLevel);

        // Evaluate adaptive difficulty
        const adaptResult = evaluateAndAdapt(exercise.id, {
            avgQuality: avgQuality?.score || 50,
            completionRate: sessionData.repsCompleted / ((exercise.adjustedReps || exercise.defaultReps) * (exercise.adjustedSets || exercise.defaultSets)),
            avgFatigue: fatigue.score,
            reachedFullROM: state.reachedFullROM,
        });
        setAdaptiveResult(adaptResult);

        // 📝 AUTO-GENERATE PDF REPORT
        if (patient) {
            generateSessionReport(sessionData, patient, exercise);
        }

    }, [exercise, painLevel, sessionTimer, patient, sessionConfig]);

    if (!exercise) {
        return (
            <div className="card text-center py-12">
                <span className="text-4xl mb-3 block">❌</span>
                <p className="text-surface-400 mb-4">Exercise not found</p>
                <button onClick={() => navigate('/')} className="btn-primary">Back to Exercises</button>
            </div>
        );
    }

    const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <div className="space-y-4">
            {/* Header with Patient Banner */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => { stop(); navigate('/setup'); }} className="btn-secondary !px-3 !py-2">
                        ← Exit
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-surface-100">{exercise.icon} {exercise.name}</h2>
                        {patient && (
                            <p className="text-xs text-primary-400 font-medium">
                                Patient: {patient.name} • {sessionConfig?.difficulty?.toUpperCase()}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Demo mode toggle */}
                    <button
                        onClick={() => setIsDemoMode(prev => !prev)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${isDemoMode
                            ? 'bg-warn-500/20 text-warn-300 border border-warn-500/30'
                            : 'bg-surface-800/60 text-surface-400 border border-surface-700/50 hover:bg-surface-700/60'
                            }`}
                    >
                        🎬 {isDemoMode ? 'Demo ON' : 'Demo'}
                    </button>
                    {/* Adaptive level badge */}
                    {exercise.adaptiveLevel !== undefined && exercise.adaptiveLevel !== 0 && (
                        <span className={`badge ${exercise.adaptiveLevel > 0 ? 'badge-warning' : 'badge-info'}`}>
                            {exercise.adaptiveMessage}
                        </span>
                    )}
                    <div className="text-right hidden sm:block">
                        <p className="text-surface-500 text-xs">Timer</p>
                        <p className="text-xl font-mono font-bold text-surface-200">{formatTime(sessionTimer)}</p>
                    </div>
                </div>
            </div>

            {/* Pain adjustment notice */}
            {painLevel > 0 && exercise.recommendation && (
                <div className={`px-4 py-2 rounded-xl text-sm ${exercise.painCategory === 'severe' ? 'bg-danger-500/10 border border-danger-500/30 text-danger-400' :
                    exercise.painCategory === 'significant' ? 'bg-warn-500/10 border border-warn-500/30 text-warn-400' :
                        'bg-primary-500/10 border border-primary-500/30 text-primary-400'
                    }`}>
                    {exercise.recommendation}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Camera Feed (spans 2 cols on large screens) */}
                <div className="lg:col-span-2 relative">
                    <CameraFeed ref={cameraFeedRef} isRunning={isRunning} />

                    {/* Start/Stop button overlaid on camera if not running */}
                    {!isActive && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-2xl">
                            <button
                                onClick={handleStart}
                                disabled={isLoading}
                                className="btn-primary text-lg px-8 py-4 shadow-2xl"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin">⏳</span> Loading Model...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <span>▶️</span> Start Exercise
                                    </span>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Feedback Overlay */}
                    {isActive && (
                        <FeedbackOverlay
                            exerciseState={exerciseState}
                            safetyStatus={safetyStatus}
                            compensation={compensation}
                            qualityScore={qualityScore}
                            fatigueStatus={fatigueStatus}
                            gestureState={gestureState}
                            smartFeedback={smartFeedback}
                            viewMode={viewMode}
                            onToggleMode={() => setViewMode(v => v === 'coach' ? 'mirror' : 'coach')}
                            isPaused={isPaused}
                        />
                    )}

                    {error && (
                        <div className="absolute top-3 left-3 right-3 bg-danger-500/90 backdrop-blur px-4 py-3 rounded-xl">
                            <p className="text-white text-sm font-medium">{error}</p>
                        </div>
                    )}
                </div>

                {/* Side Panel */}
                <div className="space-y-4">
                    {/* Exercise Info */}
                    <div className="card">
                        <h3 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
                            <span>📋</span> Exercise Details
                        </h3>
                        {/* Modified to show adjusted values based on Difficulty */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-surface-700/30 rounded-xl p-3 text-center">
                                <p className="text-xs text-surface-500">Target Reps</p>
                                <p className="text-2xl font-bold text-primary-400">{exercise.adjustedReps || exercise.defaultReps}</p>
                            </div>
                            <div className="bg-surface-700/30 rounded-xl p-3 text-center">
                                <p className="text-xs text-surface-500">Target Sets</p>
                                <p className="text-2xl font-bold text-primary-400">{exercise.adjustedSets || exercise.defaultSets}</p>
                            </div>
                            <div className="bg-surface-700/30 rounded-xl p-3 text-center">
                                <p className="text-xs text-surface-500">ROM</p>
                                <p className="text-lg font-bold text-accent-400">{exercise.angleRange.min}°–{exercise.angleRange.max}°</p>
                            </div>
                            <div className="bg-surface-700/30 rounded-xl p-3 text-center">
                                <p className="text-xs text-surface-500">Hold</p>
                                <p className="text-lg font-bold text-accent-400">{exercise.holdTime}s</p>
                            </div>
                        </div>
                    </div>

                    {/* Safe Zone Bar */}
                    {isActive && exerciseState && (
                        <SafeZoneBar
                            currentAngle={exerciseState.currentAngle}
                            safetyLimits={exercise.safetyLimits}
                            angleRange={exercise.angleRange}
                        />
                    )}

                    {/* Symmetry Bar */}
                    {isActive && <SymmetryBar symmetryData={symmetryData} />}

                    {/* Speed + Quality Info */}
                    {isActive && exerciseState && (
                        <div className="card">
                            <h3 className="text-sm font-semibold text-surface-300 mb-2 flex items-center gap-2">
                                <span>⚡</span> Performance
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <p className="text-xs text-surface-500">Last Rep</p>
                                    <p className="text-lg font-bold text-surface-200">{exerciseState.lastRepSpeed ? `${exerciseState.lastRepSpeed}s` : '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-surface-500">Current ROM</p>
                                    <p className="text-lg font-bold text-surface-200">{exerciseState.currentROM ? `${Math.round(exerciseState.currentROM)}°` : '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-surface-500">Avg Quality</p>
                                    <p className={`text-lg font-bold ${qualityTrackerRef.current.getAverageQuality()?.score >= 80 ? 'text-accent-400' :
                                        qualityTrackerRef.current.getAverageQuality()?.score >= 60 ? 'text-warn-400' : 'text-surface-200'
                                        }`}>
                                        {qualityTrackerRef.current.getAverageQuality()?.score || '—'}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Alternative Exercise Suggestion */}
                    {alternativeSuggestion && isActive && (
                        <div className="card border-warn-500/30 bg-warn-500/5">
                            <p className="text-sm text-warn-300 mb-2">{alternativeSuggestion.message}</p>
                            <button
                                onClick={() => { stop(); navigate(`/exercise/${alternativeSuggestion.exerciseId}`); }}
                                className="btn-secondary w-full text-sm !py-2"
                            >
                                Switch Exercise →
                            </button>
                        </div>
                    )}

                    {/* Gesture Controls Guide */}
                    {isActive && (
                        <div className="card p-3">
                            <h3 className="text-xs font-semibold text-surface-500 mb-2">🖐 Gesture Controls</h3>
                            <div className="flex gap-3 text-[10px] text-surface-400">
                                <span>✋ Raise hand → Pause</span>
                                <span>👍 Thumbs up → Next Set</span>
                            </div>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="card">
                        <h3 className="text-sm font-semibold text-surface-300 mb-2 flex items-center gap-2">
                            <span>📝</span> Instructions
                        </h3>
                        <ol className="space-y-1.5">
                            {exercise.instructions.map((step, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-surface-400">
                                    <span className="text-primary-400 font-semibold text-xs mt-0.5">{i + 1}.</span>
                                    {step}
                                </li>
                            ))}
                        </ol>
                    </div>

                    {/* Controls */}
                    {isActive && !sessionComplete && (
                        <button onClick={handleStop} className="btn-danger w-full">
                            ⏹ Stop Exercise
                        </button>
                    )}
                </div>
            </div>

            {/* Session Complete Modal */}
            {sessionComplete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/80 backdrop-blur-sm p-4">
                    <div className="card max-w-lg w-full bg-surface-800/95 border-accent-500/30">
                        <div className="text-center mb-6">
                            <span className="text-5xl mb-3 block">🎉</span>
                            <h3 className="text-2xl font-bold glow-text">Session Complete!</h3>
                            <p className="text-surface-400 text-sm mt-1">Downloading clinical report...</p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-surface-700/30 rounded-xl p-3 text-center">
                                <p className="text-xs text-surface-500">Reps</p>
                                <p className="text-2xl font-bold text-primary-400">
                                    {exerciseState ? exerciseState.sets * (exercise.adjustedReps || exercise.defaultReps) + exerciseState.reps : 0}
                                </p>
                            </div>
                            <div className="bg-surface-700/30 rounded-xl p-3 text-center">
                                <p className="text-xs text-surface-500">Duration</p>
                                <p className="text-2xl font-bold text-primary-400">{formatTime(sessionTimer)}</p>
                            </div>
                            <div className="bg-surface-700/30 rounded-xl p-3 text-center">
                                <p className="text-xs text-surface-500">Symmetry</p>
                                <p className="text-2xl font-bold text-accent-400">{symmetryTrackerRef.current.getAverageScore()}%</p>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-center">
                            <p className="text-primary-300 text-sm">📄 Clinical Report Generated</p>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => navigate('/setup')} className="btn-primary w-full py-3">
                                Start New Session
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
