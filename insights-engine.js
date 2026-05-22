/* ============================================================
   ARAGID — INSIGHTS ENGINE
   اكتشاف أنماط ذكية من بيانات المستخدمة
   ============================================================ */

import { DB, todayKey } from './core.js';
import { moodTrend, dominantMood, liftSummary, moodExtremes, avgMoodLast, MOODS, getMood } from './mood-system.js';

// ===== Pattern detectors =====
// كل pattern يرجع: { triggered, headline, body, severity, action }

const patternNightStruggle = () => {
  const logs = DB.get('mood_logs', []).slice(0, 60);
  const nightLogs = logs.filter(l => {
    const h = new Date(l.timestamp).getHours();
    return h >= 22 || h <= 4;
  });
  if (nightLogs.length < 4) return null;
  const lowNight = nightLogs.filter(l => l.score <= 4).length;
  const ratio = lowNight / nightLogs.length;
  if (ratio < 0.55) return null;
  return {
    id: 'night-struggle',
    triggered: true,
    severity: 'medium',
    headline: 'الليل أثقل عليكِ من النهار',
    body: `في آخر ${nightLogs.length} لحظة سَجَّلتيها بين الـ ١٠ مساءً والـ ٤ فجراً، ${Math.round(ratio*100)}٪ كانت ضمن المشاعر الصعبة. ليلكِ يحتاج طقساً خاصاً.`,
    action: { label: 'افتحي طقس الليل', protocolId: 'collapse-night' }
  };
};

const patternRecurringTheme = () => {
  const dom = dominantMood(14);
  if (!dom || dom.count < 6) return null;
  const ratio = dom.count / dom.total;
  if (ratio < 0.4) return null;
  const m = getMood(dom.moodId);
  if (!m || m.tone === 'positive') return null;
  return {
    id: 'recurring-theme',
    triggered: true,
    severity: 'medium',
    headline: `${m.label} يتكرّر معكِ هذه الفترة`,
    body: `في آخر أسبوعين، شعور "${m.label}" ظهر في ${dom.count} لحظة من أصل ${dom.total} (${Math.round(ratio*100)}٪). ليس صدفة — هذا نمط يستحقّ الانتباه.`,
    action: { label: 'اكتبي عنه', view: 'write' }
  };
};

const patternImprovement = () => {
  const lift = liftSummary(30);
  if (!lift || lift.pairs < 3) return null;
  if (lift.improvedPercent < 60) return null;
  return {
    id: 'improvement',
    triggered: true,
    severity: 'positive',
    headline: 'جلساتكِ تنفعكِ فعلاً',
    body: `في ${lift.pairs} جلسة، شعركِ تَحسَّن في ${lift.improvedPercent}٪ منها. متوسط التحسّن +${lift.avgLift} درجة. هذا ليس وهماً — هذا تأثير حقيقي.`,
    action: { label: 'شاركي إنجازكِ', share: true }
  };
};

const patternStreakMomentum = () => {
  const streak = DB.get('streak', 0);
  if (streak < 5) return null;
  return {
    id: 'streak-momentum',
    triggered: true,
    severity: 'positive',
    headline: `${streak} يوماً متواصلاً — أنتِ تَبنين عادة`,
    body: 'الأبحاث تقول إنّ ٢١ يوماً تكفي لتثبيت عادة عاطفية. أنتِ في الطريق.',
    action: null
  };
};

const patternEmotionalDrop = () => {
  const trend = moodTrend(7);
  const valid = trend.filter(d => d.avg !== null);
  if (valid.length < 4) return null;
  const recent3 = valid.slice(-3);
  const prev3 = valid.slice(-6, -3);
  if (prev3.length < 2) return null;
  const recentAvg = recent3.reduce((a, d) => a + d.avg, 0) / recent3.length;
  const prevAvg = prev3.reduce((a, d) => a + d.avg, 0) / prev3.length;
  if (recentAvg >= prevAvg - 1) return null;
  return {
    id: 'emotional-drop',
    triggered: true,
    severity: 'high',
    headline: 'هذه الأيام أصعب من السابقة',
    body: `متوسطكِ نزل من ${prevAvg.toFixed(1)} إلى ${recentAvg.toFixed(1)} خلال أسبوع. لا تكتميه — أعطي نفسكِ وقتاً.`,
    action: { label: 'ابدئي بروتوكول الحمل العاطفي', protocolId: 'emotional-overload' }
  };
};

