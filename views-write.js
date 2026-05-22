/* ============================================================
   ARAGID — VIEW: WRITE (v2)
   Sacred page + pre/post mood + first-session celebration
   ============================================================ */

import { $, el, DB, toast, haptic, countWords, pickOne, addFlower, startSession, completeSession,
         openModal, closeModal, router, toAR, escapeHTML } from './core.js';
import { wisdom } from './data-wisdom.js';
import { MOODS, getMood, logMood, computeLift } from './mood-system.js';
import { buildLiftCard, downloadCanvas, shareCanvas } from './share-card.js';

let saveTimer = null;
let currentText = '';
let currentSessionId = null;
let preMoodId = null;

const DRAFT_KEY = 'write_draft';
const FOCUS_KEY = 'write_focus_mode';

export const renderWrite = () => {
  const view = $('#view-write');
  if (!view) return;
  view.innerHTML = '';

  const draft = DB.get(DRAFT_KEY, '');
  currentText = draft;

  // Header
  view.appendChild(el('div', { class: 'write-header' },
    el('div', { class: 'write-eyebrow' }, 'مساحتكِ الخاصة'),
    el('div', { class: 'write-title' }, 'فضفضة')
  ));

  // Meta
  view.appendChild(el('div', { class: 'write-meta' },
    el('div', { class: 'word-count', id: 'word-count' }, `${toAR(countWords(draft))} كلمة`),
    el('div', { class: 'privacy-note' },
      el('span', { html: '🔒' }),
      el('span', {}, 'محفوظ على جهازكِ فقط')
    )
  ));

  // Paper
  const paper = el('div', { class: 'paper' },
    el('textarea', {
      class: 'paper-textarea',
      id: 'paper-textarea',
      placeholder: 'اكتبي ما لا يُقال...',
      oninput: (e) => {
        currentText = e.target.value;
        const wc = $('#word-count');
        if (wc) wc.textContent = `${toAR(countWords(currentText))} كلمة`;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => { DB.set(DRAFT_KEY, currentText); }, 800);
      }
    }, draft)
  );
  view.appendChild(paper);

  // Actions
  view.appendChild(el('div', { class: 'write-actions' },
    el('button', {
      class: 'btn btn-primary btn-block',
      onclick: () => closeWriting()
    }, 'أغلقي وَأَزرعي زهرة ✦'),
    el('button', {
      class: 'btn btn-ghost btn-icon-only',
      title: 'وضع التركيز',
      onclick: toggleFocusMode
    }, '◐'),
    el('button', {
      class: 'btn btn-ghost btn-icon-only',
      onclick: () => {
        if (confirm('تَجاهلي ما كتبتِ؟')) {
          DB.remove(DRAFT_KEY);
          const ta = $('#paper-textarea');
          if (ta) ta.value = '';
          currentText = '';
          $('#word-count').textContent = `${toAR(0)} كلمة`;
          toast('بدأتِ صفحة جديدة');
        }
      }
    }, '↻')
  ));

  // Prompts
  view.appendChild(el('div', { class: 'write-prompts' },
    el('h4', {}, '✦ إلهامات للبدء'),
    el('div', { class: 'write-prompts-list' },
      ...wisdom.writingPrompts.slice(0, 8).map(p =>
        el('button', { class: 'write-prompt-chip', onclick: () => insertPrompt(p) }, p)
      )
    )
  ));

  // Restore focus mode if was active
  if (DB.get(FOCUS_KEY, false)) document.body.classList.add('focus-mode');
};

const toggleFocusMode = () => {
  const active = !DB.get(FOCUS_KEY, false);
  DB.set(FOCUS_KEY, active);
  document.body.classList.toggle('focus-mode', active);
  haptic([5]);
  toast(active ? 'وضع التركيز مُفعَّل' : 'وضع التركيز مُلغى');
};

const insertPrompt = (prompt) => {
  const textarea = $('#paper-textarea');
  if (!textarea) return;
  const current = textarea.value;
  const newText = current ? `${current}\n\n${prompt}\n` : `${prompt}\n`;
  textarea.value = newText;
  currentText = newText;
  DB.set(DRAFT_KEY, newText);
  $('#word-count').textContent = `${toAR(countWords(newText))} كلمة`;
  textarea.focus();
  textarea.setSelectionRange(newText.length, newText.length);
};

