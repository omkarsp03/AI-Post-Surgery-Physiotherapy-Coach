/**
 * Pain-aware rep adjustment.
 * Adjusts exercise parameters based on reported pain level (0–10).
 */

/**
 * Adjust exercise parameters based on pain level.
 * @param {number} painLevel - Pain level (0–10)
 * @param {object} exercise - Exercise config
 * @returns {object} Adjusted exercise with modified reps, ROM, and recommendations
 */
export function adjustForPain(painLevel, exercise) {
    const adjusted = { ...exercise };
    const level = Math.min(10, Math.max(0, Math.round(painLevel)));

    if (level === 0) {
        // No pain — use defaults
        adjusted.adjustedReps = exercise.defaultReps;
        adjusted.adjustedSets = exercise.defaultSets;
        adjusted.romMultiplier = 1.0;
        adjusted.speedRecommendation = 'Normal pace';
        adjusted.painCategory = 'none';
        adjusted.recommendation = 'No pain reported — proceed with full exercise';
    } else if (level <= 3) {
        // Mild pain — slight reduction
        adjusted.adjustedReps = Math.max(3, Math.round(exercise.defaultReps * 0.8));
        adjusted.adjustedSets = exercise.defaultSets;
        adjusted.romMultiplier = 0.9;
        adjusted.speedRecommendation = 'Slightly slower pace';
        adjusted.painCategory = 'mild';
        adjusted.recommendation = 'Mild discomfort — slightly reduced intensity';
    } else if (level <= 5) {
        // Moderate pain — noticeable reduction
        adjusted.adjustedReps = Math.max(3, Math.round(exercise.defaultReps * 0.6));
        adjusted.adjustedSets = Math.max(1, exercise.defaultSets - 1);
        adjusted.romMultiplier = 0.75;
        adjusted.speedRecommendation = 'Slow, controlled pace';
        adjusted.painCategory = 'moderate';
        adjusted.recommendation = 'Moderate pain — reduced reps and range. Listen to your body.';
    } else if (level <= 7) {
        // Significant pain — major reduction
        adjusted.adjustedReps = Math.max(2, Math.round(exercise.defaultReps * 0.4));
        adjusted.adjustedSets = 1;
        adjusted.romMultiplier = 0.5;
        adjusted.speedRecommendation = 'Very slow pace';
        adjusted.painCategory = 'significant';
        adjusted.recommendation = '⚠️ Significant pain — greatly reduced exercise. Consider resting.';
    } else {
        // Severe pain (8–10) — halt most exercises
        adjusted.adjustedReps = 0;
        adjusted.adjustedSets = 0;
        adjusted.romMultiplier = 0;
        adjusted.speedRecommendation = 'Stop exercising';
        adjusted.painCategory = 'severe';
        adjusted.recommendation = '⛔ Severe pain — please stop and consult your physiotherapist.';
        adjusted.shouldStop = true;
    }

    // Adjust angle range based on ROM multiplier
    if (adjusted.romMultiplier < 1.0) {
        const range = exercise.angleRange.max - exercise.angleRange.min;
        const reducedRange = range * adjusted.romMultiplier;
        const mid = (exercise.angleRange.min + exercise.angleRange.max) / 2;
        adjusted.angleRange = {
            min: Math.round(mid - reducedRange / 2),
            max: Math.round(mid + reducedRange / 2),
        };
    }

    return adjusted;
}

/**
 * Filter exercises based on pain level — high pain removes harder exercises.
 * @param {object[]} exercises
 * @param {number} painLevel
 * @returns {object[]}
 */
export function filterExercisesByPain(exercises, painLevel) {
    if (painLevel >= 8) {
        return exercises.filter(e => e.difficulty === 'easy');
    }
    if (painLevel >= 5) {
        return exercises.filter(e => e.difficulty !== 'hard');
    }
    return exercises;
}
