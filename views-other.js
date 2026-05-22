/* ============================================================
   ARAGID — OTHER VIEWS (v2)
   Protocols, Archive, Stories, Toolkit, Settings
   ============================================================ */

import { $, el, DB, toAR, arDate, timeAgo, toast, haptic, openModal, closeModal, escapeHTML, trunc,
         router, state, isPremium } from './core.js';
import { protocols, getProtocol } from './data-protocols.js';
import { wisdom } from './data-wisdom.js';

// ============================================================
// PROTOCOLS LIST — organized by category
// ============================================================
const CATEGORIES = [
  { id: 'urgent',   label: 'لِلحظات حادّة',   icon: '⚡' },
  { id: 'thought',  label: 'لِأفكار مُتَكَرِّرة', icon: '🌀' },
  { id: 'emotion',  label: 'لِعاصفة عاطفية',  icon: '💔' },
  { id: 'self',     label: 'لِجَلد الذات',     icon: '🪞' },
  { id: 'connect',  label: 'لِلوَحدة',         icon: '◯' }
];

const CATEGORY_MAP = {
  'collapse-night': 'urgent',
  'panic-now': 'urgent',
  'rumination-loop': 'thought',
  'emotional-overload': 'emotion',
  'guilt-spiral': 'self',
  'self-criticism': 'self',
  'loneliness': 'connect'
};

export const renderProtocols = () => {
  const view = $('#view-protocols');
  if (!view) return;
  view.innerHTML = '';

  view.appendChild(el('div', { class: 'view-header' },
    el('div', { class: 'view-eyebrow' }, '✦  مكتبة البروتوكولات  ✦'),
    el('div', { class: 'view-title' }, 'لِلحظات الصعبة'),
    el('div', { class: 'view-desc' }, 'بروتوكولات قصيرة، ٣-٧ دقائق. اختاري حسب لحظتكِ.')
  ));

  // Group by category
  const byCategory = {};
  protocols.forEach(p => {
    const cat = p.category || CATEGORY_MAP[p.id] || 'urgent';
    (byCategory[cat] = byCategory[cat] || []).push(p);
  });

  CATEGORIES.forEach(cat => {
    const items = byCategory[cat.id];
    if (!items || items.length === 0) return;

    view.appendChild(el('div', { class: 'cat-header' },
      el('span', { class: 'cat-icon' }, cat.icon),
      el('span', { class: 'cat-label' }, cat.label)
    ));

    const list = el('div', { class: 'protocol-list' });
    items.forEach(p => {
      list.appendChild(el('div', {
        class: 'protocol-card',
        onclick: () => openProtocolDetail(p.id)
      },
        el('div', { class: 'protocol-icon' }, p.icon),
        el('div', { class: 'protocol-info' },
          el('div', { class: 'protocol-title' }, p.title),
          el('div', { class: 'protocol-desc' }, p.desc)
        ),
        el('div', { class: 'protocol-time' }, p.duration)
      ));
    });
    view.appendChild(list);
  });
};

const openProtocolDetail = (id) => {
  const p = getProtocol(id);
  if (!p) return;

  const content = el('div', { class: 'proto-detail' },
    el('div', { class: 'proto-head' },
      el('div', { class: 'proto-head-icon' }, p.icon),
      el('h2', { class: 'proto-head-title' }, p.title),
      el('p', { class: 'proto-head-desc' }, p.desc),
      el('div', { class: 'proto-head-duration' }, p.duration)
    ),
    ...p.steps.map((s, i) => el('div', { class: 'proto-step' },
      el('div', { class: 'proto-step-num' }, `الخطوة ${toAR(i + 1)}: ${s.title}`),
      el('div', { class: 'proto-step-content' }, s.content)
    )),
    p.closingQuote && el('div', { class: 'proto-closing-quote' }, p.closingQuote)
  );

  openModal(content);
};

