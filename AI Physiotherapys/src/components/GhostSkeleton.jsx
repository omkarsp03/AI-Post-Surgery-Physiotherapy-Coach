/**
 * GhostSkeleton — draws a semi-transparent "ideal pose" overlay on the canvas.
 * Compares user's current pose to the target and color-codes alignment.
 */

import { PoseLandmarker } from '@mediapipe/tasks-vision';

/**
 * Draw the ghost skeleton overlay on the canvas.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} userLandmarks - Current user landmarks
 * @param {object} exercise - Exercise config with target angles
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 */
export function drawGhostSkeleton(ctx, userLandmarks, exercise, canvasWidth, canvasHeight) {
    if (!ctx || !userLandmarks || userLandmarks.length < 33) return;

    const connections = PoseLandmarker.POSE_CONNECTIONS;

    // Draw ghost connections (semi-transparent blue)
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    for (const conn of connections) {
        const start = userLandmarks[conn.start];
        const end = userLandmarks[conn.end];
        if (!start || !end) continue;

        ctx.beginPath();
        ctx.moveTo(start.x * canvasWidth, start.y * canvasHeight);
        ctx.lineTo(end.x * canvasWidth, end.y * canvasHeight);
        ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Draw alignment indicators on target joints
    if (exercise.targetJoints) {
        for (const joint of exercise.targetJoints) {
            const [a, b, c] = joint.landmarks;
            const vertex = userLandmarks[b];
            if (!vertex) continue;

            // Calculate current angle at this joint
            const pA = userLandmarks[a];
            const pC = userLandmarks[c];
            if (!pA || !pC) continue;

            const currentAngle = calculateAngle3(pA, vertex, pC);
            const targetMid = (exercise.angleRange.min + exercise.angleRange.max) / 2;
            const diff = Math.abs(currentAngle - targetMid);

            // Color based on alignment
            let color, label;
            if (diff < 10) {
                color = 'rgba(23, 179, 124, 0.9)'; // Green
                label = '✓';
            } else if (diff < 25) {
                color = 'rgba(249, 155, 7, 0.9)'; // Yellow
                label = '~';
            } else {
                color = 'rgba(248, 59, 59, 0.9)'; // Red
                label = '✗';
            }

            const x = vertex.x * canvasWidth;
            const y = vertex.y * canvasHeight;

            // Draw alignment ring
            ctx.beginPath();
            ctx.arc(x, y, 18, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Draw angle text
            ctx.fillStyle = color;
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.round(currentAngle)}°`, x, y - 22);

            // Draw correction arrow if misaligned
            if (diff >= 15) {
                const direction = currentAngle < targetMid ? 1 : -1;
                drawCorrectionArrow(ctx, x, y, direction, color);
            }
        }
    }

    ctx.restore();
}

/**
 * Draw a small correction arrow showing which direction to move.
 */
function drawCorrectionArrow(ctx, x, y, direction, color) {
    const arrowLen = 20;
    const arrowX = x + 25;
    const arrowY = y;
    const endY = arrowY + (direction * arrowLen);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    // Arrow line
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX, endY);
    ctx.stroke();

    // Arrow head
    ctx.beginPath();
    ctx.moveTo(arrowX - 4, endY - direction * 6);
    ctx.lineTo(arrowX, endY);
    ctx.lineTo(arrowX + 4, endY - direction * 6);
    ctx.fill();

    ctx.restore();
}

/**
 * Simple angle calculation for ghost skeleton.
 */
function calculateAngle3(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180) / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
}

export default drawGhostSkeleton;
