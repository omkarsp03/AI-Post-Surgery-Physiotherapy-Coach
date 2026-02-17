/**
 * Exercise engine — rep counting, speed analysis, and real-time feedback.
 * Implements a state-machine-based rep counter.
 */

/**
 * @typedef {'idle'|'extending'|'flexing'|'hold'} RepPhase
 */

export class RepCounter {
    constructor(exercise) {
        this.exercise = exercise;
        this.reps = 0;
        this.sets = 0;
        this.phase = 'idle'; // idle → flexing → extending → idle (1 rep)
        this.lastAngle = null;
        this.phaseStartTime = null;
        this.repTimestamps = [];
        this.peakAngle = 0;
        this.troughAngle = 180;
        this.feedback = '';
        this.feedbackType = 'info'; // 'info' | 'success' | 'warning' | 'danger'
        this.speedHistory = [];
        this.currentROM = 0;
        this.reachedFullROM = false;
    }

    /**
     * Update with a new angle reading.
     * @param {number} angle - Current joint angle in degrees
     * @param {number} timestamp - Current time in ms
     * @returns {{ reps: number, feedback: string, feedbackType: string, phase: string }}
     */
    update(angle, timestamp) {
        if (angle === null || angle === undefined) {
            this.feedback = 'Position not visible — adjust your camera';
            this.feedbackType = 'warning';
            return this.getState();
        }

        const { min, max } = this.exercise.angleRange;
        const midpoint = (min + max) / 2;
        const threshold = (max - min) * 0.10; // Reduced to 10% hysteresis for better sensitivity

        this.currentROM = Math.abs(this.peakAngle - this.troughAngle);

        switch (this.phase) {
            case 'idle':
                if (angle <= min + threshold) {
                    this.phase = 'flexing';
                    this.phaseStartTime = timestamp;
                    this.troughAngle = angle;
                    this.feedback = 'Good — now extend slowly';
                    this.feedbackType = 'info';
                } else if (angle >= max - threshold) {
                    this.phase = 'extending';
                    this.phaseStartTime = timestamp;
                    this.peakAngle = angle;
                    this.feedback = 'Good — now flex slowly';
                    this.feedbackType = 'info';
                } else {
                    this.feedback = 'Move to the starting position';
                    this.feedbackType = 'info';
                }
                break;

            case 'flexing':
                this.troughAngle = Math.min(this.troughAngle, angle);
                if (angle >= max - threshold) {
                    // completed the extending phase → 1 rep
                    this.peakAngle = angle;
                    this._completeRep(timestamp);
                    this.phase = 'extending';
                    this.phaseStartTime = timestamp;
                } else if (angle > midpoint) {
                    this.feedback = 'Keep going — extend fully';
                    this.feedbackType = 'info';
                }
                break;

            case 'extending':
                this.peakAngle = Math.max(this.peakAngle, angle);
                if (angle <= min + threshold) {
                    // completed the flexing phase → 1 rep
                    this.troughAngle = angle;
                    this._completeRep(timestamp);
                    this.phase = 'flexing';
                    this.phaseStartTime = timestamp;
                } else if (angle < midpoint) {
                    this.feedback = 'Keep going — flex fully';
                    this.feedbackType = 'info';
                }
                break;

            default:
                this.phase = 'idle';
        }

        // Check if reached full ROM
        const targetROM = max - min;
        if (this.currentROM >= targetROM * 0.9) {
            this.reachedFullROM = true;
        }

        this.lastAngle = angle;
        return this.getState();
    }

    _completeRep(timestamp) {
        // Debounce: prevent double counting if reps are too close (< 800ms)
        if (this.repTimestamps.length > 0) {
            const lastTimestamp = this.repTimestamps[this.repTimestamps.length - 1];
            if (timestamp - lastTimestamp < 800) return;
        }

        this.reps++;
        this.repTimestamps.push(timestamp);
        this.feedback = `Rep ${this.reps} complete! Great work!`;
        this.feedbackType = 'success';

        // Speed analysis
        if (this.repTimestamps.length >= 2) {
            const last = this.repTimestamps.length;
            const repDuration = (this.repTimestamps[last - 1] - this.repTimestamps[last - 2]) / 1000;
            this.speedHistory.push(repDuration);

            if (repDuration < 1.5) {
                this.feedback = `Rep ${this.reps} — Too fast! Slow down for better control`;
                this.feedbackType = 'warning';
            } else if (repDuration > 8) {
                this.feedback = `Rep ${this.reps} — You can move a bit faster`;
                this.feedbackType = 'info';
            } else {
                this.feedback = `Rep ${this.reps} — Perfect pace!`;
                this.feedbackType = 'success';
            }
        }

        // Check set completion
        if (this.reps >= (this.exercise.adjustedReps || this.exercise.defaultReps)) {
            this.sets++;
            this.reps = 0;
            this.repTimestamps = [];
            this.feedback = `Set ${this.sets} complete! Rest for a moment.`;
            this.feedbackType = 'success';
        }
    }

    getState() {
        return {
            reps: this.reps,
            sets: this.sets,
            phase: this.phase,
            feedback: this.feedback,
            feedbackType: this.feedbackType,
            currentAngle: this.lastAngle,
            currentROM: this.currentROM,
            reachedFullROM: this.reachedFullROM,
            avgRepSpeed: this.speedHistory.length > 0
                ? (this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length).toFixed(1)
                : null,
            lastRepSpeed: this.speedHistory.length > 0
                ? this.speedHistory[this.speedHistory.length - 1].toFixed(1)
                : null,
        };
    }

    reset() {
        this.reps = 0;
        this.sets = 0;
        this.phase = 'idle';
        this.lastAngle = null;
        this.phaseStartTime = null;
        this.repTimestamps = [];
        this.peakAngle = 0;
        this.troughAngle = 180;
        this.feedback = '';
        this.feedbackType = 'info';
        this.speedHistory = [];
        this.currentROM = 0;
        this.reachedFullROM = false;
    }
}
