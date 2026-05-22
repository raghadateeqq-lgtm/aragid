/* ============================================================
   ARAGID — VIEW: HOME (v2)
   Smart dashboard adapting to mood + recent state
   ============================================================ */

import { $, el, DB, greeting, timeOfDay, toAR, updateStreak, router, openModal, closeModal, haptic, arDateShort } from './core.js';
import { wisdom, getDailyQuote } from './data-wisdom.js';
import { MOODS, getMood, logMood, todayLogs, avgMoodLast, todayNarrative, moodToProtocol } from './mood-system.js';
import { detectAllInsights } from './insights-engine.js';
import { openHub as openRescueHub } from './views-rescue.js';

export const renderHome = () => {
  const view = $('#view-home');
  if (!view) return;
  view.innerHTML = '';

  const streak = updateStreak();
  const profile = DB.get('profile', { name: '' });
  const sessions = DB.get('sessions', []);
  const garden = DB.get('garden', []);
  const insights = detectAllInsights();
  const todayMood = todayNarrative();
  const avg7 = avgMoodLast(7);
  const archive = DB.get('archive', []);
  const isFirstTime = sessions.length === 0 && archive.length === 0;

  // ===== Hero (greeting + mood narrative) =====
  const hero = el('div', { class: 'home-hero' },
    el('div', { class: 'home-greeting' },
      greeting() + (profile?.name ? `، ${profile.name}` : '')
    ),
    el('div', { class: 'home-time-of-day' }, timeOfDay()),
    el('div', { class: 'home-quote' }, getDailyQuote())
  );
  view.appendChild(hero);

  // ===== Mood Check-in =====
  if (todayMood) {
    const trendIcon = todayMood.trend === 'up' ? '↑' : todayMood.trend === 'down' ? '↓' : '·';
    const trendLabel = todayMood.trend === 'up' ? 'أهدأ من أمس' :
                       todayMood.trend === 'down' ? 'أصعب من أمس' : 'مستقرّة';
    const card = el('div', { class: 'mood-snapshot mood-snapshot-' + todayMood.mood.tone },
      el('div', { class: 'mood-snapshot-row' },
        el('div', { class: 'mood-snapshot-emoji' }, todayMood.mood.emoji),
        el('div', { class: 'mood-snapshot-info' },
          el('div', { class: 'mood-snapshot-eyebrow' }, 'لحظتكِ الأخيرة اليوم'),
          el('div', { class: 'mood-snapshot-title' }, todayMood.mood.label),
          el('div', { class: 'mood-snapshot-trend' },
            el('span', { class: 'trend-icon' }, trendIcon),
            el('span', {}, trendLabel)
          )
        ),
        el('button', {
          class: 'mood-snapshot-update',
          onclick: openMoodPicker,
          'aria-label': 'تحديث'
        }, '⟲')
      )
    );
    view.appendChild(card);

    // Suggest protocol if mood is low
    if (['anxious', 'sad', 'broken', 'tired'].includes(todayMood.mood.id)) {
      const protId = moodToProtocol(todayMood.mood.id);
      if (protId) {
        view.appendChild(el('div', { class: 'smart-suggestion' },
          el('div', { class: 'smart-suggestion-icon' }, '✦'),
          el('div', { class: 'smart-suggestion-text' },
            el('b', {}, 'مساحة لكِ الآن'),
            el('span', {}, 'بناءً على شعوركِ، بروتوكول صغير قد يخفّف.')
          ),
          el('button', {
            class: 'btn btn-primary btn-sm',
            onclick: () => router.go('protocols')
          }, 'افتحي')
        ));
      }
    }
  } else {
    // No mood today — invite to check in
    view.appendChild(el('div', { class: 'mood-checkin' },
      el('div', { class: 'mood-checkin-eyebrow' }, '✦  لحظة معكِ  ✦'),
      el('div', { class: 'mood-checkin-title' }, 'كيف تشعرين؟'),
      el('div', { class: 'mood-checkin-sub' }, 'لحظة واحدة — تساعدنا نفهمكِ أكثر'),
      el('div', { class: 'mood-grid mood-grid-compact' },
        ...MOODS.slice(0, 8).map(m => el('button', {
          class: 'mood-chip mood-chip-sm mood-' + m.tone,
          onclick: () => { quickLogMood(m.id); }
        },
          el('div', { class: 'mood-emoji' }, m.emoji),
          el('div', { class: 'mood-label' }, m.label)
        ))
      )
    ));
  }

  // ===== Streak (only if 2+) =====
  if (streak >= 2) {
    view.appendChild(el('div', { class: 'streak-card' },
      el('div', { class: 'streak-info' },
        el('span', { class: 'streak-num' }, toAR(streak)),
        el('span', { class: 'streak-label' }, 'يوم متواصل — لا تكسريه')
      ),
      el('div', { class: 'streak-flame' }, '✦')
    ));
  }

  // ===== Quick Actions =====
  view.appendChild(el('div', { class: 'section-title' }, 'ابدئي طقسكِ'));
  view.appendChild(el('div', { class: 'quick-grid' },
    quickCard('nada', '💬', 'ندى', 'تَحَدَّثي معي', ''),
    quickCard('write', '✎', 'اكتبي', 'فضفضة خاصة', 'gold'),
    quickCard('protocols', '✦', 'بروتوكولات', 'لحظات صعبة', 'rose'),
    quickCard('emdr', '◐', 'تأرجح', 'هدوء عميق', 'teal')
  ));

  // ===== Smart Insights (if any) =====
  if (insights.length > 0) {
    view.appendChild(el('div', { class: 'section-title' }, 'لاحظتُ هذا عنكِ'));
    const insightCards = el('div', { class: 'insights-stream' });
    insights.slice(0, 2).forEach(ins => {
      const card = el('div', { class: 'insight-stream-card insight-' + ins.severity },
        el('div', { class: 'insight-stream-eyebrow' }, ins.severity === 'positive' ? '✦' : ins.severity === 'high' ? '⚠' : '◇'),
        el('div', { class: 'insight-stream-headline' }, ins.headline),
        el('div', { class: 'insight-stream-body' }, ins.body),
        ins.action && el('div', { class: 'insight-stream-actions' },
          el('button', {
            class: 'btn btn-primary btn-sm',
            onclick: () => handleInsightAction(ins.action)
          }, ins.action.label)
        )
      );
      insightCards.appendChild(card);
    });
    view.appendChild(insightCards);
  }

  // ===== First-time celebration / value pitch =====
  if (isFirstTime) {
    view.appendChild(el('div', { class: 'first-time-card' },
      el('div', { class: 'first-time-gem' }, '✦'),
      el('div', { class: 'first-time-eyebrow' }, 'لأول مرة هنا'),
      el('div', { class: 'first-time-title' }, 'جلستكِ الأولى ٧ دقائق'),
      el('div', { class: 'first-time-desc' }, 'اكتبي بضع سطور، أو حدّثي ندى. لن نسألكِ عن شيء — فقط أنتِ.'),
      el('button', {
        class: 'btn btn-primary',
        onclick: () => router.go('write')
      }, 'ابدئي الكتابة')
    ));
  } else {
    // ===== Today insight =====
    view.appendChild(el('div', { class: 'card insight-card card-elevated' },
      el('div', { class: 'insight-eyebrow' }, 'تأمّل اليوم'),
      el('div', { class: 'insight-text' }, wisdom.daily[Math.floor(Math.random() * wisdom.daily.length)])
    ));
  }

  // ===== Garden progress =====
  const gardenTarget = 21;
  const gardenPercent = Math.min(100, (garden.length / gardenTarget) * 100);
  view.appendChild(el('div', { class: 'card card-gold home-garden-card', onclick: () => router.go('garden') },
    el('div', { class: 'home-garden-head' },
      el('div', { class: 'home-garden-title' }, 'حديقتكِ تنمو'),
      el('div', { class: 'home-garden-count' }, `${toAR(garden.length)} / ${toAR(gardenTarget)}`)
    ),
    el('div', { class: 'progress-bar-outer' },
      el('div', { class: 'progress-bar-fill', style: { width: gardenPercent + '%' } })
    ),
    el('div', { class: 'home-garden-foot' },
      garden.length === 0
        ? 'ازرعي أول زهرة بأول جلسة'
        : garden.length < gardenTarget
          ? `${toAR(gardenTarget - garden.length)} زهرة تَفصِلكِ عن حديقة كاملة`
          : 'حديقتكِ مكتملة ✦ أحسنتِ'
    )
  ));

  // ===== Weekly summary teaser (if data exists) =====
  if (avg7 !== null && sessions.length >= 3) {
    view.appendChild(el('div', { class: 'card weekly-teaser', onclick: () => router.go('insights') },
      el('div', { class: 'weekly-teaser-eyebrow' }, '◷  هذا الأسبوع'),
      el('div', { class: 'weekly-teaser-row' },
        el('div', { class: 'weekly-teaser-stat' },
          el('div', { class: 'weekly-teaser-num' }, toAR(sessions.filter(s =>
            Date.now() - new Date(s.timestamp).getTime() < 7 * 86400000
          ).length)),
          el('div', { class: 'weekly-teaser-label' }, 'جلسة')
        ),
        el('div', { class: 'weekly-teaser-divider' }),
        el('div', { class: 'weekly-teaser-stat' },
          el('div', { class: 'weekly-teaser-num' }, toAR(avg7)),
          el('div', { class: 'weekly-teaser-label' }, 'متوسط الشعور')
        )
      ),
      el('div', { class: 'weekly-teaser-cta' }, 'افتحي تقريركِ ←')
    ));
  }

  // ===== Crisis Banner =====
  view.appendChild(el('div', { class: 'crisis-banner' },
    el('div', { class: 'crisis-icon' }, '☎'),
    el('div', { class: 'crisis-content' },
      el('h4', {}, 'لحظة صعبة جداً؟'),
      el('p', {}, 'خط الدعم النفسي السعودي ٢٤/٧: ',
        el('a', { href: 'tel:920033360' }, '٩٢٠٠٣٣٣٦٠')
      )
    )
  ));
};

