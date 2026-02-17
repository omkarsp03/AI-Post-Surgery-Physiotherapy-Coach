/**
 * Fatigue Detection Engine
 * Detects fatigue without sensors using 4 signals:
 * - Speed decay (reps getting slower)
 * - ROM shrinkage (range of motion decreasing)
 * - Asymmetry increase (left/right diverging)
 * - Micro-shaking (pose landmark instability)
 * 
 * All processing in-browser — no data sent externally.
 */

const FATIGUE_LEVELS = {
    none: { label: 'Fresh', color: 'accent', emoji: '💚' },
    mild: { label: 'Mild Fatigue', color: 'warn', emoji: '🟡' },
    moderate: { label: 'Moderate Fatigue', color: 'warn', emoji: '🟠' },
    severe: { label: 'High Fatigue', color: 'danger', emoji: '🔴' },
};

export class FatigueDetector {
    constructor() {
        this.reset();
    }

    reset() {
        this.repSpeeds = [];           // Duration of each rep in seconds
        this.repROMs = [];             // ROM achieved per rep
        this.symmetryScores = [];      // Symmetry per rep
        this.landmarkJitter = [];      // Instability readings
        this.fatigueLevel = 'none';
        this.fatigueScore = 0;         // 0-100 (0 = fresh, 100 = exhausted)
        this.restRecommended = false;
        this.lastAlert = null;
    }

    /**
     * Record data for a completed rep.
     */
    addRepData({ speed, rom, symmetryScore }) {
        if (speed !== null && speed !== undefined) this.repSpeeds.push(speed);
        if (rom !== null && rom !== undefined) this.repROMs.push(rom);
        if (symmetryScore !== null && symmetryScore !== undefined) this.symmetryScores.push(symmetryScore);
        this._evaluate();
    }

    /**
     * Record landmark jitter from current frame.
     * Call every frame during exercise.
     * @param {Array} landmarks - Current pose landmarks
     * @param {Array|null} prevLandmarks - Previous frame landmarks
     */
    addJitterSample(landmarks, prevLandmarks) {
        if (!landmarks || !prevLandmarks || landmarks.length < 33 || prevLandmarks.length < 33) return;

        // Measure micro-shaking: average displacement of key joints
        const keyJoints = [11, 12, 23, 24, 25, 26, 27, 28]; // shoulders, hips, knees, ankles
        let totalDisp = 0;
        let count = 0;

        for (const idx of keyJoints) {
            const curr = landmarks[idx];
            const prev = prevLandmarks[idx];
            if (curr && prev) {
                const dx = curr.x - prev.x;
                const dy = curr.y - prev.y;
                totalDisp += Math.sqrt(dx * dx + dy * dy);
                count++;
            }
        }

        if (count > 0) {
            this.landmarkJitter.push(totalDisp / count);
        }
    }

    /**
     * Evaluate fatigue level based on accumulated data.
     */
    _evaluate() {
        let fatigueSignals = 0;
        let totalWeight = 0;

        // Signal 1: Speed decay (reps getting slower)
        if (this.repSpeeds.length >= 3) {
            const initial = this.repSpeeds.slice(0, Math.ceil(this.repSpeeds.length / 3));
            const recent = this.repSpeeds.slice(-Math.ceil(this.repSpeeds.length / 3));
            const avgInitial = initial.reduce((s, v) => s + v, 0) / initial.length;
            const avgRecent = recent.reduce((s, v) => s + v, 0) / recent.length;

            if (avgInitial > 0) {
                const speedDecay = (avgRecent - avgInitial) / avgInitial;
                // Positive = slowing down
                if (speedDecay > 0.3) fatigueSignals += 30;
                else if (speedDecay > 0.15) fatigueSignals += 15;
                totalWeight += 30;
            }
        }

        // Signal 2: ROM shrinkage
        if (this.repROMs.length >= 3) {
            const initial = this.repROMs.slice(0, Math.ceil(this.repROMs.length / 3));
            const recent = this.repROMs.slice(-Math.ceil(this.repROMs.length / 3));
            const avgInitial = initial.reduce((s, v) => s + v, 0) / initial.length;
            const avgRecent = recent.reduce((s, v) => s + v, 0) / recent.length;

            if (avgInitial > 0) {
                const romDecay = (avgInitial - avgRecent) / avgInitial;
                // Positive = ROM shrinking
                if (romDecay > 0.2) fatigueSignals += 30;
                else if (romDecay > 0.1) fatigueSignals += 15;
                totalWeight += 30;
            }
        }

        // Signal 3: Asymmetry increase
        if (this.symmetryScores.length >= 3) {
            const initial = this.symmetryScores.slice(0, Math.ceil(this.symmetryScores.length / 3));
            const recent = this.symmetryScores.slice(-Math.ceil(this.symmetryScores.length / 3));
            const avgInitial = initial.reduce((s, v) => s + v, 0) / initial.length;
            const avgRecent = recent.reduce((s, v) => s + v, 0) / recent.length;

            const asymDrop = avgInitial - avgRecent;
            if (asymDrop > 15) fatigueSignals += 20;
            else if (asymDrop > 8) fatigueSignals += 10;
            totalWeight += 20;
        }

        // Signal 4: Micro-shaking (jitter increase)
        if (this.landmarkJitter.length >= 30) {
            const windowSize = Math.min(30, Math.floor(this.landmarkJitter.length / 3));
            const initial = this.landmarkJitter.slice(0, windowSize);
            const recent = this.landmarkJitter.slice(-windowSize);
            const avgInitial = initial.reduce((s, v) => s + v, 0) / initial.length;
            const avgRecent = recent.reduce((s, v) => s + v, 0) / recent.length;

            if (avgInitial > 0) {
                const jitterIncrease = (avgRecent - avgInitial) / avgInitial;
                if (jitterIncrease > 0.5) fatigueSignals += 20;
                else if (jitterIncrease > 0.25) fatigueSignals += 10;
                totalWeight += 20;
            }
        }

        // Calculate fatigue score
        this.fatigueScore = totalWeight > 0
            ? Math.round((fatigueSignals / totalWeight) * 100)
            : 0;

        // Determine fatigue level
        if (this.fatigueScore >= 70) {
            this.fatigueLevel = 'severe';
            this.restRecommended = true;
        } else if (this.fatigueScore >= 45) {
            this.fatigueLevel = 'moderate';
            this.restRecommended = true;
        } else if (this.fatigueScore >= 25) {
            this.fatigueLevel = 'mild';
            this.restRecommended = false;
        } else {
            this.fatigueLevel = 'none';
            this.restRecommended = false;
        }
    }

    /**
     * Get current fatigue status.
     */
    getStatus() {
        const info = FATIGUE_LEVELS[this.fatigueLevel];
        let message = '';

        if (this.fatigueLevel === 'severe') {
            message = '⚠️ Fatigue detected — take a 30 second rest.';
        } else if (this.fatigueLevel === 'moderate') {
            message = '⚠️ Signs of fatigue — consider a short break.';
        } else if (this.fatigueLevel === 'mild') {
            message = 'Slight fatigue — pace yourself.';
        }

        return {
            level: this.fatigueLevel,
            score: this.fatigueScore,
            label: info.label,
            color: info.color,
            emoji: info.emoji,
            message,
            restRecommended: this.restRecommended,
            signals: {
                repsAnalyzed: this.repSpeeds.length,
                jitterSamples: this.landmarkJitter.length,
            },
        };
    }
}