// ============================================================
// ARCHIVE
// ============================================================
export const renderArchive = () => {
  const view = $('#view-archive');
  if (!view) return;
  view.innerHTML = '';

  view.appendChild(el('div', { class: 'view-header' },
    el('div', { class: 'view-eyebrow' }, '◊  أرشيف جلساتكِ  ◊'),
    el('div', { class: 'view-title' }, 'رحلتكِ بصوتكِ'),
    el('div', { class: 'view-desc' }, 'كل جلسة هنا. خاصة بكِ تماماً.')
  ));

  const archive = DB.get('archive', []);

  if (archive.length === 0) {
    view.appendChild(el('div', { class: 'empty-state empty-state-rich' },
      el('div', { class: 'empty-gem' }, '◊'),
      el('div', { class: 'empty-title' }, 'الأرشيف فارغ — مؤقتاً'),
      el('div', { class: 'empty-desc' },
        'هنا ستتجمّع كل جلساتكِ — كتابة، محادثات، لحظات. ',
        'كرحلة بصوتكِ، تَعودين إليها كلما احتجتِ.'
      ),
      el('div', { class: 'empty-actions' },
        el('button', { class: 'btn btn-primary', onclick: () => router.go('write') }, 'اكتبي أول جلسة'),
        el('button', { class: 'btn btn-ghost', onclick: () => router.go('nada') }, 'حَدِّثي ندى')
      )
    ));
    return;
  }

  // Group by date
  const groups = {};
  archive.forEach(item => {
    const dKey = (item.timestamp || '').slice(0, 10);
    (groups[dKey] = groups[dKey] || []).push(item);
  });

  Object.entries(groups).forEach(([dateKey, items]) => {
    const dateLabel = dateKey ? arDate(dateKey) : '';
    view.appendChild(el('div', { class: 'archive-date-group' }, dateLabel));
    items.forEach(item => view.appendChild(buildArchiveCard(item)));
  });
};

const buildArchiveCard = (item) => {
  const typeLabel = item.type === 'write' ? '✎ كتابة'
    : item.type === 'nada' ? '💬 محادثة'
    : '◊ جلسة';
  return el('div', {
    class: 'archive-item',
    onclick: () => openArchiveItem(item)
  },
    el('div', { class: 'archive-item-date' },
      el('span', { class: 'archive-item-type' }, typeLabel),
      el('span', { class: 'archive-item-sep' }, '·'),
      el('span', {}, timeAgo(item.timestamp))
    ),
    el('div', { class: 'archive-item-preview' },
      trunc(item.text || item.summary?.theme || 'جلسة', 130)
    )
  );
};

const openArchiveItem = (item) => {
  let content;
  if (item.type === 'write') {
    content = el('div', {},
      el('div', { class: 'archive-detail-head' },
        el('div', { class: 'archive-detail-eyebrow' }, '✎ كتابة'),
        el('div', { class: 'archive-detail-date' }, arDate(item.timestamp))
      ),
      el('div', { class: 'paper paper-static' },
        el('div', {
          class: 'paper-content',
          html: escapeHTML(item.text).replace(/\n/g, '<br>')
        })
      ),
      el('div', { class: 'archive-detail-actions' },
        el('button', {
          class: 'btn btn-ghost',
          onclick: () => {
            if (confirm('احذفي هذه الجلسة نهائياً؟')) {
              const updated = DB.get('archive', []).filter(a => a.id !== item.id);
              DB.set('archive', updated);
              closeModal();
              renderArchive();
              toast('تم الحذف');
            }
          }
        }, '🗑 احذفي')
      )
    );
  } else if (item.type === 'nada') {
    const messages = item.messages || [];
    content = el('div', {},
      el('div', { class: 'archive-detail-head' },
        el('div', { class: 'archive-detail-eyebrow' }, '💬 محادثة'),
        el('div', { class: 'archive-detail-date' }, arDate(item.timestamp))
      ),
      el('div', { class: 'archive-msgs' },
        ...messages.filter(m => m.role !== 'system').map(m => el('div', {
          class: m.role === 'user' ? 'msg user' : 'msg nada',
          html: escapeHTML(m.text).replace(/\n/g, '<br>')
        }))
      )
    );
  } else {
    content = el('div', {}, 'محتوى الجلسة غير متاح');
  }
  openModal(content);
};

