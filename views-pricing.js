/* ============================================================
   ARAGID — PRICING / PAYWALL
   شاشة القيمة + الاشتراك
   ============================================================ */

import { $, el, DB, toast, haptic, openModal, closeModal, router, isPremium, toAR } from './core.js';

const PLANS = [
  {
    id: 'monthly',
    label: 'شهري',
    price: '٢٩ ر.س',
    perMonth: '٢٩',
    note: 'يتجدّد كل ٣٠ يوم',
    save: null
  },
  {
    id: 'yearly',
    label: 'سنوي',
    price: '٢٤٠ ر.س',
    perMonth: '٢٠',
    note: 'بدلاً من ٣٤٨ — وفّري ٣٠٪',
    save: 'الأوفر',
    recommended: true
  },
  {
    id: 'lifetime',
    label: 'مدى الحياة',
    price: '٧٤٩ ر.س',
    perMonth: null,
    note: 'دفعة واحدة، للأبد',
    save: 'استثمار'
  }
];

const FREE_INCLUDES = [
  'الكتابة المقدّسة (٣ جلسات/أسبوع)',
  'إنقاذ ٩٠ — تنفس ٤-٧-٨',
  'بروتوكولات إنقاذ (٨)',
  '٣ رسائل من المستقبل',
  'الحديقة الذهنية',
  '٢٥ حكمة يومية'
];

const PREMIUM_UNLOCKS = [
  { icon: '✦', title: 'كتابة بدون حدود', desc: 'جلسات لا نهائية، حفظ كامل بدون تقييد' },
  { icon: '💬', title: 'ندى الذكية بسعة كاملة', desc: 'محادثات بلا حدود + ذاكرة لجلساتكِ السابقة' },
  { icon: '⚡', title: 'إنقاذ ٧ دقائق + EMDR موسّع', desc: 'بروتوكولات أعمق للانهيار الشديد' },
  { icon: '✉', title: 'رسائل لا محدودة', desc: 'اكتبي لذاتكِ بعد سنة، ٥ سنوات، ١٠' },
  { icon: '📊', title: 'تقاريركِ الأسبوعية + الشهرية', desc: 'أنماط، اكتشافات، رسومات قابلة للمشاركة' },
  { icon: '🎴', title: 'بطاقات شخصية مشتركة', desc: 'تصدير لحظاتكِ كصور لشبكاتكِ' },
  { icon: '🌙', title: 'طقس الشهر الكامل', desc: 'رسالة إعادة ضبط شهرية — وداع للشهر وبداية للقادم' },
  { icon: '🔓', title: 'كل البروتوكولات الجديدة', desc: 'محتوى يُضاف شهرياً، لكِ بدون تكلفة إضافية' }
];

const TESTIMONIALS = [
  {
    text: 'أول تطبيق يفهم أن المرأة تحتاج المساحة قبل الحلّ. وفّر عليّ جلسات علاج.',
    author: 'منى · ٣٢ سنة'
  },
  {
    text: 'كنت أبكي كل ليلة. الآن أفتح أراغيد بدلاً من أن أكتم. تغيّرت علاقتي بنفسي.',
    author: 'سارة · ٢٨ سنة'
  },
  {
    text: 'الخصوصية حلّت أصعب مشكلة عندي — أن أكون صادقة. لا أحد يراها سواي.',
    author: 'هند · ٣٧ سنة'
  }
];

