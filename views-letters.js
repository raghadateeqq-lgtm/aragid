/* ============================================================
   ARAGID — LETTERS (v2)
   Future-self letters with quota enforcement
   ============================================================ */

import { $, el, DB, toAR, arDate, toast, haptic, openModal, closeModal, escapeHTML, incrementSession,
         canUseFeature, trackFeatureUsage } from './core.js';
import { wisdom } from './data-wisdom.js';
import { showPaywall } from './views-pricing.js';

export const renderLetters = () => {
  const view = $('#view-letters');
  if (!view) return;
  view.innerHTML = '';

  const letters = DB.get('letters', []);
  const now = Date.now();

  view.appendChild(el('div', { class: 'view-header' },
    el('div', { class: 'view-eyebrow' }, '✉  رسائل من المستقبل  ✉'),
    el('div', { class: 'view-title' }, 'اكتبي لذاتكِ غداً'),
    el('div', { class: 'view-desc' }, 'الرسائل تُختم وتُفتح في الوقت الذي تختارينه — يوم، أسبوع، شهر، أو سنة.')
  ));

  view.appendChild(el('button', {
    class: 'btn btn-primary btn-block',
    style: { marginBottom: '24px' },
    onclick: openCompose
  }, '✎  اكتبي رسالة جديدة'));

  if (letters.length === 0) {
    view.appendChild(el('div', { class: 'empty-state empty-state-rich' },
      el('div', { class: 'empty-gem' }, '✉'),
      el('div', { class: 'empty-title' }, 'لا توجد رسائل بعد'),
      el('div', { class: 'empty-desc' },
        'اكتبي أول رسالة لذاتكِ المستقبلية. ',
        'ستُفاجَئين بما تجدين فيها لاحقاً.'
      )
    ));
    return;
  }

  const readyToOpen = letters.filter(l => now >= new Date(l.openAt).getTime());
  const sealed = letters.filter(l => now < new Date(l.openAt).getTime());

  if (readyToOpen.length > 0) {
    view.appendChild(el('div', { class: 'section-title' }, 'مُتاحة الآن'));
    const grid = el('div', { class: 'letters-grid' });
    readyToOpen.forEach(l => grid.appendChild(buildLetterCard(l, true)));
    view.appendChild(grid);
  }

  if (sealed.length > 0) {
    view.appendChild(el('div', { class: 'section-title', style: { marginTop: '24px' } }, 'مُختومة'));
    const grid = el('div', { class: 'letters-grid' });
    sealed.forEach(l => grid.appendChild(buildLetterCard(l, false)));
    view.appendChild(grid);
  }
};

const buildLetterCard = (letter, ready) => {
  return el('div', {
    class: 'envelope-card',
    onclick: () => openLetter(letter, ready)
  },
    el('div', { class: 'envelope-meta' },
      el('div', { class: 'envelope-eyebrow' }, ready ? 'افتحيها الآن' : 'مُختومة'),
      el('div', { class: 'envelope-title' }, ready
        ? 'رسالة لكِ'
        : `تُفتح في ${arDate(letter.openAt)}`
      ),
      el('div', { class: 'envelope-date' }, `كُتبت في ${arDate(letter.writtenAt)}`)
    ),
    !ready && el('div', { class: 'envelope-seal' }, 'أ')
  );
};