// ============================================================
// STORIES
// ============================================================
const SAMPLE_STORIES = [
  { text: "كنت أبكي كل ليلة بصمت لمدة شهور. ما أحد يدري. اكتشفت أن الكتابة هنا أعطتني الكلمات التي ضاعت. الآن أبكي أقل، وأكتب أكثر.", days: 47 },
  { text: "تركت العمل الذي كرهته. كان قراراً صعباً لكن قرأت رسالة كتبتها لنفسي قبل سنة، وفهمت أن المستقبل لي.", days: 89 },
  { text: "ابنتي تسألني ليش أنا أهدأ من قبل. لا أعرف كيف أشرح أن جلسة ٧ دقائق كل ليلة غيرت كل شيء.", days: 156 },
  { text: "كنت أعتقد أن المرأة القوية لا تتعب. تعلمتُ أن القوة في الاعتراف، لا في الإنكار.", days: 22 },
  { text: "علاقتي بأمي معقدة. لم أصلحها بعد، لكن الكتابة هنا ساعدتني أفهم نفسي قبل أن أفهمها.", days: 73 }
];

export const renderStories = () => {
  const view = $('#view-stories');
  if (!view) return;
  view.innerHTML = '';

  view.appendChild(el('div', { class: 'view-header' },
    el('div', { class: 'view-eyebrow' }, '✎  حكي الناس  ✎'),
    el('div', { class: 'view-title' }, 'قصص لا تخصّكِ، لكنها تشبهكِ'),
    el('div', { class: 'view-desc' }, 'حكايات مجهولة من نساء مَررن. لتعرفي أنكِ لستِ وحدكِ.')
  ));

  SAMPLE_STORIES.forEach(s => {
    view.appendChild(el('div', { class: 'story-card' },
      el('div', { class: 'story-quote-mark' }, '"'),
      el('div', { class: 'story-text' }, s.text),
      el('div', { class: 'story-meta' },
        el('span', {}, 'مجهولة الهوية'),
        el('span', { class: 'story-meta-sep' }, '·'),
        el('span', {}, `قبل ${toAR(s.days)} يوم`)
      )
    ));
  });
};

// ============================================================
// TOOLKIT — Organized library
// ============================================================
const TOOLKIT_GROUPS = [
  {
    label: 'تنفس فوري',
    icon: '🌬',
    tools: [
      {
        title: 'تنفس ٤-٧-٨', desc: 'لخفض القلق فوراً', icon: '🌬',
        action: () => { document.getElementById('rescueFab')?.click(); }
      },
      {
        title: 'وقفة دقيقة', desc: 'تأمل سريع', icon: '⏱',
        action: () => openTimerTool()
      }
    ]
  },
  {
    label: 'العودة للحاضر',
    icon: '👁',
    tools: [
      {
        title: 'تقنية ٥-٤-٣-٢-١', desc: 'للعودة إلى الحاضر', icon: '👁',
        action: () => openGroundingTool()
      },
      {
        title: 'اللمسة الذاتية', desc: 'تهدئة فورية بلمسة', icon: '🤲',
        action: () => openSelfTouchTool()
      }
    ]
  },
  {
    label: 'لحظات صعبة جداً',
    icon: '⚡',
    tools: [
      {
        title: 'إنقاذ ٧ دقائق', desc: 'انهيار عميق — premium', icon: '✦', premium: true,
        action: () => router.go('pricing')
      }
    ]
  }
];