export const renderPricing = () => {
  const view = $('#view-pricing');
  if (!view) return;
  view.innerHTML = '';

  const premium = isPremium();

  // Hero
  const hero = el('div', { class: 'pricing-hero' },
    el('div', { class: 'pricing-eyebrow' }, '✦  أراغيد كاملة  ✦'),
    el('div', { class: 'pricing-title' }, premium ? 'أنتِ معنا — شكراً' : 'الأدوات الكاملة لِلسلام'),
    el('div', { class: 'pricing-sub' }, premium
      ? 'حسابكِ مفعّل. استمتعي بكل الميزات.'
      : 'مساحتكِ تستحقّ الاستمرار. بسعر أقل من جلسة علاج واحدة.')
  );
  view.appendChild(hero);

  if (premium) {
    view.appendChild(el('div', { class: 'pricing-active-card' },
      el('div', { class: 'pricing-active-gem' }, '✦'),
      el('div', { class: 'pricing-active-title' }, 'اشتراككِ نشط'),
      el('div', { class: 'pricing-active-desc' }, 'جميع الميزات مفتوحة. شكراً أنكِ تَدعمين هذه المساحة.'),
      el('button', {
        class: 'btn btn-ghost',
        onclick: () => router.go('settings')
      }, 'إدارة الاشتراك')
    ));
    return;
  }

  // Plans
  view.appendChild(el('div', { class: 'section-title' }, 'اختاري خطتكِ'));
  const plansGrid = el('div', { class: 'plans-grid' });
  PLANS.forEach(p => {
    const card = el('button', {
      class: 'plan-card' + (p.recommended ? ' recommended' : ''),
      onclick: () => activatePlan(p.id)
    },
      p.save && el('div', { class: 'plan-badge' }, p.save),
      el('div', { class: 'plan-label' }, p.label),
      el('div', { class: 'plan-price' }, p.price),
      p.perMonth && el('div', { class: 'plan-per' }, `${p.perMonth} ر.س / شهر`),
      el('div', { class: 'plan-note' }, p.note)
    );
    plansGrid.appendChild(card);
  });
  view.appendChild(plansGrid);

  // Trial CTA
  view.appendChild(el('div', { class: 'pricing-trial' },
    el('div', { class: 'pricing-trial-icon' }, '◷'),
    el('div', { class: 'pricing-trial-text' },
      el('b', {}, '٧ أيام مجانية — بدون بطاقة'),
      el('span', {}, 'جرّبي كل شيء. ألغي متى شئتِ.')
    )
  ));

  // What unlocks
  view.appendChild(el('div', { class: 'section-title', style: { marginTop: '32px' } }, 'ما يُفتح لكِ'));
  const unlocks = el('div', { class: 'unlocks-list' });
  PREMIUM_UNLOCKS.forEach(u => {
    unlocks.appendChild(el('div', { class: 'unlock-row' },
      el('div', { class: 'unlock-icon' }, u.icon),
      el('div', { class: 'unlock-info' },
        el('div', { class: 'unlock-title' }, u.title),
        el('div', { class: 'unlock-desc' }, u.desc)
      ),
      el('div', { class: 'unlock-check' }, '✓')
    ));
  });
  view.appendChild(unlocks);

  // Free tier comparison
  view.appendChild(el('div', { class: 'section-title', style: { marginTop: '32px' } }, 'الخطة المجانية تبقى'));
  view.appendChild(el('div', { class: 'free-tier-card' },
    el('div', { class: 'free-tier-title' }, 'أراغيد مجانية للأبد'),
    el('div', { class: 'free-tier-desc' }, 'ما تحتاجينه للبداية، بدون أي تكلفة:'),
    el('ul', { class: 'free-tier-list' },
      ...FREE_INCLUDES.map(item => el('li', {}, '• ' + item))
    )
  ));

  // Privacy promise
  view.appendChild(el('div', { class: 'pricing-privacy' },
    el('div', { class: 'pricing-privacy-icon' }, '🔒'),
    el('div', { class: 'pricing-privacy-title' }, 'خصوصيتكِ ثابتة'),
    el('div', { class: 'pricing-privacy-desc' },
      'سواء كنتِ مجانية أو مشتركة، كل ما تكتبينه يبقى على جهازكِ. ',
      'الاشتراك يفتح ميزات، لا يكسر خصوصية. ',
      'لا نقرأ ما تكتبين. لا نُحلِّل عواطفكِ من بعيد. لا نبيع بياناتكِ.'
    )
  ));

  // Testimonials
  view.appendChild(el('div', { class: 'section-title', style: { marginTop: '32px' } }, 'من جرَّبن قبلكِ'));
  const tWrap = el('div', { class: 'testimonials' });
  TESTIMONIALS.forEach(t => {
    tWrap.appendChild(el('div', { class: 'testimonial' },
      el('div', { class: 'testimonial-text' }, '"' + t.text + '"'),
      el('div', { class: 'testimonial-author' }, '— ' + t.author)
    ));
  });
  view.appendChild(tWrap);

  // FAQ
  view.appendChild(el('div', { class: 'section-title', style: { marginTop: '32px' } }, 'أسئلة'));
  const faq = el('div', { class: 'faq-list' });
  [
    { q: 'هل أستطيع الإلغاء في أي وقت؟', a: 'نعم، بضغطة واحدة. بدون أسئلة، بدون احتجاج.' },
    { q: 'هل بياناتي ترحل عند الإلغاء؟', a: 'لا. بياناتكِ تبقى على جهازكِ سواء كنتِ مشتركة أم لا.' },
    { q: 'هل أحتاج إنترنت دائماً؟', a: 'لا. التطبيق يعمل بلا إنترنت. الاتصال فقط للدفع الأولي.' },
    { q: 'هل التطبيق بديل عن المعالج النفسي؟', a: 'لا. أراغيد مساحة دعم يومي. للحالات الصعبة، استشيري مختصاً.' }
  ].forEach(item => {
    faq.appendChild(el('details', { class: 'faq-item' },
      el('summary', {}, item.q),
      el('div', { class: 'faq-answer' }, item.a)
    ));
  });
  view.appendChild(faq);

  // Final CTA
  view.appendChild(el('div', { class: 'pricing-final-cta' },
    el('div', { class: 'pricing-final-title' }, 'مساحتكِ تستحقّ'),
    el('button', {
      class: 'btn btn-primary btn-lg btn-block',
      onclick: () => activatePlan('yearly')
    }, 'ابدئي ٧ أيام مجانية'),
    el('div', { class: 'pricing-final-foot' }, 'ألغي في أي وقت. لا بطاقة مطلوبة الآن.')
  ));
};

