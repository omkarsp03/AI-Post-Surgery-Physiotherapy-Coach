/**
 * Smart Coach Engine
 * - Smart Form Explanations: context-aware coaching feedback
 * - Exercise Auto-Switch: suggests alternatives when struggling
 * - Gesture Detection: raised hand = pause, thumbs up = next set
 * 
 * All processing in-browser — no data sent externally.
 */

// ─── Smart Form Explanations ───────────────────────────────────────

const FORM_RULES = [
    {
        id: 'trunk_lean_forward',
        check: (data) => data.trunkLean && data.trunkLean.angle > 12,
        getMessage: (data) => ({
            text: `Your trunk is leaning ${data.trunkLean.angle}° — try keeping your chest upright and core engaged.`,
            priority: data.trunkLean.angle > 20 ? 'high' : 'medium',
            category: 'posture',
        }),
    },
    {
        id: 'too_fast',
        check: (data) => data.repSpeed && data.repSpeed < 1.5,
        getMessage: () => ({
            text: 'You\'re moving too quickly — slow down for better muscle control and safer recovery.',
            priority: 'medium',
            category: 'speed',
        }),
    },
    {
        id: 'too_slow',
        check: (data) => data.repSpeed && data.repSpeed > 8,
        getMessage: () => ({
            text: 'You can move a bit faster — aim for a smooth, controlled pace.',
            priority: 'low',
            category: 'speed',
        }),
    },
    {
        id: 'momentum_detected',
        check: (data) => data.momentum && data.momentum.level !== 'safe',
        getMessage: () => ({
            text: 'You\'re using momentum — slow down and use controlled muscle movement only.',
            priority: 'high',
            category: 'control',
        }),
    },
    {
        id: 'incomplete_rom',
        check: (data) => data.romPercentage !== null && data.romPercentage < 70,
        getMessage: (data) => ({
            text: `You're only reaching ${Math.round(data.romPercentage)}% of the target range — try to extend a bit further if comfortable.`,
            priority: 'medium',
            category: 'rom',
        }),
    },
    {
        id: 'asymmetry',
        check: (data) => data.symmetryScore !== null && data.symmetryScore < 75,
        getMessage: (data) => ({
            text: `Noticeable asymmetry detected (${data.symmetryScore}%) — focus on equal effort on both sides.`,
            priority: 'medium',
            category: 'symmetry',
        }),
    },
    {
        id: 'great_form',
        check: (data) => data.quality && data.quality >= 85 && (!data.trunkLean || data.trunkLean.angle < 8),
        getMessage: () => ({
            text: 'Excellent form! Keep this up — your movement quality is outstanding.',
            priority: 'low',
            category: 'praise',
        }),
    },
    {
        id: 'hip_shift',
        check: (data) => {
            if (!data.landmarks || data.landmarks.length < 33) return false;
            const lHip = data.landmarks[23];
            const rHip = data.landmarks[24];
            if (!lHip || !rHip) return false;
            return Math.abs(lHip.y - rHip.y) > 0.05;
        },
        getMessage: () => ({
            text: 'Your hips are uneven — try to keep your pelvis level throughout the movement.',
            priority: 'medium',
            category: 'posture',
        }),
    },
];

/**
 * Generate smart coaching feedback from current exercise data.
 * @param {object} data - Current exercise data
 * @returns {object[]} Array of feedback messages, sorted by priority
 */
export function getSmartFeedback(data) {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const messages = [];

    for (const rule of FORM_RULES) {
        try {
            if (rule.check(data)) {
                const msg = rule.getMessage(data);
                messages.push({ id: rule.id, ...msg });
            }
        } catch {
            // Skip rules that error
        }
    }

    messages.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    return messages.slice(0, 2); // Show max 2 messages to avoid overwhelm
}

// ─── Exercise Auto-Switch ──────────────────────────────────────────

const EXERCISE_ALTERNATIVES = {
    'knee-extension': {
        easier: 'quad-set',
        reason: 'Try Quad Sets instead — an isometric exercise that\'s gentler on your knee.',
    },
    'shoulder-flexion': {
        easier: 'shoulder-abduction',
        reason: 'Try Shoulder Abduction — it may be easier while building the same strength.',
    },
    'hip-abduction': {
        easier: 'hip-flexion',
        reason: 'Try Seated Hip Flexion using chair support for stability.',
    },
    'straight-leg-raise': {
        easier: 'quad-set',
        reason: 'Try Quad Sets — an isometric exercise that builds quad strength without lifting.',
    },
    'shoulder-abduction': {
        easier: 'shoulder-flexion',
        reason: 'Try Shoulder Flexion — it uses a different movement pattern that may be easier.',
    },
};

/**
 * Suggest an alternative exercise if user is struggling.
 * @param {string} exerciseId - Current exercise ID
 * @param {object} performance - { avgQuality, completionRate, fatigueLevel }
 * @returns {object|null} Suggestion or null
 */