// ===== Close writing flow with mood capture =====
const closeWriting = () => {
  if (!currentText.trim()) {
    toast('اكتبي شيئاً أولاً', 'warning');
    return;
  }
  // Ask post-mood first
  askPostMood();
};

const askPostMood = () => {
  const content = el('div', { class: 'post-mood-modal' },
    el('div', { style: { textAlign: 'center', marginBottom: '16px' } },
      el('div', { style: { fontSize: '36px', color: 'var(--gold-300)' } }, '✦'),
      el('div', { style: { fontSize: '11px', color: 'var(--gold-400)', letterSpacing: '6px', marginTop: '8px' } }, 'بعد الكتابة')
    ),
    el('h3', { class: 'post-mood-title' }, 'كيف تَشعرين الآن؟'),
    el('div', { class: 'mood-grid' },
      ...MOODS.map(m => el('button', {
        class: 'mood-chip mood-' + m.tone,
        onclick: () => { haptic([5]); closeModal(); finalizeWriting(m.id); }
      },
        el('div', { class: 'mood-emoji' }, m.emoji),
        el('div', { class: 'mood-label' }, m.label)
      ))
    ),
    el('button', {
      class: 'btn-text-link',
      onclick: () => { closeModal(); finalizeWriting(null); }
    }, 'تخطّي')
  );
  openModal(content);
};

const finalizeWriting = (postMoodId) => {
  haptic([15, 30, 15]);

  // Try to find pre-mood from today (last logged before this session)
  const sessionId = startSession('write');
  const archive = DB.get('archive', []);
  const isFirstWrite = archive.filter(a => a.type === 'write').length === 0;

  // Log mood
  if (postMoodId) {
    logMood(postMoodId, 'post-session', { sessionType: 'write', sessionId });
  }

  // Archive
  archive.unshift({
    id: Date.now(),
    sessionId,
    type: 'write',
    text: currentText,
    wordCount: countWords(currentText),
    postMoodId,
    timestamp: new Date().toISOString()
  });
  DB.set('archive', archive.slice(0, 500));

  // Add flower (variant by mood)
  const flowerTypes = ['rose', 'tulip', 'daisy', 'lotus', 'bloom'];
  addFlower(pickOne(flowerTypes), { sessionId });

  completeSession('write', { wordCount: countWords(currentText) });
  DB.remove(DRAFT_KEY);
  const savedText = currentText;
  currentText = '';

  // Show celebration
  showCelebration({ savedText, postMoodId, isFirstWrite });
};

const showCelebration = ({ savedText, postMoodId, isFirstWrite }) => {
  const closingQuote = pickOne(wisdom.closing);
  const wordCount = countWords(savedText);

  const content = el('div', { class: 'celebration' },
    el('div', { class: 'celebration-confetti' }, '✦  ✦  ✦'),
    isFirstWrite
      ? el('div', { class: 'celebration-eyebrow' }, 'جلستكِ الأولى — لحظة فاصلة')
      : el('div', { class: 'celebration-eyebrow' }, 'زَرَعتِ زهرة'),
    el('div', { class: 'celebration-gem' }, '✿'),
    el('h2', { class: 'celebration-title' },
      isFirstWrite ? 'بدأتِ رحلتكِ' : 'كَلِماتكِ في أمان'
    ),
    el('div', { class: 'celebration-stat' },
      el('span', { class: 'celebration-stat-num' }, toAR(wordCount)),
      el('span', { class: 'celebration-stat-label' }, 'كلمة مَنحتيها لنفسكِ')
    ),
    el('p', { class: 'celebration-quote' }, closingQuote),
    el('div', { class: 'celebration-actions' },
      el('button', {
        class: 'btn btn-primary',
        onclick: () => { closeModal(); router.go('garden'); }
      }, isFirstWrite ? 'اِرَوي حديقتكِ' : 'حديقتكِ'),
      el('button', { class: 'btn btn-ghost', onclick: () => { closeModal(); router.go('home'); } }, 'الرئيسية')
    )
  );

  openModal(content, { size: 'md' });
  renderWrite();
};
