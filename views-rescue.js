/* ============================================================
   ARAGID — RESCUE HUB
   ٣٠ ثانية · ٩٠ ثانية · ٧ دقائق — اختاري حسب احتياجكِ
   ============================================================ */

import { $, el, DB, toast, haptic, playTone, toAR, openModal, closeModal, startSession, completeSession } from './core.js';
import { logMood, MOODS } from './mood-system.js';

// ===== Rescue protocols (timing-based) =====
const PROTOCOLS = {
  '30': {
    id: '30',
    title: '٣٠ ثانية',
    desc: 'الفزع الفوري',
    duration: 30,
    cycles: [
      { duration: 4, phase: 'شَهيق', cue: 'امتلئي', tone: 396 },
      { duration: 6, phase: 'زفير',  cue: 'أطلقي',  tone: 396 }
    ],
    color: 'crimson',
    eyebrow: 'فقط نَفَس'
  },
  '90': {
    id: '90',
    title: '٩٠ ثانية',
    desc: 'موجة قلق',
    duration: 90,
    cycles: [
      { duration: 4, phase: 'شَهيق',  cue: 'امتلئي ببطء',  tone: 528 },
      { duration: 7, phase: 'احبسي',  cue: 'احفظي النَّفَس', tone: 528 },
      { duration: 8, phase: 'زفير',   cue: 'أطلقي ما ثَقُل', tone: 528 }
    ],
    color: 'plum',
    eyebrow: 'تنفّس ٤-٧-٨'
  },
  '420': {
    id: '420',
    title: '٧ دقائق',
    desc: 'انهيار عميق',
    duration: 420,
    cycles: [
      { duration: 6, phase: 'شَهيق', cue: 'امتلئي', tone: 432 },
      { duration: 2, phase: 'احبسي',  cue: 'لحظة',  tone: 432 },
      { duration: 8, phase: 'زفير',   cue: 'أطلقي', tone: 432 },
      { duration: 2, phase: 'سكون',   cue: 'كوني',  tone: null }
    ],
    color: 'teal',
    eyebrow: 'تنفس + سكون'
  }
};

// ===== Quick mood picker (compact) =====
const showMoodPicker = ({ title, sub, onPick, allowSkip = false }) => {
  const view = $('#rescue-hub');
  view.innerHTML = '';

  const wrap = el('div', { class: 'rescue-mood-wrap' },
    el('div', { class: 'rescue-mood-eyebrow' }, '✦  لحظة قبل البدء  ✦'),
    el('div', { class: 'rescue-mood-title' }, title),
    el('div', { class: 'rescue-mood-sub' }, sub),
    el('div', { class: 'mood-grid' },
      ...MOODS.map(m => el('button', {
        class: 'mood-chip mood-' + m.tone,
        onclick: () => { haptic([5]); onPick(m.id); }
      },
        el('div', { class: 'mood-emoji' }, m.emoji),
        el('div', { class: 'mood-label' }, m.label)
      ))
    ),
    allowSkip && el('button', {
      class: 'btn-text-link',
      onclick: () => onPick(null)
    }, 'تخطّي')
  );
  view.appendChild(wrap);
};

// ===== Active rescue session =====
let activeTimer = null;
let activeSessionId = null;