const openLetter = (letter, ready) => {
  if (!ready) {
    const remaining = Math.ceil((new Date(letter.openAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    toast(`هذه الرسالة تُفتح بعد ${toAR(remaining)} يوم`, 'warning');
    return;
  }

  const content = el('div', {},
    el('div', { class: 'archive-detail-head' },
      el('div', { style: { fontSize: '36px', marginBottom: '12px' } }, '✉'),
      el('div', { class: 'archive-detail-eyebrow' }, 'رسالة من ذاتكِ السابقة'),
      el('div', { class: 'archive-detail-date' }, `كُتبت في ${arDate(letter.writtenAt)}`)
    ),
    el('div', { class: 'paper paper-static' },
      el('div', {
        class: 'paper-content',
        html: escapeHTML(letter.text).replace(/\n/g, '<br>')
      })
    ),
    el('button', {
      class: 'btn btn-primary btn-block',
      style: { marginTop: '20px' },
      onclick: closeModal
    }, 'احتفظي بها معكِ')
  );
  openModal(content);
};

const openCompose = () => {
  // Quota check
  const quota = canUseFeature('letters');
  if (!quota.ok) {
    showPaywall('letters', quota.reason);
    return;
  }

  let selectedDelivery = 7;
  let composeText = '';

  const promptChips = el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' } },
    ...wisdom.letterPrompts.map(p =>
      el('button', {
        class: 'chip',
        onclick: () => {
          const textarea = $('#compose-textarea');
          if (textarea) {
            textarea.value = `${p}\n\n`;
            composeText = textarea.value;
            textarea.focus();
          }
        }
      }, p)
    )
  );

  const deliveryOpts = el('div', { class: 'delivery-options' },
    ...[
      { val: 1, num: '١', unit: 'يوم' },
      { val: 7, num: '٧', unit: 'أيام' },
      { val: 30, num: '٣٠', unit: 'يوم' },
      { val: 365, num: '٣٦٥', unit: 'يوم' }
    ].map(o => {
      const opt = el('div', {
        class: 'delivery-option' + (o.val === 7 ? ' active' : ''),
        'data-days': o.val
      },
        el('div', { class: 'delivery-num' }, o.num),
        el('div', { class: 'delivery-unit' }, o.unit)
      );
      opt.addEventListener('click', () => {
        document.querySelectorAll('.delivery-option').forEach(d => d.classList.remove('active'));
        opt.classList.add('active');
        selectedDelivery = o.val;
        haptic([5]);
      });
      return opt;
    })
  );

  const content = el('div', {},
    el('div', { style: { textAlign: 'center', marginBottom: '20px' } },
      el('div', { style: { fontSize: '36px', marginBottom: '12px' } }, '✎'),
      el('h2', { class: 'modal-title', style: { textAlign: 'center' } }, 'رسالة لذاتكِ المستقبلية')
    ),
    el('div', { style: { fontSize: '12px', color: 'var(--gold-400)', letterSpacing: '3px', marginBottom: '8px' } }, 'إلهامات للبدء'),
    promptChips,
    el('div', { class: 'compose-letter' },
      el('textarea', {
        class: 'compose-textarea',
        id: 'compose-textarea',
        placeholder: 'عزيزتي، أريد أن أقول لكِ...',
        oninput: (e) => { composeText = e.target.value; }
      })
    ),
    el('div', { style: { fontSize: '12px', color: 'var(--gold-400)', letterSpacing: '3px', marginBottom: '8px', marginTop: '20px' } }, 'متى تريدين فتحها؟'),
    deliveryOpts,
    el('div', { class: 'modal-actions' },
      el('button', {
        class: 'btn btn-primary',
        onclick: () => sealLetter(composeText, selectedDelivery)
      }, 'اختمي الرسالة'),
      el('button', { class: 'btn btn-ghost', onclick: closeModal }, 'إلغاء')
    )
  );
  openModal(content);
};

const sealLetter = (text, days) => {
  if (!text || !text.trim()) {
    toast('اكتبي رسالتكِ أولاً', 'warning');
    return;
  }
  const letters = DB.get('letters', []);
  const now = new Date();
  const openAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  letters.unshift({
    id: Date.now(),
    text: text.trim(),
    writtenAt: now.toISOString(),
    openAt: openAt.toISOString(),
    sealed: true
  });
  DB.set('letters', letters);
  trackFeatureUsage('letters');
  incrementSession('letter');
  haptic([20, 40, 20]);
  closeModal();
  toast(`رسالتكِ مَختومة — تُفتح بعد ${toAR(days)} يوم`, 'success', 3500);
  renderLetters();
};