export function suggestAlternative(exerciseId, performance) {
    const { avgQuality = 100, completionRate = 1, fatigueLevel = 'none' } = performance;

    const isStruggling = avgQuality < 50 || completionRate < 0.4 || fatigueLevel === 'severe';
    if (!isStruggling) return null;

    const alt = EXERCISE_ALTERNATIVES[exerciseId];
    if (!alt) return null;

    return {
        exerciseId: alt.easier,
        message: `💡 ${alt.reason}`,
        reason: 'Difficulty detected with current exercise',
    };
}

// ─── Gesture Detection ─────────────────────────────────────────────

/**
 * Detect hand gestures from pose landmarks.
 * - Raised hand (wrist above shoulder) = pause
 * - Thumbs up (thumb extended above fist) = start next set
 * 
 * @param {Array} landmarks - Current pose landmarks
 * @returns {object} { gesture: string|null, message: string }
 */
export function detectGesture(landmarks) {
    if (!landmarks || landmarks.length < 33) {
        return { gesture: null, message: '' };
    }

    // Check for raised hand (either hand)
    const lWrist = landmarks[15];
    const rWrist = landmarks[16];
    const lShoulder = landmarks[11];
    const rShoulder = landmarks[12];
    const lElbow = landmarks[13];
    const rElbow = landmarks[14];

    if (!lWrist || !rWrist || !lShoulder || !rShoulder) {
        return { gesture: null, message: '' };
    }

    // Raised hand: wrist is significantly above the shoulder AND above the head
    const nose = landmarks[0];

    // Left hand raised high (above head level)
    if (lWrist.y < lShoulder.y - 0.15 && nose && lWrist.y < nose.y - 0.05) {
        return { gesture: 'pause', message: '✋ Hand raised — Session paused' };
    }

    // Right hand raised high (above head level)
    if (rWrist.y < rShoulder.y - 0.15 && nose && rWrist.y < nose.y - 0.05) {
        return { gesture: 'pause', message: '✋ Hand raised — Session paused' };
    }

    // Thumbs up detection: thumb tip (4) is above index finger MCP (5)
    // and hand is roughly at shoulder level (not raised high)
    const lThumb = landmarks[21]; // left thumb tip
    const rThumb = landmarks[22]; // right thumb tip  
    const lIndex = landmarks[19]; // left index
    const rIndex = landmarks[20]; // right index

    if (rThumb && rIndex && rElbow) {
        const thumbUp = rThumb.y < rIndex.y - 0.03;
        const handAtLevel = Math.abs(rWrist.y - rShoulder.y) < 0.15;
        if (thumbUp && handAtLevel) {
            return { gesture: 'next', message: '👍 Thumbs up — Starting next set!' };
        }
    }

    if (lThumb && lIndex && lElbow) {
        const thumbUp = lThumb.y < lIndex.y - 0.03;
        const handAtLevel = Math.abs(lWrist.y - lShoulder.y) < 0.15;
        if (thumbUp && handAtLevel) {
            return { gesture: 'next', message: '👍 Thumbs up — Starting next set!' };
        }
    }

    return { gesture: null, message: '' };
}

/**
 * Gesture state machine to debounce gesture detections.
 */
export class GestureController {
    constructor() {
        this.lastGesture = null;
        this.gestureStartTime = null;
        this.gestureCooldown = 0;
        this.HOLD_TIME = 1000;      // Hold gesture for 1s to activate
        this.COOLDOWN_TIME = 3000;  // 3s cooldown between gesture activations
    }

    /**
     * Process a gesture detection.
     * @param {object} detection - { gesture, message } from detectGesture
     * @param {number} timestamp - Current time in ms
     * @returns {{ activated: boolean, gesture: string|null, message: string, progress: number }}
     */
    update(detection, timestamp) {
        // In cooldown
        if (this.gestureCooldown > timestamp) {
            return { activated: false, gesture: null, message: '', progress: 0 };
        }

        if (!detection.gesture) {
            this.lastGesture = null;
            this.gestureStartTime = null;
            return { activated: false, gesture: null, message: '', progress: 0 };
        }

        // New gesture started
        if (detection.gesture !== this.lastGesture) {
            this.lastGesture = detection.gesture;
            this.gestureStartTime = timestamp;
        }

        // Calculate hold progress
        const holdDuration = timestamp - this.gestureStartTime;
        const progress = Math.min(1, holdDuration / this.HOLD_TIME);

        if (holdDuration >= this.HOLD_TIME) {
            // Gesture activated!
            this.gestureCooldown = timestamp + this.COOLDOWN_TIME;
            this.lastGesture = null;
            this.gestureStartTime = null;
            return {
                activated: true,
                gesture: detection.gesture,
                message: detection.message,
                progress: 1,
            };
        }

        return {
            activated: false,
            gesture: detection.gesture,
            message: `Hold ${detection.gesture === 'pause' ? '✋' : '👍'} for ${((this.HOLD_TIME - holdDuration) / 1000).toFixed(1)}s...`,
            progress,
        };
    }

    reset() {
        this.lastGesture = null;
        this.gestureStartTime = null;
        this.gestureCooldown = 0;
    }
}
