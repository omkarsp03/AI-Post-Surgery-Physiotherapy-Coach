/**
 * Adaptive Difficulty Engine
 * Automatically adjusts exercise difficulty based on user performance.
 * Persists difficulty level per exercise in localStorage.
 * 
 * All processing in-browser — no data sent externally.
 */

const STORAGE_KEY = 'physio_adaptive_levels';

/**
 * Read adaptive levels from localStorage.
 */
function readLevels() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

/**
 * Write adaptive levels to localStorage.
 */
function writeLevels(levels) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
    } catch (e) {
        console.warn('Adaptive levels save failed:', e);
    }
}

/**
 * Get current adaptive level for an exercise.
 * @param {string} exerciseId
 * @returns {object} Adaptive parameters
 */
export function getAdaptiveLevel(exerciseId) {
    const levels = readLevels();
    return levels[exerciseId] || {
        level: 0,             // 0 = baseline, positive = harder, negative = easier
        romBonus: 0,          // Extra ROM degrees required
        holdBonus: 0,         // Extra hold time in seconds
        speedRequirement: 0,  // 0 = none, 1 = slow required
        repBonus: 0,          // Extra reps
        lastUpdated: null,
        sessionsAtLevel: 0,
    };
}

/**
 * Evaluate session performance and adjust difficulty.
 * @param {string} exerciseId
 * @param {object} sessionStats
 * @param {number} sessionStats.avgQuality - Average quality score (0-100)
 * @param {number} sessionStats.completionRate - Reps done / target reps (0-1)
 * @param {number} sessionStats.avgFatigue - Average fatigue score (0-100)
 * @param {boolean} sessionStats.reachedFullROM - Whether full ROM was achieved
 * @returns {object} Updated adaptive parameters + coaching message
 */
export function evaluateAndAdapt(exerciseId, sessionStats) {
    const current = getAdaptiveLevel(exerciseId);
    const { avgQuality = 0, completionRate = 0, avgFatigue = 0, reachedFullROM = false } = sessionStats;

    let message = '';
    let direction = 'maintain'; // 'increase' | 'decrease' | 'maintain'

    // Determine if user is improving or struggling
    const isExcelling = avgQuality >= 85 && completionRate >= 0.9 && avgFatigue < 30;
    const isDoingWell = avgQuality >= 70 && completionRate >= 0.7 && avgFatigue < 50;
    const isStruggling = avgQuality < 55 || completionRate < 0.5 || avgFatigue > 65;

    if (isExcelling && current.sessionsAtLevel >= 2) {
        // User is excelling — increase difficulty
        direction = 'increase';
        current.level++;
        current.sessionsAtLevel = 0;

        // Choose what to increase based on current level
        if (current.level % 3 === 1) {
            current.romBonus += 5;
            message = `🎯 Great improvement! Increasing ROM target by 5°.`;
        } else if (current.level % 3 === 2) {
            current.holdBonus += 1;
            message = `🎯 Excellent control! Hold for ${current.holdBonus + 2}s at peak next time.`;
        } else {
            current.repBonus += 2;
            current.speedRequirement = 1;
            message = `🎯 Outstanding progress! Adding 2 extra reps with slow movement.`;
        }
    } else if (isStruggling) {
        // User is struggling — decrease difficulty
        direction = 'decrease';
        current.level = Math.max(-3, current.level - 1);
        current.sessionsAtLevel = 0;

        if (current.repBonus > 0) {
            current.repBonus = Math.max(0, current.repBonus - 2);
            message = '💡 Reducing reps — focus on quality over quantity.';
        } else if (current.holdBonus > 0) {
            current.holdBonus = Math.max(0, current.holdBonus - 1);
            message = '💡 Reducing hold time — take it easy.';
        } else if (current.romBonus > 0) {
            current.romBonus = Math.max(0, current.romBonus - 5);
            message = '💡 Reducing ROM target — work within your comfort range.';
        } else {
            current.speedRequirement = 0;
            message = '💡 Move at whatever pace feels comfortable.';
        }
    } else {
        // Maintaining current level
        current.sessionsAtLevel++;
        if (isDoingWell) {
            message = '👍 Good session! Keep it up — you\'re building strength.';
        } else {
            message = '✅ Session complete. Consistency is key to recovery.';
        }
    }

    current.lastUpdated = new Date().toISOString();

    // Save to localStorage
    const levels = readLevels();
    levels[exerciseId] = current;
    writeLevels(levels);

    return {
        ...current,
        direction,
        message,
    };
}

/**
 * Apply adaptive modifications to exercise parameters.
 * @param {object} exercise - Base exercise config
 * @param {string} exerciseId
 * @returns {object} Modified exercise with adaptive adjustments
 */
export function applyAdaptive(exercise, exerciseId) {
    const adaptive = getAdaptiveLevel(exerciseId);
    const modified = { ...exercise };

    // Apply ROM bonus
    if (adaptive.romBonus !== 0 && modified.angleRange) {
        modified.angleRange = {
            ...modified.angleRange,
            max: modified.angleRange.max + adaptive.romBonus,
        };
    }

    // Apply hold bonus
    if (adaptive.holdBonus > 0) {
        modified.holdTime = (modified.holdTime || 0) + adaptive.holdBonus;
    }

    // Apply rep bonus
    if (adaptive.repBonus !== 0) {
        const baseReps = modified.adjustedReps || modified.defaultReps;
        modified.adjustedReps = Math.max(2, baseReps + adaptive.repBonus);
    }

    // Store adaptive metadata for UI
    modified.adaptiveLevel = adaptive.level;
    modified.adaptiveMessage = adaptive.level > 0
        ? `Level ${adaptive.level} — Difficulty increased`
        : adaptive.level < 0
            ? `Adjusted — Reduced difficulty`
            : 'Baseline difficulty';
    modified.speedRequirement = adaptive.speedRequirement;

    return modified;
}

/**
 * Reset adaptive level for an exercise.
 */
export function resetAdaptive(exerciseId) {
    const levels = readLevels();
    delete levels[exerciseId];
    writeLevels(levels);
}