export const renderToolkit = () => {
  const view = $('#view-toolkit');
  if (!view) return;
  view.innerHTML = '';

  view.appendChild(el('div', { class: 'view-header' },
    el('div', { class: 'view-eyebrow' }, '◈  صندوق أدواتكِ  ◈'),
    el('div', { class: 'view-title' }, 'تقنيات فورية'),
    el('div', { class: 'view-desc' }, 'مكتبتكِ السريعة لِلحظات اليومية.')
  ));

  TOOLKIT_GROUPS.forEach(group => {
    view.appendChild(el('div', { class: 'cat-header' },
      el('span', { class: 'cat-icon' }, group.icon),
      el('span', { class: 'cat-label' }, group.label)
    ));

    const list = el('div', { class: 'protocol-list' });
    group.tools.forEach(t => {
      list.appendChild(el('div', {
        class: 'protocol-card' + (t.premium && !isPremium() ? ' protocol-card-locked' : ''),
        onclick: t.action
      },
        el('div', { class: 'protocol-icon' }, t.icon),
        el('div', { class: 'protocol-info' },
          el('div', { class: 'protocol-title' }, t.title),
          el('div', { class: 'protocol-desc' }, t.desc)
        ),
        t.premium && !isPremium()
          ? el('div', { class: 'protocol-lock' }, '✦')
          : el('div', { class: 'protocol-time' }, 'الآن')
      ));
    });
    view.appendChild(list);
  });
};

const openGroundingTool = () => {
  openModal(el('div', { class: 'tool-modal' },
    el('h3', { class: 'tool-title' }, 'تقنية ٥-٤-٣-٢-١'),
    el('p', { class: 'tool-sub' }, 'استخدمي حواسكِ للعودة إلى الحاضر'),
    ...[
      { num: '٥', label: 'أشياء تَرينها', detail: 'انظري حولكِ. سَمِّيها بصوت عالٍ أو في رأسكِ.' },
      { num: '٤', label: 'أشياء تَلمسينها', detail: 'لمس قطعة قماش، الطاولة، شعركِ.' },
      { num: '٣', label: 'أصوات تَسمعينها', detail: 'صوت مكيف، طيور، ضجيج بعيد.' },
      { num: '٢', label: 'روائح', detail: 'إن لم تكن واضحة، تَخَيَّلي رائحة قهوة أو ورد.' },
      { num: '١', label: 'طعم', detail: 'في فمكِ الآن، أو تَخَيَّلي.' }
    ].map(s => el('div', { class: 'proto-step' },
      el('div', { class: 'proto-step-num' }, `${s.num} · ${s.label}`),
      el('div', { class: 'proto-step-content' }, s.detail)
    ))
  ));
};

const openSelfTouchTool = () => {
  openModal(el('div', { class: 'tool-modal' },
    el('h3', { class: 'tool-title' }, 'اللمسة الذاتية'),
    el('p', { class: 'tool-body' },
      'ضَعي يَدكِ على قلبكِ، اليد الأخرى على بطنكِ. أَغمِضي عينيكِ. ',
      'تَنَفَّسي ببطء. اشعري بدفء يَديكِ ينتقل إلى داخلكِ.',
      el('br'), el('br'),
      'قولي لنفسكِ بصوت داخلي: "أنا هنا. أنا بأمان. هذه اللحظة كافية."',
      el('br'), el('br'),
      'اِبقي ٣٠ ثانية، أو أكثر.'
    )
  ));
};

const openTimerTool = () => {
  let count = 60;
  const counter = el('div', { class: 'tool-timer-num' }, toAR(count));
  const modal = el('div', { class: 'tool-modal' },
    el('h3', { class: 'tool-title' }, 'وقفة دقيقة'),
    el('p', { class: 'tool-sub' }, 'فقط كوني. لا تَفعلي شيئاً. لا تُفَكِّري في شيء.'),
    counter,
    el('p', { class: 'tool-timer-foot' }, 'ثانية مُتَبَقِّية')
  );
  openModal(modal);

  const interval = setInterval(() => {
    count--;
    counter.textContent = toAR(count);
    if (count <= 0) {
      clearInterval(interval);
      counter.textContent = '✦';
      haptic([100]);
      toast('دقيقة من السلام انتهت', 'success');
    }
  }, 1000);
};