const startRescueRun = (protocolId, preMoodId) => {
  const proto = PROTOCOLS[protocolId];
  if (!proto) return;

  activeSessionId = startSession('rescue');

  const view = $('#rescue-hub');
  view.innerHTML = '';

  const cancelBtn = el('button', { class: 'rescue-cancel', onclick: stopRescueRun }, 'إنهاء');

  const phaseEl = el('div', { class: 'rescue-phase' }, proto.cycles[0].phase);
  const numEl = el('div', { class: 'rescue-num' }, toAR(proto.duration));
  const cueEl = el('div', { class: 'rescue-cue' }, proto.cycles[0].cue);

  const ring = el('div', { class: 'rescue-ring', html: `
    <svg viewBox="0 0 240 240">
      <circle class="bg" cx="120" cy="120" r="110"/>
      <circle class="fg" cx="120" cy="120" r="110" id="rescue-fg-d"/>
    </svg>
  ` });
  ring.appendChild(numEl);

  const wrap = el('div', { class: 'rescue-run rescue-color-' + proto.color },
    el('div', { class: 'rescue-eyebrow' }, proto.eyebrow),
    phaseEl,
    ring,
    cueEl,
    cancelBtn
  );
  view.appendChild(wrap);

  haptic([20, 50, 20]);
  if (proto.cycles[0].tone) playTone(proto.cycles[0].tone, 0.5);

  let totalSecond = 0;
  let cycleIdx = 0;
  let inCycleSec = proto.cycles[0].duration;

  const updateCycle = () => {
    const c = proto.cycles[cycleIdx];
    phaseEl.textContent = c.phase;
    cueEl.textContent = c.cue;
    inCycleSec = c.duration;
    if (c.tone) playTone(c.tone, 0.3);
    haptic([5]);
  };

  const fg = ring.querySelector('#rescue-fg-d');
  const circumference = 2 * Math.PI * 110;
  fg.style.strokeDasharray = circumference;
  fg.style.strokeDashoffset = 0;

  activeTimer = setInterval(() => {
    totalSecond++;
    const remaining = proto.duration - totalSecond;
    numEl.textContent = toAR(Math.max(0, remaining));
    fg.style.strokeDashoffset = circumference * (1 - totalSecond / proto.duration);

    inCycleSec--;
    if (inCycleSec <= 0) {
      cycleIdx = (cycleIdx + 1) % proto.cycles.length;
      updateCycle();
    }

    if (totalSecond >= proto.duration) {
      clearInterval(activeTimer);
      finishRescueRun(proto, preMoodId);
    }
  }, 1000);
};

const stopRescueRun = () => {
  clearInterval(activeTimer);
  activeTimer = null;
  // Don't save partial — go back to hub
  renderHub();
};

const finishRescueRun = (proto, preMoodId) => {
  haptic([30, 30, 30, 30, 100]);
  playTone(528, 0.8);
  setTimeout(() => playTone(660, 0.5), 200);

  // Save session
  const sessionId = completeSession('rescue', {
    protocolDuration: proto.duration,
    protocolId: proto.id
  });

  // If pre-mood was logged, ask post-mood
  if (preMoodId) {
    showMoodPicker({
      title: 'كيف تَشعرين الآن؟',
      sub: `بعد ${proto.title} من التنفس`,
      allowSkip: true,
      onPick: (postMoodId) => {
        if (preMoodId) logMood(preMoodId, 'pre-session', { sessionType: 'rescue', sessionId });
        if (postMoodId) logMood(postMoodId, 'post-session', { sessionType: 'rescue', sessionId });
        showCompletion(proto, preMoodId, postMoodId, sessionId);
      }
    });
  } else {
    showCompletion(proto, null, null, sessionId);
  }
};

const showCompletion = (proto, preMoodId, postMoodId, sessionId) => {
  const view = $('#rescue-hub');
  view.innerHTML = '';

  let liftMsg = null;
  if (preMoodId && postMoodId) {
    const pre = MOODS.find(m => m.id === preMoodId);
    const post = MOODS.find(m => m.id === postMoodId);
    const preScore = ['broken','sad','anxious','tired','neutral','calm','hopeful','grateful'].indexOf(pre.id);
    const postScore = ['broken','sad','anxious','tired','neutral','calm','hopeful','grateful'].indexOf(post.id);
    const lift = postScore - preScore;
    if (lift > 0) liftMsg = `هَدَأتِ ${toAR(lift)} درجة في ${proto.title}`;
    else if (lift === 0) liftMsg = 'مساحة صغيرة استَحَقَّتِها';
    else liftMsg = 'الشعور لم يخفّ بعد. خذي وقتكِ.';
  }

  const wrap = el('div', { class: 'rescue-complete' },
    el('div', { class: 'rescue-complete-gem' }, '✦'),
    el('div', { class: 'rescue-complete-eyebrow' }, 'تمّت اللحظة'),
    el('div', { class: 'rescue-complete-title' }, 'أحسنتِ'),
    liftMsg && el('div', { class: 'rescue-complete-lift' }, liftMsg),
    el('div', { class: 'rescue-complete-actions' },
      el('button', {
        class: 'btn btn-primary',
        onclick: () => renderHub()
      }, 'العودة'),
      el('button', {
        class: 'btn btn-ghost',
        onclick: () => startMoodPickerFor(proto.id)
      }, 'مرّة أخرى')
    )
  );
  view.appendChild(wrap);
};

