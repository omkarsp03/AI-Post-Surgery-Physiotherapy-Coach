/**
 * Safety engine — hard stop rules, compensation detection.
 */
import { getTrunkLean, landmarkVelocity } from '../utils/angleUtils.js';

/**
 * @typedef {'safe'|'warning'|'danger'|'stop'} SafetyLevel
 */

/**
 * Check if current angle exceeds safety limits.
 * @param {number} angle - Current joint angle
 * @param {object} safetyLimits - { maxAngle, minAngle }
 * @returns {{ level: SafetyLevel, message: string }}
 */
export function checkAngleSafety(angle, safetyLimits) {
    if (angle === null || !safetyLimits) {
        return { level: 'safe', message: '' };
    }

    if (angle >= safetyLimits.maxAngle) {
        return {
            level: 'stop',
            message: `⛔ STOP! Angle ${Math.round(angle)}° exceeds safe maximum (${safetyLimits.maxAngle}°). Reduce range immediately.`,
        };
    }

    if (angle <= safetyLimits.minAngle) {
        return {
            level: 'stop',
            message: `⛔ STOP! Angle ${Math.round(angle)}° below safe minimum (${safetyLimits.minAngle}°). Ease up immediately.`,
        };
    }

    const maxWarningZone = safetyLimits.maxAngle - (safetyLimits.maxAngle - safetyLimits.minAngle) * 0.1;
    const minWarningZone = safetyLimits.minAngle + (safetyLimits.maxAngle - safetyLimits.minAngle) * 0.1;

    if (angle >= maxWarningZone) {
        return {
            level: 'warning',
            message: `⚠️ Approaching maximum safe angle (${Math.round(angle)}°). Be careful.`,
        };
    }

    if (angle <= minWarningZone) {
        return {
            level: 'warning',
            message: `⚠️ Approaching minimum safe angle (${Math.round(angle)}°). Be careful.`,
        };
    }

    return { level: 'safe', message: '' };
}

/**
 * Detect compensation patterns.
 * @param {Array} landmarks - Current pose landmarks
 * @param {Array|null} prevLandmarks - Previous frame landmarks
 * @param {number} dt - Time delta in seconds
 * @returns {{ trunkLean: object|null, momentum: object|null }}
 */
export function detectCompensation(landmarks, prevLandmarks, dt) {
    const result = { trunkLean: null, momentum: null };

    // Trunk lean detection
    const lean = getTrunkLean(landmarks);
    if (lean !== null) {
        if (lean > 20) {
            result.trunkLean = {
                level: 'danger',
                angle: Math.round(lean),
                message: `⚠️ Excessive trunk lean detected (${Math.round(lean)}°). Straighten your body.`,
            };
        } else if (lean > 12) {
            result.trunkLean = {
                level: 'warning',
                angle: Math.round(lean),
                message: `Slight trunk lean (${Math.round(lean)}°). Try to keep upright.`,
            };
        } else {
            result.trunkLean = { level: 'safe', angle: Math.round(lean), message: '' };
        }
    }

    // Momentum detection (check hip velocity for jerky movement)
    if (prevLandmarks && dt > 0) {
        // Check velocity of key joint (hip) for sudden/jerky movement
        const hipVelocity = landmarkVelocity(prevLandmarks[24], landmarks[24], dt);
        if (hipVelocity > 1.5) {
            result.momentum = {
                level: 'warning',
                velocity: hipVelocity.toFixed(2),
                message: '⚠️ Using momentum! Slow down and use controlled movement.',
            };
        } else {
            result.momentum = { level: 'safe', velocity: hipVelocity.toFixed(2), message: '' };
        }
    }

    return result;
}

/**
 * Aggregate all safety checks into a single status.
 * @param {object} angleSafety
 * @param {object} compensation
 * @returns {{ overallLevel: SafetyLevel, messages: string[] }}
 */
export function getOverallSafety(angleSafety, compensation) {
    const messages = [];
    let overallLevel = 'safe';
    const levelOrder = ['safe', 'warning', 'danger', 'stop'];

    const updateLevel = (level) => {
        if (levelOrder.indexOf(level) > levelOrder.indexOf(overallLevel)) {
            overallLevel = level;
        }
    };

    if (angleSafety.message) {
        messages.push(angleSafety.message);
        updateLevel(angleSafety.level);
    }

    if (compensation.trunkLean && compensation.trunkLean.message) {
        messages.push(compensation.trunkLean.message);
        updateLevel(compensation.trunkLean.level);
    }

    if (compensation.momentum && compensation.momentum.message) {
        messages.push(compensation.momentum.message);
        updateLevel(compensation.momentum.level);
    }

    return { overallLevel, messages };
}