// ============================================================
// SETTINGS
// ============================================================
export const renderSettings = () => {
  const view = $('#view-settings');
  if (!view) return;
  view.innerHTML = '';

  view.appendChild(el('div', { class: 'view-header' },
    el('div', { class: 'view-eyebrow' }, '⚙  الإعدادات  ⚙'),
    el('div', { class: 'view-title' }, 'تخصيص أراغيد'),
    el('div', { class: 'view-desc' }, 'اضبطي التطبيق ليناسبكِ.')
  ));

  const profile = DB.get('profile', { name: '' });

  // Premium status
  if (isPremium()) {
    view.appendChild(el('div', { class: 'settings-premium-badge' },
      el('div', { class: 'settings-premium-gem' }, '✦'),
      el('div', {},
        el('div', { class: 'settings-premium-title' }, 'أراغيد كاملة — مُفَعَّلة'),
        el('div', { class: 'settings-premium-sub' }, 'كل الميزات مفتوحة لكِ')
      )
    ));
  } else {
    view.appendChild(el('div', {
      class: 'settings-upgrade-card',
      onclick: () => router.go('pricing')
    },
      el('div', { class: 'settings-upgrade-icon' }, '✦'),
      el('div', {},
        el('div', { class: 'settings-upgrade-title' }, 'افتحي أراغيد كاملة'),
        el('div', { class: 'settings-upgrade-sub' }, 'تقارير، رسائل لا محدودة، إنقاذ موسّع')
      ),
      el('div', { class: 'settings-upgrade-arrow' }, '◀')
    ));
  }

  // Profile
  view.appendChild(el('div', { class: 'section-title' }, 'الملف الشخصي'));
  view.appendChild(el('div', { class: 'settings-section' },
    el('div', { class: 'settings-row', onclick: editName },
      el('div', {},
        el('div', { class: 'settings-label' }, 'اسمكِ'),
        el('div', { class: 'settings-value' }, profile.name || 'لم تَختاري بعد')
      ),
      el('span', { class: 'settings-arrow' }, '◀')
    )
  ));

  // Experience
  view.appendChild(el('div', { class: 'section-title' }, 'التجربة'));
  view.appendChild(el('div', { class: 'settings-section' },
    settingsToggle('ambience', 'الأصوات والأجواء', 'أصوات لطيفة عند التفاعل', true),
    settingsToggle('dnd', 'وضع الهدوء', 'كتم التذكيرات والاهتزاز', false)
  ));

  // Privacy & Data
  view.appendChild(el('div', { class: 'section-title' }, 'الخصوصية والبيانات'));
  view.appendChild(el('div', { class: 'settings-section' },
    el('div', { class: 'settings-info-card' },
      el('div', { class: 'settings-info-icon' }, '🔒'),
      el('div', { class: 'settings-info-text' },
        el('b', {}, 'بياناتكِ على جهازكِ فقط'),
        el('span', {}, 'لا نخزّن، لا نقرأ، لا نُحَلِّل. كل ما تَكتبينه يبقى لكِ، حرفياً.')
      )
    ),
    el('div', { class: 'settings-row', onclick: exportData },
      el('div', {},
        el('div', { class: 'settings-label' }, 'تَصدير بياناتكِ'),
        el('div', { class: 'settings-value' }, 'احفظي نسخة JSON')
      ),
      el('span', { class: 'settings-arrow' }, '⬇')
    ),
    el('div', { class: 'settings-row', onclick: importData },
      el('div', {},
        el('div', { class: 'settings-label' }, 'استيراد بيانات'),
        el('div', { class: 'settings-value' }, 'من ملف JSON محفوظ')
      ),
      el('span', { class: 'settings-arrow' }, '⬆')
    ),
    el('div', { class: 'settings-row settings-row-danger', onclick: clearData },
      el('div', {},
        el('div', { class: 'settings-label' }, 'حذف كل البيانات'),
        el('div', { class: 'settings-value' }, 'لا يُمكن التراجع')
      ),
      el('span', { class: 'settings-arrow' }, '🗑')
    )
  ));

  // About
  view.appendChild(el('div', { class: 'section-title' }, 'عن أراغيد'));
  view.appendChild(el('div', { class: 'settings-section' },
    el('div', { class: 'settings-row' },
      el('div', {},
        el('div', { class: 'settings-label' }, 'الإصدار'),
        el('div', { class: 'settings-value' }, '٢.٠.٠')
      )
    ),
    el('div', { class: 'settings-row' },
      el('div', {},
        el('div', { class: 'settings-label' }, 'تَنبيه'),
        el('div', { class: 'settings-value' }, 'أراغيد دعم يومي — ليست بديلاً عن المُعالج المُختَصّ')
      )
    )
  ));
};

