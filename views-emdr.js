/* ============================================================
   ARAGID — VIEW: EMDR
   Bilateral visual stimulation (Self-help inspired)
   ============================================================ */

import { $, el, DB, toAR, toast, haptic, playTone, incrementSession } from './core.js';

let emdrTimer = null;
let emdrStartTime = null;
let emdrSeconds = 0;
let emdrRunning = false;

export const renderEMDR = () => {
  const view = $('#view-emdr');
  if (!view) return;

  view.innerHTML = '';

  // Header
  const header = el('div', {},
    el('div', { class: 'emdr-eyebrow' }, '◐  تأرجح بصري  ◐'),
    el('div', { class: 'emdr-title' }, 'EMDR ذاتي'),
    el('div', { class: 'emdr-sub' }, 'تابعي الكرة بعينيكِ — لا تحركي رأسكِ')
  );
  view.appendChild(header);

  // Track
  const track = el('div', { class: 'emdr-track' },
    el('div', { class: 'emdr-track-line' }),
    el('div', { class: 'emdr-anchor-left' }),
    el('div', { class: 'emdr-anchor-right' }),
    el('div', { class: 'emdr-ball', id: 'emdr-ball' })
  );
  view.appendChild(track);

  // Speed control
  const currentSpeed = DB.get('emdr_speed', 2.5);
  const speedRow = el('div', { class: 'emdr-controls' },
    el('button', {
      class: 'chip',
      onclick: () => setSpeed(3.5),
      id: 'speed-slow'
    }, 'بطيء'),
    el('button', {
      class: 'chip',
      onclick: () => setSpeed(2.5),
      id: 'speed-medium'
    }, 'متوسط'),
    el('button', {
      class: 'chip',
      onclick: () => setSpeed(1.5),
      id: 'speed-fast'
    }, 'سريع')
  );
  view.appendChild(speedRow);

  // Main play/stop
  const playRow = el('div', { class: 'emdr-controls' },
    el('button', {
      class: 'btn btn-primary btn-lg',
      id: 'emdr-toggle',
      onclick: toggleEMDR
    }, 'ابدئي')
  );
  view.appendChild(playRow);

  // Stats
  const stats = el('div', { class: 'emdr-stats' },
    el('div', { class: 'emdr-stat' },
      el('div', { class: 'emdr-stat-num', id: 'emdr-time' }, '٠:٠٠'),
      el('div', { class: 'emdr-stat-label' }, 'المدّة')
    ),
    el('div', { class: 'emdr-stat-divider' }),
    el('div', { class: 'emdr-stat' },
      el('div', { class: 'emdr-stat-num' }, toAR(DB.get('emdr_total_sessions', 0))),
      el('div', { class: 'emdr-stat-label' }, 'جلساتكِ')
    )
  );
  view.appendChild(stats);

  // Warning
  const warning = el('div', { class: 'emdr-warning' },
    el('b', {}, '⚠ ملاحظة مهمة'),
    'هذا التمرين مُلهَم من تقنية EMDR، لكنه ليس بديلاً عن جلسة علاجية مع مختص. إن كنتِ تعانين من صدمة نفسية شديدة، يُنصح بمراجعة معالج مرخّص.'
  );
  view.appendChild(warning);

  // Set initial speed UI
  setSpeed(currentSpeed, false);
};

const setSpeed = (speed, save = true) => {
  document.documentElement.style.setProperty('--emdr-speed', speed + 's');

  $('#speed-slow')?.classList.toggle('active', speed === 3.5);
  $('#speed-medium')?.classList.toggle('active', speed === 2.5);
  $('#speed-fast')?.classList.toggle('active', speed === 1.5);

  if (save) {
    DB.set('emdr_speed', speed);
    haptic([5]);
  }
};

const toggleEMDR = () => {
  if (emdrRunning) {
    stopEMDR();
  } else {
    startEMDR();
  }
};

const startEMDR = () => {
  const ball = $('#emdr-ball');
  const toggleBtn = $('#emdr-toggle');
  if (!ball || !toggleBtn) return;

  emdrRunning = true;
  emdrStartTime = Date.now();
  emdrSeconds = 0;

  ball.classList.add('running');
  toggleBtn.textContent = 'أوقفي';
  toggleBtn.className = 'btn btn-secondary btn-lg';

  haptic([10, 50, 10]);
  playTone(528, 0.4);

  // Update timer
  emdrTimer = setInterval(() => {
    emdrSeconds = Math.floor((Date.now() - emdrStartTime) / 1000);
    const min = Math.floor(emdrSeconds / 60);
    const sec = emdrSeconds % 60;
    const display = `${toAR(min)}:${toAR(String(sec).padStart(2, '0'))}`;
    const timeEl = $('#emdr-time');
    if (timeEl) timeEl.textContent = display;

    // Auto-suggest stop after 5 minutes
    if (emdrSeconds === 300) {
      toast('٥ دقائق ممتازة. خذي استراحة الآن.', 'success', 4000);
    }
  }, 1000);
};

const stopEMDR = () => {
  const ball = $('#emdr-ball');
  const toggleBtn = $('#emdr-toggle');
  if (!ball || !toggleBtn) return;

  emdrRunning = false;
  ball.classList.remove('running');
  toggleBtn.textContent = 'ابدئي';
  toggleBtn.className = 'btn btn-primary btn-lg';

  clearInterval(emdrTimer);

  if (emdrSeconds >= 30) {
    // Save session
    const total = DB.get('emdr_total_sessions', 0) + 1;
    DB.set('emdr_total_sessions', total);

    const sessions = DB.get('emdr_sessions', []);
    sessions.unshift({
      id: Date.now(),
      duration: emdrSeconds,
      timestamp: new Date().toISOString()
    });
    DB.set('emdr_sessions', sessions.slice(0, 100));

    incrementSession('emdr');
    haptic([30, 50, 30]);
    playTone(528, 0.6);

    const minutes = Math.floor(emdrSeconds / 60);
    if (minutes >= 1) {
      toast(`أحسنتِ. ${toAR(minutes)} دقيقة من التهدئة`, 'success');
    } else {
      toast('شكراً لكِ على المحاولة', 'success');
    }
  }

  emdrSeconds = 0;
  setTimeout(() => {
    const timeEl = $('#emdr-time');
    if (timeEl) timeEl.textContent = '٠:٠٠';
  }, 1000);
};

// Stop on view change
window.addEventListener('beforeunload', () => {
  if (emdrRunning) stopEMDR();
});