const patternFirstWeek = () => {
  const profile = DB.get('profile', {});
  const created = DB.get('profileCreatedAt', null);
  const archive = DB.get('archive', []);
  if (!created) return null;
  const daysSince = Math.floor((Date.now() - new Date(created).getTime()) / 86400000);
  if (daysSince >= 7) return null;
  if (archive.length < 1) return null;
  return {
    id: 'first-week',
    triggered: true,
    severity: 'positive',
    headline: 'أسبوعكِ الأول مع أراغيد',
    body: `في ${daysSince + 1} أيام، كتبتِ ${archive.length} جلسة. هذا أكثر مما يكتبه ٧٠٪ من الناس في شهرهم الأول.`,
    action: null
  };
};

// ===== Run all detectors =====
export const detectAllInsights = () => {
  const detectors = [
    patternEmotionalDrop,    // أولوية عليا (تحذير)
    patternImprovement,      // إيجابي قوي
    patternRecurringTheme,
    patternNightStruggle,
    patternStreakMomentum,
    patternFirstWeek
  ];

  const insights = [];
  for (const d of detectors) {
    try {
      const result = d();
      if (result?.triggered) insights.push(result);
    } catch (e) {
      console.warn('[Insights] detector failed:', e);
    }
  }
  return insights;
};

// ===== Weekly Report Generator =====
export const generateWeeklyReport = () => {
  const trend = moodTrend(7);
  const validDays = trend.filter(d => d.avg !== null);
  const avg = avgMoodLast(7);
  const dom = dominantMood(7);
  const extremes = moodExtremes(7);
  const lift = liftSummary(7);

  const sessions = DB.get('sessions', []);
  const weekAgo = Date.now() - 7 * 86400000;
  const weekSessions = sessions.filter(s => new Date(s.timestamp).getTime() >= weekAgo);

  const archive = DB.get('archive', []);
  const weekWrites = archive.filter(a => a.type === 'write' && new Date(a.timestamp).getTime() >= weekAgo);
  const totalWords = weekWrites.reduce((sum, w) => sum + (w.wordCount || 0), 0);

  // Theme detection from writings
  let theme = null;
  if (weekWrites.length > 0) {
    const allText = weekWrites.map(w => w.text).join(' ').toLowerCase();
    const themes = [
      { kw: ['تعب', 'إرهاق', 'مرهقة'], label: 'التعب' },
      { kw: ['وحدة', 'وحيدة'], label: 'الوحدة' },
      { kw: ['قلق', 'خوف'], label: 'القلق' },
      { kw: ['أمل', 'فرح'], label: 'الأمل' },
      { kw: ['غضب', 'زعل'], label: 'الغضب' },
      { kw: ['حب', 'علاقة'], label: 'العلاقات' }
    ];
    let max = 0;
    for (const t of themes) {
      const count = t.kw.reduce((s, k) => s + (allText.split(k).length - 1), 0);
      if (count > max) { max = count; theme = t.label; }
    }
  }

  return {
    week: 'الأسبوع الماضي',
    days: validDays.length,
    avgMood: avg,
    domMood: dom ? getMood(dom.moodId) : null,
    best: extremes.best,
    hardest: extremes.hardest,
    sessions: weekSessions.length,
    writes: weekWrites.length,
    words: totalWords,
    lift,
    theme,
    trend: validDays
  };
};

// ===== Monthly Reset =====
export const generateMonthlyReset = () => {
  const trend = moodTrend(30);
  const validDays = trend.filter(d => d.avg !== null);
  const avg = avgMoodLast(30);
  const dom = dominantMood(30);
  const lift = liftSummary(30);
  const sessions = DB.get('sessions', []);
  const monthAgo = Date.now() - 30 * 86400000;
  const monthSessions = sessions.filter(s => new Date(s.timestamp).getTime() >= monthAgo);
  const archive = DB.get('archive', []);
  const monthWrites = archive.filter(a => a.type === 'write' && new Date(a.timestamp).getTime() >= monthAgo);
  const letters = DB.get('letters', []);

  // Most courageous moment: longest writing
  const longest = monthWrites.sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0))[0];

  return {
    days: validDays.length,
    avgMood: avg,
    domMood: dom ? getMood(dom.moodId) : null,
    sessions: monthSessions.length,
    writes: monthWrites.length,
    letters: letters.length,
    lift,
    longest: longest ? { date: longest.timestamp, wordCount: longest.wordCount } : null
  };
};
