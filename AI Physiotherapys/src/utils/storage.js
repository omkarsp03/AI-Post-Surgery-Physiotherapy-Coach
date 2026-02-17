/**
 * LocalStorage persistence layer.
 * All physiotherapy data stays on-device.
 */

const KEYS = {
    SESSIONS: 'physio_sessions',
    MILESTONES: 'physio_milestones',
    PAIN_LEVELS: 'physio_pain_levels',
    SETTINGS: 'physio_settings',
};

function read(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

function write(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('LocalStorage write failed:', e);
    }
}

// ---- Sessions ----

export function saveSession(session) {
    const sessions = getSessions();
    sessions.push({
        ...session,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        timestamp: new Date().toISOString(),
    });
    write(KEYS.SESSIONS, sessions);
    checkAndAwardMilestones(sessions);
    return sessions;
}

export function getSessions() {
    return read(KEYS.SESSIONS) || [];
}

export function clearSessions() {
    write(KEYS.SESSIONS, []);
}

// ---- Milestones ----

const MILESTONE_DEFS = [
    { id: 'first_session', name: 'First Step', description: 'Completed your first exercise session', icon: '🌟', check: (s) => s.length >= 1 },
    { id: '5_sessions', name: 'Getting Started', description: 'Completed 5 exercise sessions', icon: '🔥', check: (s) => s.length >= 5 },
    { id: '10_sessions', name: 'Dedicated', description: 'Completed 10 exercise sessions', icon: '💪', check: (s) => s.length >= 10 },
    { id: '25_sessions', name: 'Committed', description: 'Completed 25 exercise sessions', icon: '🏆', check: (s) => s.length >= 25 },
    { id: 'perfect_symmetry', name: 'Balanced', description: 'Achieved 90%+ symmetry in a session', icon: '⚖️', check: (s) => s.some(x => (x.symmetryScore ?? 0) >= 90) },
    { id: 'full_rom', name: 'Full Range', description: 'Reached full target ROM in an exercise', icon: '🎯', check: (s) => s.some(x => x.reachedFullROM) },
    { id: 'pain_free', name: 'Pain Free', description: 'Completed a session with 0 pain reported', icon: '😊', check: (s) => s.some(x => x.painLevel === 0) },
    { id: 'streak_3', name: 'Three-Day Streak', description: 'Exercised 3 days in a row', icon: '📅', check: (s) => hasStreak(s, 3) },
];

function hasStreak(sessions, days) {
    if (sessions.length < days) return false;
    const dates = [...new Set(sessions.map(s => new Date(s.timestamp).toDateString()))].sort((a, b) => new Date(a) - new Date(b));
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
        const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / (1000 * 60 * 60 * 24);
        if (diff === 1) { streak++; if (streak >= days) return true; }
        else streak = 1;
    }
    return false;
}

function checkAndAwardMilestones(sessions) {
    const earned = getMilestones();
    const earnedIds = new Set(earned.map(m => m.id));
    MILESTONE_DEFS.forEach(def => {
        if (!earnedIds.has(def.id) && def.check(sessions)) {
            earned.push({ id: def.id, name: def.name, description: def.description, icon: def.icon, earnedAt: new Date().toISOString() });
        }
    });
    write(KEYS.MILESTONES, earned);
}

export function getMilestones() {
    return read(KEYS.MILESTONES) || [];
}

export function getAllMilestoneDefs() {
    return MILESTONE_DEFS;
}

// ---- Pain Levels ----

export function savePainLevel(level) {
    const levels = getPainLevels();
    levels.push({ level, timestamp: new Date().toISOString() });
    write(KEYS.PAIN_LEVELS, levels);
}

export function getPainLevels() {
    return read(KEYS.PAIN_LEVELS) || [];
}

// ---- Settings ----

export function saveSettings(settings) {
    write(KEYS.SETTINGS, settings);
}

export function getSettings() {
    return read(KEYS.SETTINGS) || { environment: 'all' };
}
