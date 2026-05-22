/* ============================================================
   ARAGID — MAIN APPLICATION (v2)
   Bootstrap, Router, Rescue Hub, Onboarding, Install
   ============================================================ */

import { $, $$, el, DB, state, toast, haptic, playTone, router, openModal, closeModal,
         initParticles, toAR, runMigrations } from './core.js';
import { injectSVGDefs } from './svg-defs.js';
import { logMood, MOODS } from './mood-system.js';

import { renderHome }    from './views-home.js';
import { renderNada }    from './views-nada.js';
import { renderWrite }   from './views-write.js';
import { renderGarden }  from './views-garden.js';
import { renderEMDR }    from './views-emdr.js';
import { renderLetters } from './views-letters.js';
import { renderInsights } from './views-insights.js';
import { renderProtocols, renderArchive, renderStories, renderToolkit, renderSettings } from './views-other.js';
import { renderPricing } from './views-pricing.js';
import { openHub as openRescueHub } from './views-rescue.js';

// ============================================================
// VIEW HANDLERS
// ============================================================
window.viewHandlers = {
  home: renderHome,
  nada: renderNada,
  write: renderWrite,
  garden: renderGarden,
  emdr: renderEMDR,
  letters: renderLetters,
  protocols: renderProtocols,
  archive: renderArchive,
  stories: renderStories,
  toolkit: renderToolkit,
  insights: renderInsights,
  settings: renderSettings,
  pricing: renderPricing
};

// ============================================================
// SERVICE WORKER
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      // Auto-update when new SW available
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available — quietly upgrade on next nav
            nw.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(err => console.warn('[SW] registration failed:', err));
  });
}

