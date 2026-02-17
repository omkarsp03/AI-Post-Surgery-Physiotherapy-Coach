/**
 * Movement Quality Score Engine
 * Scores each rep on 4 dimensions: ROM, Smoothness, Control, Symmetry.
 * All processing in-browser — no data sent externally.
 */

/**
 * Quality label from score.
 */
function getQualityLabel(score) {
    if (score >= 90) return { label: 'Excellent', emoji: '🌟' };
    if (score >= 75) return { label: 'Good', emoji: '👍' };
    if (score >= 60) return { label: 'Fair', emoji: '👌' };
    return { label: 'Needs Work', emoji: '💪' };
}

export class MovementQualityTracker {
    constructor() {
        this.reset();
    }

    reset() {
        // Per-rep tracking
        this.angleReadings = [];       // Angle samples during current rep
        this.timestamps = [];          // Timestamps for each sample
        this.repScores = [];           // Final score per rep
        this.currentRepStart = null;
    }

    /**
     * Record angle sample during a rep.
     * Call this every frame while exercise is active.
     */
    addSample(angle, timestamp) {
        if (angle === null || angle === undefined) return;
        this.angleReadings.push(angle);
        this.timestamps.push(timestamp);
        if (this.currentRepStart === null) this.currentRepStart = timestamp;
    }

    /**
     * Call when a rep is completed to score it.
     * @param {object} params
     * @param {number} params.targetROMMin - Target min angle
     * @param {number} params.targetROMMax - Target max angle
     * @param {number} params.symmetryScore - Current symmetry (0-100)
     * @returns {object} Rep quality score breakdown
     */
    scoreRep({ targetROMMin, targetROMMax, symmetryScore = 100 }) {
        if (this.angleReadings.length < 4) {
            this.angleReadings = [];
            this.timestamps = [];
            this.currentRepStart = null;
            return null;
        }

        const romScore = this._calculateROMScore(targetROMMin, targetROMMax);
        const smoothnessScore = this._calculateSmoothnessScore();
        const controlScore = this._calculateControlScore();
        const symScore = Math.min(100, Math.max(0, symmetryScore));

        const overall = Math.round((romScore + smoothnessScore + controlScore + symScore) / 4);
        const { label, emoji } = getQualityLabel(overall);

        const result = {
            overall,
            rom: romScore,
            smoothness: smoothnessScore,
            control: controlScore,
            symmetry: symScore,
            label,
            emoji,
            repNumber: this.repScores.length + 1,
            message: `Rep #${this.repScores.length + 1} → ${overall}% Quality (${label})`,
        };

        this.repScores.push(result);

        // Reset per-rep data
        this.angleReadings = [];
        this.timestamps = [];
        this.currentRepStart = null;

        return result;
    }

    /**
     * ROM Score: How close actual ROM comes to target ROM.
     */
    _calculateROMScore(targetMin, targetMax) {
        if (this.angleReadings.length === 0) return 0;
        const actualMin = Math.min(...this.angleReadings);
        const actualMax = Math.max(...this.angleReadings);
        const actualROM = actualMax - actualMin;
        const targetROM = targetMax - targetMin;
        if (targetROM <= 0) return 100;
        const ratio = Math.min(1, actualROM / targetROM);
        return Math.round(ratio * 100);
    }

    /**
     * Smoothness Score: Low variance in angle deltas = smoother movement.
     */
    _calculateSmoothnessScore() {
        if (this.angleReadings.length < 3) return 100;
        const deltas = [];
        for (let i = 1; i < this.angleReadings.length; i++) {
            deltas.push(Math.abs(this.angleReadings[i] - this.angleReadings[i - 1]));
        }
        const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
        const variance = deltas.reduce((s, d) => s + (d - mean) ** 2, 0) / deltas.length;
        // Low variance = smooth. Scale: variance > 25 → 0, variance 0 → 100
        const score = Math.max(0, Math.min(100, Math.round(100 - variance * 4)));
        return score;
    }

    /**
     * Control Score: Detects jerky acceleration (delta of deltas).
     */
    _calculateControlScore() {
        if (this.angleReadings.length < 4) return 100;
        const deltas = [];
        for (let i = 1; i < this.angleReadings.length; i++) {
            deltas.push(this.angleReadings[i] - this.angleReadings[i - 1]);
        }
        const accel = [];
        for (let i = 1; i < deltas.length; i++) {
            accel.push(Math.abs(deltas[i] - deltas[i - 1]));
        }
        const avgAccel = accel.reduce((s, a) => s + a, 0) / accel.length;
        // Low acceleration change = good control. Scale: avgAccel > 10 → 0
        const score = Math.max(0, Math.min(100, Math.round(100 - avgAccel * 10)));
        return score;
    }

    /**
     * Get average quality across all scored reps.
     */
    getAverageQuality() {
        if (this.repScores.length === 0) return null;
        const avg = Math.round(
            this.repScores.reduce((s, r) => s + r.overall, 0) / this.repScores.length
        );
        return { score: avg, ...getQualityLabel(avg), repsScored: this.repScores.length };
    }

    /**
     * Get the most recent rep score.
     */
    getLastRepScore() {
        return this.repScores.length > 0 ? this.repScores[this.repScores.length - 1] : null;
    }

    /**
     * Get all rep scores for session summary.
     */
    getAllScores() {
        return [...this.repScores];
    }
}
