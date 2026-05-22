/* ============================================================
   ARAGID — MOOD SYSTEM
   قلب المنتج: قياس قبل/بعد كل جلسة → دليل قيمة
   ============================================================ */

import { DB, todayKey } from './core.js';

// المشاعر الـ 8 الأساسية (Plutchik adapted to Arabic)
export const MOODS = [
  { id: 'calm',      label: 'هادئة',     emoji: '🌙', tone: 'positive', color: 'teal'  },
  { id: 'grateful',  label: 'ممتنّة',    emoji: '✦', tone: 'positive', color: 'gold'  },
  { id: 'hopeful',   label: 'متفائلة',   emoji: '✿', tone: 'positive', color: 'rose'  },
  { id: 'neutral',   label: 'عادية',     emoji: '◯', tone: 'neutral',  color: 'plum'  },
  { id: 'tired',     label: 'متعبة',     emoji: '◌', tone: 'low',      color: 'plum'  },
  { id: 'anxious',   label: 'قلقة',      emoji: '◐', tone: 'low',      color: 'gold'  },
  { id: 'sad',       label: 'حزينة',     emoji: '◑', tone: 'low',      color: 'rose'  },
  { id: 'broken',    label: 'مكسورة',    emoji: '✕', tone: 'crisis',   color: 'crimson' }
];

// Mood intensity scale 1-10
export const moodScore = (moodId) => {
  const map = {
    grateful: 9, hopeful: 8, calm: 7,
    neutral: 5,
    tired: 4, anxious: 3, sad: 2, broken: 1
  };
  return map[moodId] || 5;
};

// Get mood object by id
export const getMood = (id) => MOODS.find(m => m.id === id);

// Save a mood check
export const logMood = (moodId, context = 'spontaneous', meta = {}) => {
  if (!moodId) return null;
  const logs = DB.get('mood_logs', []);
  const entry = {
    id: Date.now(),
    moodId,
    score: moodScore(moodId),
    context,             // 'pre-session', 'post-session', 'spontaneous', 'onboarding'
    sessionType: meta.sessionType || null, // 'write', 'nada', 'rescue', 'emdr', etc
    sessionId: meta.sessionId || null,
    timestamp: new Date().toISOString(),
    dateKey: todayKey()
  };
  logs.unshift(entry);
  // Keep last 500 entries
  DB.set('mood_logs', logs.slice(0, 500));
  return entry;
};

// Match a pre/post mood pair to compute lift
export const computeLift = (preId, postId) => {
  const pre = moodScore(preId);
  const post = moodScore(postId);
  const lift = post - pre;
  return {
    pre, post, lift,
    percent: pre > 0 ? Math.round((lift / Math.max(pre, 1)) * 100) : 0,
    improved: lift > 0,
    same: lift === 0,
    worsened: lift < 0
  };
};

// Get today's logs
export const todayLogs = () => {
  const t = todayKey();
  return DB.get('mood_logs', []).filter(l => l.dateKey === t);
};

// Average mood over N days
export const avgMoodLast = (days = 7) => {
  const now = Date.now();
  const cutoff = now - days * 86400000;
  const logs = DB.get('mood_logs', [])
    .filter(l => new Date(l.timestamp).getTime() >= cutoff);
  if (logs.length === 0) return null;
  const sum = logs.reduce((a, l) => a + l.score, 0);
  return Math.round((sum / logs.length) * 10) / 10;
};

// Trend over N days (returns array of {dateKey, avg, count})
export const moodTrend = (days = 14) => {
  const logs = DB.get('mood_logs', []);
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const dayLogs = logs.filter(l => l.dateKey === key);
    if (dayLogs.length === 0) {
      result.push({ dateKey: key, avg: null, count: 0, label: d.toLocaleDateString('ar', { weekday: 'short' }) });
    } else {
      const avg = dayLogs.reduce((a, l) => a + l.score, 0) / dayLogs.length;
      result.push({
        dateKey: key,
        avg: Math.round(avg * 10) / 10,
        count: dayLogs.length,
        label: d.toLocaleDateString('ar', { weekday: 'short' })
      });
    }
  }
  return result;
};

// Best/Hardest day in window
export const moodExtremes = (days = 7) => {
  const trend = moodTrend(days).filter(d => d.avg !== null);
  if (trend.length === 0) return { best: null, hardest: null };
  const best = trend.reduce((a, b) => (b.avg > a.avg ? b : a));
  const hardest = trend.reduce((a, b) => (b.avg < a.avg ? b : a));
  return { best, hardest };
};

// Most common mood (frequency in window)
export const dominantMood = (days = 7) => {
  const now = Date.now();
  const cutoff = now - days * 86400000;
  const logs = DB.get('mood_logs', [])
    .filter(l => new Date(l.timestamp).getTime() >= cutoff);
  if (logs.length === 0) return null;
  const counts = {};
  logs.forEach(l => { counts[l.moodId] = (counts[l.moodId] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return { moodId: top[0], count: top[1], total: logs.length };
};

// Lift summary: average improvement from pre→post sessions in window
export const liftSummary = (days = 30) => {
  const now = Date.now();
  const cutoff = now - days * 86400000;
  const logs = DB.get('mood_logs', [])
    .filter(l => new Date(l.timestamp).getTime() >= cutoff);

  // Pair pre with post by sessionId
  const pairs = {};
  logs.forEach(l => {
    if (!l.sessionId) return;
    if (!pairs[l.sessionId]) pairs[l.sessionId] = {};
    if (l.context === 'pre-session') pairs[l.sessionId].pre = l;
    if (l.context === 'post-session') pairs[l.sessionId].post = l;
  });

  const lifts = Object.values(pairs)
    .filter(p => p.pre && p.post)
    .map(p => p.post.score - p.pre.score);

  if (lifts.length === 0) return null;

  const totalImproved = lifts.filter(l => l > 0).length;
  const avgLift = lifts.reduce((a, b) => a + b, 0) / lifts.length;

  return {
    pairs: lifts.length,
    improvedPercent: Math.round((totalImproved / lifts.length) * 100),
    avgLift: Math.round(avgLift * 10) / 10,
    totalImproved
  };
};

// Auto-suggest protocol based on recent mood
export const moodToProtocol = (moodId) => {
  const map = {
    broken: 'collapse-night',
    anxious: 'panic-now',
    sad: 'emotional-overload',
    tired: 'self-criticism'
  };
  return map[moodId] || null;
};

// Generate a short narrative for today (used in dashboard)
export const todayNarrative = () => {
  const logs = todayLogs();
  if (logs.length === 0) return null;
  const latest = logs[0];
  const mood = getMood(latest.moodId);
  if (!mood) return null;

  // Compare with yesterday avg
  const ystdKey = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const ystdLogs = DB.get('mood_logs', []).filter(l => l.dateKey === ystdKey);
  const ystdAvg = ystdLogs.length > 0
    ? ystdLogs.reduce((a, l) => a + l.score, 0) / ystdLogs.length
    : null;

  let trend = 'stable';
  if (ystdAvg !== null) {
    if (latest.score > ystdAvg + 1) trend = 'up';
    else if (latest.score < ystdAvg - 1) trend = 'down';
  }

  return { mood, score: latest.score, trend, count: logs.length };
};