// ============================================================
// ONLINE / OFFLINE
// ============================================================
const updateOnlineStatus = () => {
  const bar = $('#offlineBar');
  if (!bar) return;
  if (navigator.onLine) bar.classList.remove('show');
  else {
    bar.textContent = '⚠ بلا اتصال — التطبيق يعمل بكل ميزاته';
    bar.classList.add('show');
  }
};
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// ============================================================
// ONBOARDING (v2 — measures mood baseline + sells value)
// ============================================================
const showOnboarding = () => {
  const ob = $('#onboarding');
  if (!ob) return;
  ob.classList.remove('hidden');

  let step = 0;
  const answers = {};

  const steps = [
    {
      type: 'value',
      eyebrow: '✦  مرحباً  ✦',
      title: 'مساحتكِ الخاصة',
      desc: 'أراغيد ليست تطبيق "مزاج". هي نظام يومي لإعادة ضبط عاطفي — يَعرفكِ بالتدريج، ويُساعدكِ على فهم نفسكِ.',
      bullets: [
        { icon: '🔒', text: 'كل ما تَكتبينه يبقى على جهازكِ فقط' },
        { icon: '⚡', text: 'إنقاذ فوري لِلحظات الصعبة' },
        { icon: '📊', text: 'أنماط حقيقية تَكتشفينها مع الوقت' }
      ]
    },
    {
      type: 'input',
      eyebrow: 'لنبدأ',
      title: 'كيف تُحبّين أن تُنادى؟',
      desc: 'اختاري اسماً أو لقباً يُشبهكِ — اِتركيه فارغاً إن أحببتِ.',
      placeholder: 'اسمكِ أو لقبكِ',
      key: 'name'
    },
    {
      type: 'mood',
      eyebrow: 'لحظة',
      title: 'كيف تَشعرين الآن؟',
      desc: 'أساس صادق نَنطلق منه. ستَرين كيف يتغيّر هذا مع الوقت.',
      key: 'baselineMood'
    },
    {
      type: 'multiselect',
      eyebrow: 'سؤال',
      title: 'ما الذي يَثقُل عليكِ هذه الأيام؟',
      desc: 'اختاري واحدة أو أكثر — يُساعدنا في تَخصيص ما يَظهر لكِ.',
      options: ['تفكير مُفرط', 'صعوبة النوم', 'إرهاق عاطفي', 'وحدة', 'ضغط من المحيط', 'علاقات صعبة', 'لا أعرف بالضبط'],
      key: 'concerns'
    },
    {
      type: 'select',
      eyebrow: 'متى',
      title: 'متى يكون وقتكِ المُريح؟',
      desc: 'لِنُذكِّركِ بلطف — أو لا نُذكِّركِ أبداً.',
      options: ['الصباح الباكر', 'وسط النهار', 'المساء', 'قبل النوم', 'لا أحبّ التذكيرات'],
      key: 'reminderTime'
    },
    {
      type: 'done',
      eyebrow: '✦  تمّ',
      title: 'كل شيء جاهز',
      desc: 'أراغيد مساحتكِ الآن. ابدئي بأول جلسة — ٧ دقائق فقط.'
    }
  ];

  const render = () => {
    const s = steps[step];
    ob.innerHTML = '';

    const dots = el('div', { class: 'ob-progress' });
    steps.forEach((_, i) => {
      dots.appendChild(el('div', {
        class: 'ob-dot' + (i < step ? ' done' : i === step ? ' active' : '')
      }));
    });
    ob.appendChild(dots);

    const content = el('div', { class: 'ob-content' },
      el('div', { class: 'ob-eyebrow' }, s.eyebrow),
      el('div', { class: 'ob-title' }, s.title),
      el('div', { class: 'ob-desc' }, s.desc)
    );

    if (s.type === 'value') {
      content.appendChild(el('div', { class: 'ob-bullets' },
        ...s.bullets.map(b => el('div', { class: 'ob-bullet' },
          el('div', { class: 'ob-bullet-icon' }, b.icon),
          el('div', { class: 'ob-bullet-text' }, b.text)
        ))
      ));
    } else if (s.type === 'input') {
      const input = el('input', {
        class: 'field',
        placeholder: s.placeholder,
        value: answers[s.key] || '',
        oninput: (e) => { answers[s.key] = e.target.value; }
      });
      content.appendChild(input);
      setTimeout(() => input.focus(), 100);
    } else if (s.type === 'mood') {
      content.appendChild(el('div', { class: 'mood-grid' },
        ...MOODS.map(m => el('button', {
          class: 'mood-chip mood-' + m.tone + (answers[s.key] === m.id ? ' selected' : ''),
          onclick: (e) => {
            answers[s.key] = m.id;
            content.querySelectorAll('.mood-chip').forEach(c => c.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            haptic([5]);
          }
        },
          el('div', { class: 'mood-emoji' }, m.emoji),
          el('div', { class: 'mood-label' }, m.label)
        ))
      ));
    } else if (s.type === 'multiselect') {
      answers[s.key] = answers[s.key] || [];
      const opts = el('div', { class: 'ob-options' });
      s.options.forEach(opt => {
        const isSel = answers[s.key].includes(opt);
        const optEl = el('button', {
          class: 'ob-option' + (isSel ? ' selected' : ''),
          onclick: (e) => {
            const idx = answers[s.key].indexOf(opt);
            if (idx > -1) answers[s.key].splice(idx, 1);
            else answers[s.key].push(opt);
            e.currentTarget.classList.toggle('selected');
            haptic([5]);
          }
        }, opt);
        opts.appendChild(optEl);
      });
      content.appendChild(opts);
    } else if (s.type === 'select') {
      const opts = el('div', { class: 'ob-options' });
      s.options.forEach(opt => {
        const optEl = el('button', {
          class: 'ob-option' + (answers[s.key] === opt ? ' selected' : ''),
          onclick: (e) => {
            answers[s.key] = opt;
            opts.querySelectorAll('.ob-option').forEach(o => o.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            haptic([5]);
          }
        }, opt);
        opts.appendChild(optEl);
      });
      content.appendChild(opts);
    } else if (s.type === 'done') {
      content.appendChild(el('div', { class: 'ob-done-gem' }, '✦'));
    }

    ob.appendChild(content);

    const footer = el('div', { class: 'ob-footer' },
      step > 0
        ? el('button', { class: 'ob-skip', onclick: () => { step--; render(); } }, 'السابق')
        : el('div', { class: 'ob-spacer' }),
      el('button', {
        class: 'btn btn-primary ob-next',
        onclick: () => {
          haptic([10]);
          if (step < steps.length - 1) { step++; render(); }
          else {
            // Save profile
            DB.set('profile', {
              name: answers.name || '',
              concerns: answers.concerns || [],
              reminderTime: answers.reminderTime || ''
            });
            DB.set('profileCreatedAt', new Date().toISOString());
            DB.set('onboardingComplete', true);
            // Log baseline mood
            if (answers.baselineMood) {
              logMood(answers.baselineMood, 'onboarding');
            }
            ob.classList.add('hidden');
            initApp();
          }
        }
      }, step === steps.length - 1 ? 'ابدئي رحلتكِ' : 'التالي')
    );
    ob.appendChild(footer);
  };

  render();
};

// ============================================================
// THRESHOLD
// ============================================================
const setupThreshold = () => {
  const threshold = $('#threshold');
  const enterBtn = $('#thrEnter');
  if (!threshold || !enterBtn) return;

  const enter = () => {
    threshold.classList.add('exit');
    haptic([20]);
    playTone(528, 0.5);
    setTimeout(() => {
      threshold.style.display = 'none';
      if (!DB.get('onboardingComplete', false)) showOnboarding();
      else initApp();
    }, 800);
  };

  enterBtn.addEventListener('click', enter);

  if (DB.get('returningUser', false)) {
    threshold.style.display = 'none';
    if (!DB.get('onboardingComplete', false)) showOnboarding();
    else initApp();
  } else {
    DB.set('returningUser', true);
  }
};

// ============================================================
// INIT APP
// ============================================================
const initApp = () => {
  state.init();
  initParticles();

  if (state.dnd) $('#dndBanner')?.classList.add('show');

  const lastView = DB.get('lastView', 'home');
  router.go(lastView in window.viewHandlers ? lastView : 'home');

  updateOnlineStatus();
};

// ============================================================
// NAVIGATION
// ============================================================
const setupNavigation = () => {
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.go;
      if (target) {
        haptic([5]);
        router.go(target);
        $('#moreMenu')?.classList.add('hidden');
      } else if (btn.hasAttribute('data-more')) {
        haptic([5]);
        $('#moreMenu')?.classList.toggle('hidden');
      }
    });
  });

  $$('.more-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.go;
      if (target) {
        router.go(target);
        $('#moreMenu')?.classList.add('hidden');
        haptic([5]);
      }
    });
  });

  $('#moreMenu')?.addEventListener('click', (e) => {
    if (e.target.id === 'moreMenu') $('#moreMenu').classList.add('hidden');
  });

  // ESC to close menus/modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $('#moreMenu')?.classList.add('hidden');
      closeModal();
    }
  });
};

