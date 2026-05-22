/* ============================================================
   ARAGID — VIEW: INSIGHTS (v2)
   Patterns, weekly report, share PNG, mood charts
   ============================================================ */

import { $, el, DB, toAR, toast, haptic, openModal, closeModal, router, canUseFeature, trackFeatureUsage, arDate } from './core.js';
import { detectAllInsights, generateWeeklyReport, generateMonthlyReset } from './insights-engine.js';
import { moodTrend, avgMoodLast, dominantMood, MOODS, getMood, liftSummary } from './mood-system.js';
import { buildSessionCard, buildWeeklyCard, downloadCanvas, shareCanvas } from './share-card.js';
import { showPaywall } from './views-pricing.js';

let moodChartInstance = null;

export const renderInsights = () => {
  const view = $('#view-insights');
  if (!view) return;
  view.innerHTML = '';

  // Header
  view.appendChild(el('div', { class: 'view-header' },
    el('div', { class: 'view-eyebrow' }, '◷  رؤى وإحصاءات  ◷'),
    el('div', { class: 'view-title' }, 'رحلتكِ'),
    el('div', { class: 'view-desc' }, 'الأنماط، التقدّم، اللحظات الصعبة، واللحظات الجميلة.')
  ));

  const sessions = DB.get('sessions', []);
  const archive = DB.get('archive', []);
  const garden = DB.get('garden', []);
  const letters = DB.get('letters', []);
  const streak = DB.get('streak', 0);
  const streakBest = DB.get('streakBest', 0);
  const moodLogsCount = DB.get('mood_logs', []).length;

  // Empty state
  if (sessions.length === 0 && moodLogsCount === 0) {
    view.appendChild(el('div', { class: 'empty-state' },
      el('div', { class: 'empty-icon' }, '◷'),
      el('div', { class: 'empty-title' }, 'لا توجد بيانات بعد'),
      el('div', { class: 'empty-desc' }, 'كَوني حاضرة لبضع أيام، ثم عودي. سنُريكِ أنماطكِ.'),
      el('button', { class: 'btn btn-primary', onclick: () => router.go('home') }, 'العودة للرئيسية')
    ));
    return;
  }

  // ===== Snapshot stats =====
  view.appendChild(el('div', { class: 'insights-snapshot' },
    statBig(toAR(sessions.length), 'جلسة كاملة'),
    statBig(toAR(garden.length), 'زهرة'),
    statBig(toAR(letters.length), 'رسالة'),
    statBig(toAR(streakBest), 'أطول سلسلة')
  ));

  // ===== Mood Trend Chart =====
  const trend14 = moodTrend(14);
  const hasMoodData = trend14.some(d => d.avg !== null);

  if (hasMoodData) {
    view.appendChild(el('div', { class: 'section-title' }, 'متوسط شعوركِ — آخر أسبوعين'));
    const chartCard = el('div', { class: 'chart-container' },
      el('canvas', { id: 'mood-trend-chart', style: { maxHeight: '220px' } })
    );
    view.appendChild(chartCard);

    setTimeout(() => buildMoodChart(trend14), 50);
  } else {
    view.appendChild(el('div', { class: 'mood-data-prompt' },
      el('div', { class: 'mood-data-prompt-icon' }, '◯'),
      el('div', { class: 'mood-data-prompt-text' },
        el('b', {}, 'سَجِّلي شعوركِ يومياً'),
        el('span', {}, 'لحظة واحدة كل يوم تكفي لاكتشاف أنماطكِ.')
      ),
      el('button', { class: 'btn btn-primary btn-sm', onclick: () => router.go('home') }, 'سَجِّلي الآن')
    ));
  }

  // ===== Lift Summary =====
  const lift = liftSummary(30);
  if (lift && lift.pairs >= 2) {
    view.appendChild(el('div', { class: 'lift-card' },
      el('div', { class: 'lift-card-eyebrow' }, '◇  أثر الجلسات'),
      el('div', { class: 'lift-card-grid' },
        el('div', { class: 'lift-stat' },
          el('div', { class: 'lift-stat-num' }, toAR(lift.improvedPercent) + '٪'),
          el('div', { class: 'lift-stat-label' }, 'من جلساتكِ نفعتكِ')
        ),
        el('div', { class: 'lift-stat' },
          el('div', { class: 'lift-stat-num' }, '+' + toAR(lift.avgLift)),
          el('div', { class: 'lift-stat-label' }, 'متوسط التحسّن')
        ),
        el('div', { class: 'lift-stat' },
          el('div', { class: 'lift-stat-num' }, toAR(lift.pairs)),
          el('div', { class: 'lift-stat-label' }, 'جلسة مقاسة')
        )
      )
    ));
  }

  // ===== Insights Cards =====
  const insights = detectAllInsights();
  if (insights.length > 0) {
    view.appendChild(el('div', { class: 'section-title' }, 'ما لاحظنا في رحلتكِ'));
    const wrap = el('div', { class: 'insights-stream' });
    insights.forEach(ins => {
      wrap.appendChild(el('div', { class: 'insight-stream-card insight-' + ins.severity },
        el('div', { class: 'insight-stream-eyebrow' },
          ins.severity === 'positive' ? '✦' :
          ins.severity === 'high' ? '⚠' : '◇'
        ),
        el('div', { class: 'insight-stream-headline' }, ins.headline),
        el('div', { class: 'insight-stream-body' }, ins.body)
      ));
    });
    view.appendChild(wrap);
  }

  // ===== Weekly Report CTA =====
  view.appendChild(el('div', { class: 'section-title' }, 'تقاريركِ'));
  view.appendChild(el('div', { class: 'report-card', onclick: openWeeklyReport },
    el('div', { class: 'report-card-icon' }, '◷'),
    el('div', { class: 'report-card-info' },
      el('div', { class: 'report-card-title' }, 'تقريركِ الأسبوعي'),
      el('div', { class: 'report-card-desc' }, 'ملخص الأسبوع + بطاقة قابلة للمشاركة')
    ),
    el('div', { class: 'report-card-arrow' }, '◀')
  ));

  view.appendChild(el('div', { class: 'report-card', onclick: openMonthlyReset },
    el('div', { class: 'report-card-icon' }, '✦'),
    el('div', { class: 'report-card-info' },
      el('div', { class: 'report-card-title' }, 'رسالة إعادة الضبط الشهرية'),
      el('div', { class: 'report-card-desc' }, 'وداع الشهر، بداية القادم'),
      el('div', { class: 'report-card-tag' }, '✦ كاملة')
    ),
    el('div', { class: 'report-card-arrow' }, '◀')
  ));

  // ===== Sessions chart (last 7 days) =====
  if (sessions.length > 0 && typeof Chart !== 'undefined') {
    view.appendChild(el('div', { class: 'section-title' }, 'نشاطكِ — آخر ٧ أيام'));
    view.appendChild(el('div', { class: 'chart-container' },
      el('canvas', { id: 'sessions-chart', style: { maxHeight: '180px' } })
    ));
    setTimeout(() => buildSessionsChart(sessions), 50);
  }
};

