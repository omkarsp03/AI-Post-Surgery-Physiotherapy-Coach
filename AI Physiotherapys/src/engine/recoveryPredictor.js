/**
 * Recovery Prediction Engine
 * Estimates recovery milestones using linear regression on ROM trends.
 * 
 * All processing in-browser — no data sent externally.
 */

/**
 * Calculate linear regression: y = slope * x + intercept.
 * @param {number[]} xValues
 * @param {number[]} yValues
 * @returns {{ slope: number, intercept: number, r2: number }}
 */
function linearRegression(xValues, yValues) {
    const n = xValues.length;
    if (n < 2) return { slope: 0, intercept: yValues[0] || 0, r2: 0 };

    const sumX = xValues.reduce((s, v) => s + v, 0);
    const sumY = yValues.reduce((s, v) => s + v, 0);
    const sumXY = xValues.reduce((s, v, i) => s + v * yValues[i], 0);
    const sumX2 = xValues.reduce((s, v) => s + v * v, 0);
    const sumY2 = yValues.reduce((s, v) => s + v * v, 0);

    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // R-squared
    const yMean = sumY / n;
    const ssRes = yValues.reduce((s, y, i) => s + (y - (slope * xValues[i] + intercept)) ** 2, 0);
    const ssTot = yValues.reduce((s, y) => s + (y - yMean) ** 2, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, r2 };
}

/**
 * Predict recovery milestones from session history.
 * @param {object[]} sessions - Array of session objects from storage
 * @param {string} exerciseId - Optional filter by exercise
 * @returns {object} Recovery prediction data
 */
export function predictRecovery(sessions, exerciseId = null) {
    // Filter sessions
    let filtered = sessions.filter(s => s.currentROM !== undefined && s.currentROM > 0);
    if (exerciseId) {
        filtered = filtered.filter(s => s.exerciseId === exerciseId);
    }

    if (filtered.length < 3) {
        return {
            hasEnoughData: false,
            message: 'Need at least 3 sessions with ROM data to predict recovery.',
            trend: null,
            milestones: [],
        };
    }

    // Sort by timestamp
    filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Convert to day offsets from first session
    const firstDate = new Date(filtered[0].timestamp);
    const xValues = filtered.map(s => {
        const diff = new Date(s.timestamp) - firstDate;
        return diff / (1000 * 60 * 60 * 24); // days
    });
    const yValues = filtered.map(s => s.currentROM);

    // Run linear regression
    const { slope, intercept, r2 } = linearRegression(xValues, yValues);

    // Current ROM (latest session)
    const currentROM = yValues[yValues.length - 1];
    const currentDay = xValues[xValues.length - 1];

    // Generate milestones
    const targetAngles = [60, 90, 120, 150, 170];
    const milestones = [];

    if (slope > 0) {
        for (const target of targetAngles) {
            if (target > currentROM) {
                const daysNeeded = (target - intercept) / slope - currentDay;
                if (daysNeeded > 0 && daysNeeded < 365) {
                    milestones.push({
                        angle: target,
                        estimatedDays: Math.round(daysNeeded),
                        estimatedRange: `${Math.max(1, Math.round(daysNeeded * 0.7))}–${Math.round(daysNeeded * 1.3)} days`,
                        label: `${target}° bend`,
                    });
                }
            }
        }
    }

    // Trend description
    let trend;
    if (slope > 1) trend = 'Rapid improvement';
    else if (slope > 0.3) trend = 'Steady progress';
    else if (slope > 0) trend = 'Gradual improvement';
    else if (slope === 0) trend = 'Plateauing';
    else trend = 'Slight regression — consult your therapist';

    // Trend data for chart
    const trendData = filtered.map(s => ({
        date: new Date(s.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        rom: Math.round(s.currentROM),
        quality: s.avgQuality || null,
        timestamp: s.timestamp,
    }));

    // Main message
    let message = '';
    if (milestones.length > 0) {
        const next = milestones[0];
        message = `Based on last ${filtered.length} sessions: Estimated ${next.label} in ${next.estimatedRange}`;
    } else if (slope > 0) {
        message = `ROM is improving at ${slope.toFixed(1)}° per day. Keep up the great work!`;
    } else {
        message = 'ROM trend is flat. Consider adjusting your exercise routine.';
    }

    return {
        hasEnoughData: true,
        currentROM: Math.round(currentROM),
        trend,
        trendDirection: slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat',
        slopePerDay: Number(slope.toFixed(2)),
        r2: Number(r2.toFixed(2)),
        confidence: r2 > 0.7 ? 'high' : r2 > 0.4 ? 'moderate' : 'low',
        milestones,
        trendData,
        message,
        sessionsAnalyzed: filtered.length,
    };
}