// ===== Helpers =====
const quickCard = (route, icon, title, sub, variant = '') => {
  return el('div', {
    class: `quick-card ${variant}`,
    onclick: () => { haptic([5]); router.go(route); }
  },
    el('div', { class: 'quick-icon' }, icon),
    el('div', { class: 'quick-title' }, title),
    el('div', { class: 'quick-sub' }, sub)
  );
};

const quickLogMood = (moodId) => {
  haptic([5]);
  logMood(moodId, 'spontaneous');
  renderHome();
};

const openMoodPicker = () => {
  const content = el('div', { class: 'mood-picker-modal' },
    el('div', { style: { textAlign: 'center', marginBottom: '20px' } },
      el('div', { style: { fontSize: '40px', marginBottom: '8px' } }, '✦'),
      el('div', { style: { fontSize: '11px', color: 'var(--gold-400)', letterSpacing: '6px' } }, 'كيف تَشعرين الآن؟')
    ),
    el('div', { class: 'mood-grid' },
      ...MOODS.map(m => el('button', {
        class: 'mood-chip mood-' + m.tone,
        onclick: () => {
          haptic([5]);
          logMood(m.id, 'spontaneous');
          closeModal();
          renderHome();
        }
      },
        el('div', { class: 'mood-emoji' }, m.emoji),
        el('div', { class: 'mood-label' }, m.label)
      ))
    )
  );
  openModal(content);
};

const handleInsightAction = (action) => {
  haptic([5]);
  if (action.view) router.go(action.view);
  else if (action.protocolId) router.go('protocols');
  else if (action.share) router.go('insights');
};