// ===== Stat helpers =====
const statBig = (num, label) => el('div', { class: 'snap-stat' },
  el('div', { class: 'snap-stat-num' }, num),
  el('div', { class: 'snap-stat-label' }, label)
);

// ===== Charts =====
const buildMoodChart = (trend) => {
  const ctx = document.getElementById('mood-trend-chart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (moodChartInstance) { try { moodChartInstance.destroy(); } catch {} }

  const labels = trend.map(d => d.label);
  const data = trend.map(d => d.avg);

  // Build line
  moodChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#C9A66B',
        backgroundColor: 'rgba(201, 166, 107, 0.18)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#BC7DEF',
        pointBorderColor: '#F0E4CC',
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        backgroundColor: '#1A0F2E',
        borderColor: '#C9A66B',
        borderWidth: 1,
        titleColor: '#F0E4CC',
        bodyColor: '#F0E4CC',
        padding: 12
      } },
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
          grid: { color: 'rgba(232,196,255,0.07)' },
          ticks: { color: 'rgba(240,228,204,0.5)', stepSize: 2 }
        },
        x: {
          grid: { display: false },
          ticks: { color: 'rgba(240,228,204,0.6)', font: { family: 'Tajawal', size: 11 } }
        }
      }
    }
  });
};

let sessionsChartInstance = null;
const buildSessionsChart = (sessions) => {
  const ctx = document.getElementById('sessions-chart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (sessionsChartInstance) { try { sessionsChartInstance.destroy(); } catch {} }

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const count = sessions.filter(s => s.timestamp.startsWith(key)).length;
    days.push({
      label: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
      count
    });
  }

  sessionsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days.map(d => d.label),
      datasets: [{
        data: days.map(d => d.count),
        backgroundColor: 'rgba(160, 96, 232, 0.4)',
        borderColor: '#A060E8',
        borderWidth: 1,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(232,196,255,0.08)' }, ticks: { color: 'rgba(240,228,204,0.6)', stepSize: 1 } },
        x: { grid: { display: false }, ticks: { color: 'rgba(240,228,204,0.6)' } }
      }
    }
  });
};

