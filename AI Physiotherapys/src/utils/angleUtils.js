/**
 * Angle calculation utilities for pose landmarks.
 * All processing happens in-browser — no data is sent externally.
 */

/**
 * Calculate the angle (in degrees) formed by three 2D points.
 * @param {{ x: number, y: number }} a - First point
 * @param {{ x: number, y: number }} b - Vertex point
 * @param {{ x: number, y: number }} c - Third point
 * @returns {number} Angle in degrees (0–180)
 */
export function calculateAngle(a, b, c) {
    const radians =
        Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180) / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
}

/**
 * Get the angle at a joint given pose landmarks and a triplet of landmark indices.
 * @param {Array} landmarks - MediaPipe pose landmarks
 * @param {number[]} triplet - [pointA, vertex, pointC] landmark indices
 * @returns {number|null} Angle in degrees, or null if landmarks not visible
 */
export function getJointAngle(landmarks, triplet) {
    if (!landmarks || landmarks.length === 0) return null;
    const [iA, iB, iC] = triplet;
    const a = landmarks[iA];
    const b = landmarks[iB];
    const c = landmarks[iC];
    if (!a || !b || !c) return null;
    if (!isLandmarkVisible(a) || !isLandmarkVisible(b) || !isLandmarkVisible(c)) {
        return null;
    }
    return calculateAngle(a, b, c);
}

/**
 * Check if a landmark is sufficiently visible.
 * @param {object} landmark - { x, y, z, visibility }
 * @param {number} threshold - minimum visibility (0–1), default 0.5
 * @returns {boolean}
 */
export function isLandmarkVisible(landmark, threshold = 0.5) {
    if (!landmark) return false;
    return (landmark.visibility ?? 0) >= threshold;
}

/**
 * Calculate velocity magnitude of a landmark between two frames.
 * @param {object} prev - Previous landmark { x, y }
 * @param {object} curr - Current landmark { x, y }
 * @param {number} dt - Time delta in seconds
 * @returns {number} velocity in normalized units/sec
 */
export function landmarkVelocity(prev, curr, dt) {
    if (!prev || !curr || dt <= 0) return 0;
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    return Math.sqrt(dx * dx + dy * dy) / dt;
}

/**
 * Calculate trunk lean angle (deviation from vertical).
 * Uses shoulder midpoint and hip midpoint.
 * @param {Array} landmarks
 * @returns {number|null} lean angle in degrees (0 = straight, positive = leaning)
 */
export function getTrunkLean(landmarks) {
    if (!landmarks || landmarks.length < 33) return null;
    const lShoulder = landmarks[11];
    const rShoulder = landmarks[12];
    const lHip = landmarks[23];
    const rHip = landmarks[24];
    if (!lShoulder || !rShoulder || !lHip || !rHip) return null;

    const shoulderMid = {
        x: (lShoulder.x + rShoulder.x) / 2,
        y: (lShoulder.y + rShoulder.y) / 2,
    };
    const hipMid = {
        x: (lHip.x + rHip.x) / 2,
        y: (lHip.y + rHip.y) / 2,
    };

    const dx = shoulderMid.x - hipMid.x;
    const dy = hipMid.y - shoulderMid.y; // y is inverted in screen coords
    return Math.abs(Math.atan2(dx, dy) * (180 / Math.PI));
}

/**
 * Exponential smoothing for angle readings.
 * Reduces jitter from pose detection noise.
 */
export class AngleSmoother {
    constructor(alpha = 0.5) {
        this.alpha = alpha; // Smoothing factor (0 < alpha <= 1). Lower = more smoothing.
        this.lastValue = null;
    }

    addReading(value) {
        if (value === null || value === undefined) return null;
        if (this.lastValue === null) {
            this.lastValue = value;
            return value;
        }
        // Exponential Moving Average (EMA)
        this.lastValue = this.alpha * value + (1 - this.alpha) * this.lastValue;
        return this.lastValue;
    }

    reset() {
        this.lastValue = null;
    }
}