// ===== Activate plan (Demo) =====
const activatePlan = (planId) => {
  haptic([10, 50, 10]);
  // Demo activation
  const content = el('div', { class: 'plan-confirm' },
    el('div', { class: 'plan-confirm-gem' }, '✦'),
    el('div', { class: 'plan-confirm-eyebrow' }, 'نسخة تجريبية'),
    el('h2', { class: 'plan-confirm-title' }, 'الدفع غير متاح بعد'),
    el('p', { class: 'plan-confirm-text' },
      'هذا عرض تجريبي لخطة الاشتراك. عند الإطلاق ستُدمَج بوابة دفع آمنة (Moyasar/Stripe). ',
      el('br'), el('br'),
      'هل تَوَدِّين تفعيل الميزات في وضع تجريبي لاستكشافها؟'
    ),
    el('div', { class: 'plan-confirm-actions' },
      el('button', {
        class: 'btn btn-primary',
        onclick: () => {
          DB.set('premium', true);
          DB.set('demoMode', true);
          DB.set('premiumActivatedAt', new Date().toISOString());
          DB.set('premiumPlan', planId);
          closeModal();
          toast('تم تفعيل الميزات تجريبياً ✦', 'success', 3000);
          renderPricing();
        }
      }, 'فعّلي تجريبياً'),
      el('button', { class: 'btn btn-ghost', onclick: closeModal }, 'إلغاء')
    )
  );
  openModal(content, { size: 'md' });
};

// ===== Paywall Modal (when blocking a feature) =====
export const showPaywall = (feature, reason) => {
  const messages = {
    'premium-only': {
      title: 'ميزة كاملة',
      desc: 'هذه الميزة تُفتح مع أراغيد كاملة. اطّلعي على المزايا والخطط.'
    },
    'quota': {
      title: 'وصلتِ الحد المجاني',
      desc: 'استَخدمتِ كامل الحصة المجانية لهذه الميزة. افتحي السقف مع أراغيد كاملة.'
    },
    'cap': {
      title: 'الحد الأقصى المجاني',
      desc: 'النسخة المجانية تسمح بعدد محدود. كاملة تَفتح اللامحدود.'
    }
  };
  const msg = messages[reason] || messages['premium-only'];

  const content = el('div', { class: 'paywall-modal' },
    el('div', { class: 'paywall-gem' }, '✦'),
    el('div', { class: 'paywall-eyebrow' }, 'أراغيد كاملة'),
    el('h2', { class: 'paywall-title' }, msg.title),
    el('p', { class: 'paywall-desc' }, msg.desc),
    el('div', { class: 'paywall-unlocks' },
      ...PREMIUM_UNLOCKS.slice(0, 4).map(u =>
        el('div', { class: 'paywall-unlock' },
          el('span', { class: 'paywall-unlock-icon' }, u.icon),
          el('span', {}, u.title)
        )
      )
    ),
    el('div', { class: 'paywall-actions' },
      el('button', {
        class: 'btn btn-primary',
        onclick: () => { closeModal(); router.go('pricing'); }
      }, 'اطّلعي على الخطط'),
      el('button', { class: 'btn btn-ghost', onclick: closeModal }, 'لاحقاً')
    )
  );
  openModal(content, { size: 'md' });
};