// ===== Entry: pick a duration =====
export const renderHub = () => {
  // Lazy create the rescue-hub container
  let view = $('#rescue-hub');
  if (!view) return;

  view.innerHTML = '';

  const wrap = el('div', { class: 'rescue-hub' },
    el('button', {
      class: 'rescue-hub-back',
      onclick: closeHub,
      'aria-label': 'إغلاق'
    }, '✕'),
    el('div', { class: 'rescue-hub-eyebrow' }, '⚡  إنقاذ فوري  ⚡'),
    el('div', { class: 'rescue-hub-title' }, 'كم تحتاجين الآن؟'),
    el('div', { class: 'rescue-hub-sub' }, 'اختاري حسب شدّة اللحظة'),
    el('div', { class: 'rescue-options' },
      el('button', {
        class: 'rescue-option rescue-option-30',
        onclick: () => startMoodPickerFor('30')
      },
        el('div', { class: 'rescue-option-num' }, '٣٠'),
        el('div', { class: 'rescue-option-unit' }, 'ثانية'),
        el('div', { class: 'rescue-option-desc' }, 'الفزع الفوري'),
        el('div', { class: 'rescue-option-detail' }, 'موجة قصيرة — نَفَس واحد')
      ),
      el('button', {
        class: 'rescue-option rescue-option-90 highlighted',
        onclick: () => startMoodPickerFor('90')
      },
        el('div', { class: 'rescue-option-badge' }, 'الأشهر'),
        el('div', { class: 'rescue-option-num' }, '٩٠'),
        el('div', { class: 'rescue-option-unit' }, 'ثانية'),
        el('div', { class: 'rescue-option-desc' }, 'موجة قلق'),
        el('div', { class: 'rescue-option-detail' }, 'تنفّس ٤-٧-٨ — يهدّئ العصب الحائر')
      ),
      el('button', {
        class: 'rescue-option rescue-option-420',
        onclick: () => startMoodPickerFor('420')
      },
        el('div', { class: 'rescue-option-num' }, '٧'),
        el('div', { class: 'rescue-option-unit' }, 'دقائق'),
        el('div', { class: 'rescue-option-desc' }, 'انهيار عميق'),
        el('div', { class: 'rescue-option-detail' }, 'تنفس بطيء + سكون — يعيد ضبط الجهاز العصبي')
      )
    ),
    el('div', { class: 'rescue-hub-foot' },
      el('span', { html: '🔒' }),
      el('span', {}, 'كل بياناتكِ على جهازكِ. لا أحد يراها.')
    )
  );
  view.appendChild(wrap);
};

const startMoodPickerFor = (protocolId) => {
  showMoodPicker({
    title: 'قبل أن نبدأ',
    sub: 'كيف تشعرين الآن؟ ',
    allowSkip: true,
    onPick: (preMoodId) => {
      startRescueRun(protocolId, preMoodId);
    }
  });
};

// ===== Open / Close =====
export const openHub = () => {
  let view = $('#rescue-hub');
  if (!view) {
    view = el('div', { id: 'rescue-hub', class: 'rescue-hub-overlay' });
    document.body.appendChild(view);
  }
  view.classList.add('show');
  renderHub();
};

export const closeHub = () => {
  clearInterval(activeTimer);
  activeTimer = null;
  const view = $('#rescue-hub');
  view?.classList.remove('show');
};
