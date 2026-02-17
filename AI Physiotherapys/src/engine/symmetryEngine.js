/**
 * Symmetry engine — compares left vs right joint performance.
 */
import { getJointAngle } from '../utils/angleUtils.js';

/**
 * Calculate symmetry score between left and right side.
 * @param {Array} landmarks - Pose landmarks
 * @param {object} exercise - Exercise config with targetJoints
 * @returns {{ score: number, leftAngle: number|null, rightAngle: number|null, message: string, level: string }}
 */
export function calculateSymmetry(landmarks, exercise) {
    if (!landmarks || !exercise.targetJoints || exercise.targetJoints.length < 2) {
        return { score: 100, leftAngle: null, rightAngle: null, message: '', level: 'neutral' };
    }

    const leftJoint = exercise.targetJoints.find(j => j.side === 'left');
    const rightJoint = exercise.targetJoints.find(j => j.side === 'right');

    if (!leftJoint || !rightJoint) {
        return { score: 100, leftAngle: null, rightAngle: null, message: '', level: 'neutral' };
    }

    const leftAngle = getJointAngle(landmarks, leftJoint.landmarks);
    const rightAngle = getJointAngle(landmarks, rightJoint.landmarks);

    if (leftAngle === null || rightAngle === null) {
        return { score: 100, leftAngle, rightAngle, message: 'Both sides not fully visible', level: 'neutral' };
    }

    const maxAngle = Math.max(leftAngle, rightAngle);
    const diff = Math.abs(leftAngle - rightAngle);
    const score = maxAngle > 0 ? Math.max(0, Math.round((1 - diff / maxAngle) * 100)) : 100;

    let message = '';
    let level = 'good';

    if (score < 70) {
        const side = leftAngle < rightAngle ? 'left' : 'right';
        message = `Significant asymmetry — ${side} side has less range`;
        level = 'poor';
    } else if (score < 85) {
        const side = leftAngle < rightAngle ? 'left' : 'right';
        message = `Slight asymmetry — ${side} side has less range`;
        level = 'fair';
    } else {
        message = 'Good bilateral symmetry';
        level = 'good';
    }

    return {
        score,
        leftAngle: leftAngle !== null ? Math.round(leftAngle) : null,
        rightAngle: rightAngle !== null ? Math.round(rightAngle) : null,
        message,
        level,
    };
}

/**
 * Track symmetry over time within a session.
 */
export class SymmetryTracker {
    constructor() {
        this.readings = [];
    }

    addReading(symmetryResult) {
        if (symmetryResult.score !== null && symmetryResult.level !== 'neutral') {
            this.readings.push({
                score: symmetryResult.score,
                timestamp: Date.now(),
            });
        }
    }

    getAverageScore() {
        if (this.readings.length === 0) return 100;
        return Math.round(
            this.readings.reduce((sum, r) => sum + r.score, 0) / this.readings.length
        );
    }

    reset() {
        this.readings = [];
    }
}