// ============================================================
// TOP BAR
// ============================================================
const setupTopBar = () => {
  const ambBtn = $('#ambBtn');
  if (ambBtn) {
    if (state.ambience) ambBtn.classList.add('active');
    ambBtn.addEventListener('click', () => {
      state.ambience = !state.ambience;
      DB.set('ambience', state.ambience);
      ambBtn.classList.toggle('active', state.ambience);
      haptic([5]);
      toast(state.ambience ? 'الأجواء مُفَعَّلة' : 'الأجواء مَكتومة');
    });
  }

  const dndBtn = $('#dndBtn');
  if (dndBtn) {
    if (state.dnd) dndBtn.classList.add('active');
    dndBtn.addEventListener('click', () => {
      state.dnd = !state.dnd;
      DB.set('dnd', state.dnd);
      dndBtn.classList.toggle('active', state.dnd);
      $('#dndBanner')?.classList.toggle('show', state.dnd);
      toast(state.dnd ? 'وضع الهدوء مُفَعَّل' : 'وضع الهدوء مُلغى');
    });
  }

  $('#dndDisable')?.addEventListener('click', () => {
    state.dnd = false;
    DB.set('dnd', false);
    $('#dndBtn')?.classList.remove('active');
    $('#dndBanner')?.classList.remove('show');
  });
};

// ============================================================
// MODAL
// ============================================================
const setupModal = () => {
  $('#modalClose')?.addEventListener('click', closeModal);
  $('#modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
};

// ============================================================
// RESCUE FAB → HUB (3 durations)
// ============================================================
const setupRescue = () => {
  $('#rescueFab')?.addEventListener('click', () => {
    haptic([20, 40, 20]);
    playTone(528, 0.3);
    openRescueHub();
  });
};

// ============================================================
// INSTALL PROMPT
// ============================================================
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!DB.get('installDismissed', false)) {
    setTimeout(() => $('#installPrompt')?.classList.add('show'), 30000);
  }
});

const setupInstallPrompt = () => {
  $('#ipInstall')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') toast('تم تثبيت أراغيد', 'success');
    deferredPrompt = null;
    $('#installPrompt')?.classList.remove('show');
  });
  $('#ipDismiss')?.addEventListener('click', () => {
    DB.set('installDismissed', true);
    $('#installPrompt')?.classList.remove('show');
  });
};

// ============================================================
// BOOTSTRAP
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  runMigrations();
  injectSVGDefs();
  setupThreshold();
  setupNavigation();
  setupTopBar();
  setupModal();
  setupRescue();
  setupInstallPrompt();

  console.log('✦ أراغيد ٢.٠ جاهزة ✦');
});