// ===== Weekly Report Modal =====
const openWeeklyReport = () => {
  const quota = canUseFeature('weeklyReport');
  if (!quota.ok) {
    showPaywall('weeklyReport', quota.reason);
    return;
  }

  const report = generateWeeklyReport();
  trackFeatureUsage('weeklyReport');

  const content = el('div', { class: 'report-modal' },
    el('div', { style: { textAlign: 'center', marginBottom: '20px' } },
      el('div', { style: { fontSize: '40px', color: 'var(--gold-400)' } }, '◷'),
      el('div', { style: { fontSize: '11px', color: 'var(--gold-400)', letterSpacing: '6px', marginTop: '4px' } }, 'تقريركِ الأسبوعي')
    ),
    el('h2', { class: 'report-modal-title' }, 'الأسبوع الماضي'),
    el('div', { class: 'report-stats-grid' },
      reportStat(toAR(report.sessions || 0), 'جلسة'),
      reportStat(report.avgMood !== null ? toAR(report.avgMood) : '—', 'متوسط الشعور'),
      reportStat(toAR(report.words || 0), 'كلمة كتبتِها'),
      reportStat(toAR(report.days), 'يوم نشط')
    ),
    report.domMood && el('div', { class: 'report-row' },
      el('div', { class: 'report-row-label' }, 'الشعور الغالب'),
      el('div', { class: 'report-row-value' }, report.domMood.emoji + ' ' + report.domMood.label)
    ),
    report.best && el('div', { class: 'report-row' },
      el('div', { class: 'report-row-label' }, 'أهدأ يوم'),
      el('div', { class: 'report-row-value' }, report.best.label + ` (${toAR(report.best.avg)})`)
    ),
    report.hardest && el('div', { class: 'report-row' },
      el('div', { class: 'report-row-label' }, 'أصعب يوم'),
      el('div', { class: 'report-row-value' }, report.hardest.label + ` (${toAR(report.hardest.avg)})`)
    ),
    report.theme && el('div', { class: 'report-row' },
      el('div', { class: 'report-row-label' }, 'موضوع الأسبوع'),
      el('div', { class: 'report-row-value' }, report.theme)
    ),
    report.lift && el('div', { class: 'report-lift' },
      el('div', { class: 'report-lift-headline' }, `${toAR(report.lift.improvedPercent)}٪ من جلساتكِ نَفَعَتكِ`),
      el('div', { class: 'report-lift-sub' }, `بمتوسط +${toAR(report.lift.avgLift)} درجة هدوء`)
    ),
    el('div', { class: 'report-actions' },
      el('button', {
        class: 'btn btn-primary',
        onclick: () => shareReportPNG(report)
      }, '⤓  شاركيه كصورة'),
      el('button', { class: 'btn btn-ghost', onclick: closeModal }, 'تمّ')
    )
  );
  openModal(content, { size: 'lg' });
};

const reportStat = (num, label) => el('div', { class: 'report-stat' },
  el('div', { class: 'report-stat-num' }, num),
  el('div', { class: 'report-stat-label' }, label)
);

const shareReportPNG = async (report) => {
  try {
    const canvas = buildWeeklyCard(report);
    haptic([10, 30, 10]);
    // Try native share first
    const shared = await shareCanvas(canvas, { title: 'تقريري الأسبوعي', text: 'مساحتي مع أراغيد' });
    if (!shared) {
      await downloadCanvas(canvas, `aragid-weekly-${new Date().toISOString().slice(0, 10)}.png`);
      toast('تم حفظ البطاقة', 'success');
    }
  } catch (e) {
    toast('فشلت المشاركة', 'danger');
  }
};

// ===== Monthly Reset (Premium only) =====
const openMonthlyReset = () => {
  const quota = canUseFeature('monthlyReset');
  if (!quota.ok) {
    showPaywall('monthlyReset', quota.reason);
    return;
  }

  const reset = generateMonthlyReset();
  const content = el('div', { class: 'reset-modal' },
    el('div', { style: { textAlign: 'center', marginBottom: '20px' } },
      el('div', { style: { fontSize: '48px', color: 'var(--gold-300)' } }, '✦'),
      el('div', { style: { fontSize: '11px', color: 'var(--gold-400)', letterSpacing: '8px', marginTop: '8px' } }, 'رسالة الشهر')
    ),
    el('h2', { class: 'reset-title' }, 'وداع لشهر، بداية لِشهر'),
    el('div', { class: 'reset-letter' },
      el('p', {},
        `في الشهر الماضي، حَضَرتِ لنفسكِ ${toAR(reset.sessions)} مرة. `,
        `كَتَبتِ ${toAR(reset.writes)} جلسة. `,
        reset.lift ? `${toAR(reset.lift.improvedPercent)}٪ منها نفعتكِ — هذا انتصار حقيقي.` : ''
      ),
      el('p', {}, reset.avgMood !== null
        ? `متوسط شعوركِ كان ${toAR(reset.avgMood)} من ١٠ — تَذكَّري هذا الرقم.`
        : 'بدأتِ السَّفَر مع أراغيد — وهذا أصعب جزء.'
      ),
      el('p', {}, 'الشهر القادم لن يكون مثاليّاً. لكنّكِ ستكونين أوعى. وهذا يكفي.')
    ),
    el('div', { class: 'reset-actions' },
      el('button', { class: 'btn btn-primary', onclick: closeModal }, 'احتفظي بها')
    )
  );
  openModal(content, { size: 'lg' });
};
