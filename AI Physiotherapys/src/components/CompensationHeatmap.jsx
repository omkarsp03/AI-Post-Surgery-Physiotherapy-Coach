/**
 * CompensationHeatmap — color-codes each joint on the skeleton
 * based on how well the user is performing at that joint.
 * Green = correct, Yellow = slightly off, Red = compensation detected.
 */

import { getJointAngle } from '../utils/angleUtils.js';

/**
 * Calculate heatmap data for all visible joints.
 * @param {Array} landmarks - Current pose landmarks
 * @param {object} exercise - Exercise config
 * @param {object} compensation - Compensation detection results
 * @returns {object[]} Array of { index, x, y, color, level, label }
 */
export function calculateHeatmap(landmarks, exercise, compensation) {
    if (!landmarks || landmarks.length < 33) return [];

    const heatPoints = [];

    // Key joints to evaluate
    const jointGroups = [
        { name: 'L Shoulder', indices: [11], evalIndices: [13, 11, 23] },
        { name: 'R Shoulder', indices: [12], evalIndices: [14, 12, 24] },
        { name: 'L Elbow', indices: [13], evalIndices: [11, 13, 15] },
        { name: 'R Elbow', indices: [14], evalIndices: [12, 14, 16] },
        { name: 'L Hip', indices: [23], evalIndices: [11, 23, 25] },
        { name: 'R Hip', indices: [24], evalIndices: [12, 24, 26] },
        { name: 'L Knee', indices: [25], evalIndices: [23, 25, 27] },
        { name: 'R Knee', indices: [26], evalIndices: [24, 26, 28] },
        { name: 'L Ankle', indices: [27], evalIndices: [25, 27, 31] },
        { name: 'R Ankle', indices: [28], evalIndices: [26, 28, 32] },
    ];

    // Check which joints are target joints for this exercise
    const targetLandmarkSets = (exercise.targetJoints || []).map(j => new Set(j.landmarks));

    for (const group of jointGroups) {
        const lm = landmarks[group.indices[0]];
        if (!lm || (lm.visibility ?? 0) < 0.5) continue;

        let level = 'good';
        let deviation = 0;

        // Check if this joint is part of a target joint set
        const isTarget = targetLandmarkSets.some(set => set.has(group.indices[0]));

        if (isTarget) {
            // For target joints, check angle deviation from target range
            const angle = getJointAngle(landmarks, group.evalIndices);
            if (angle !== null && exercise.angleRange) {
                const targetMid = (exercise.angleRange.min + exercise.angleRange.max) / 2;
                deviation = Math.abs(angle - targetMid);
                if (deviation > 30) level = 'poor';
                else if (deviation > 15) level = 'fair';
            }
        }

        // Check trunk lean for shoulder/hip joints
        if (compensation && compensation.trunkLean) {
            if (['L Shoulder', 'R Shoulder', 'L Hip', 'R Hip'].includes(group.name)) {
                if (compensation.trunkLean.level === 'danger') level = 'poor';
                else if (compensation.trunkLean.level === 'warning' && level === 'good') level = 'fair';
            }
        }

        // Check momentum for all joints
        if (compensation && compensation.momentum && compensation.momentum.level === 'warning') {
            if (level === 'good') level = 'fair';
        }

        const colors = {
            good: { fill: 'rgba(23, 179, 124, 0.7)', stroke: 'rgba(23, 179, 124, 1)' },
            fair: { fill: 'rgba(249, 155, 7, 0.7)', stroke: 'rgba(249, 155, 7, 1)' },
            poor: { fill: 'rgba(248, 59, 59, 0.7)', stroke: 'rgba(248, 59, 59, 1)' },
        };

        heatPoints.push({
            index: group.indices[0],
            name: group.name,
            x: lm.x,
            y: lm.y,
            color: colors[level],
            level,
            deviation: Math.round(deviation),
        });
    }

    return heatPoints;
}

/**
 * Draw heatmap dots on the canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object[]} heatPoints - From calculateHeatmap
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
export function drawHeatmap(ctx, heatPoints, canvasWidth, canvasHeight) {
    if (!ctx || !heatPoints || heatPoints.length === 0) return;

    ctx.save();

    for (const point of heatPoints) {
        const x = point.x * canvasWidth;
        const y = point.y * canvasHeight;
        const radius = point.level === 'poor' ? 10 : point.level === 'fair' ? 8 : 6;

        // Glow effect
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = point.color.fill.replace('0.7', '0.2');
        ctx.fill();

        // Main dot
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = point.color.fill;
        ctx.fill();
        ctx.strokeStyle = point.color.stroke;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    ctx.restore();
}