const settingsToggle = (key, label, sub, defaultVal) => {
  const value = DB.get(key, defaultVal);
  const toggle = el('div', { class: 'toggle' + (value ? ' on' : '') });
  const row = el('div', { class: 'settings-row' },
    el('div', {},
      el('div', { class: 'settings-label' }, label),
      el('div', { class: 'settings-value' }, sub)
    ),
    toggle
  );
  row.addEventListener('click', () => {
    const newValue = !DB.get(key, defaultVal);
    DB.set(key, newValue);
    state[key] = newValue;
    toggle.classList.toggle('on', newValue);
    haptic([5]);
    if (key === 'dnd') $('#dndBanner')?.classList.toggle('show', newValue);
  });
  return row;
};

const editName = () => {
  const profile = DB.get('profile', { name: '' });
  const content = el('div', {},
    el('h3', { class: 'modal-title' }, 'كيف تُحبّين أن تُنادى؟'),
    el('input', {
      class: 'field',
      id: 'name-input',
      placeholder: 'اسمكِ أو لقبكِ',
      value: profile.name || ''
    }),
    el('div', { class: 'modal-actions' },
      el('button', {
        class: 'btn btn-primary',
        onclick: () => {
          const name = $('#name-input').value.trim();
          DB.set('profile', { ...profile, name });
          closeModal();
          renderSettings();
          toast('تم الحفظ', 'success');
        }
      }, 'احفظي'),
      el('button', { class: 'btn btn-ghost', onclick: closeModal }, 'إلغاء')
    )
  );
  openModal(content);
  setTimeout(() => $('#name-input')?.focus(), 100);
};

const exportData = () => {
  try {
    const data = DB.exportAll();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aragid-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('تم تَصدير بياناتكِ', 'success');
  } catch (e) {
    toast('فَشِل التَصدير', 'danger');
  }
};

const importData = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (confirm('سيتم استبدال كل بياناتكِ الحالية. متابعة؟')) {
          DB.importAll(data);
          toast('تم الاستيراد. سيتم التحديث...', 'success');
          setTimeout(() => location.reload(), 1500);
        }
      } catch { toast('ملف غير صالح', 'danger'); }
    };
    reader.readAsText(file);
  };
  input.click();
};

const clearData = () => {
  if (!confirm('سيتم حذف كل بياناتكِ نهائياً. هل أنتِ متأكدة؟')) return;
  if (!confirm('تأكيد أخير — لا يمكن استرجاع البيانات. متأكدة تماماً؟')) return;
  DB.clear();
  toast('تم حذف كل البيانات', 'success');
  setTimeout(() => location.reload(), 1500);
};
