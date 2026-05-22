/* ============================================================
   ARAGID — NADA AI (v2)
   Context-aware companion with emotional state tracking
   ============================================================ */

import { $, el, DB, toast, haptic, escapeHTML, pickOne, openModal, closeModal, router, toAR,
         canUseFeature, trackFeatureUsage, startSession, completeSession } from './core.js';
import { detectProtocolNeed, getProtocol } from './data-protocols.js';
import { wisdom } from './data-wisdom.js';
import { MOODS, getMood, logMood, moodToProtocol } from './mood-system.js';
import { showPaywall } from './views-pricing.js';

// ===== Response library =====
const NADA = {
  greetings: {
    morning: [
      "صباح الخير. كيف تستيقظين اليوم؟\n\nخذي وقتكِ قبل أن تكتبي. لا داعي للاستعجال.",
      "صباحكِ خير. الصباح أصدق من المساء — ماذا تَحمِلين معكِ هذا اليوم؟"
    ],
    afternoon: [
      "أهلاً. لحظة وسط النهار — أحياناً أصعب من الليل.\n\nأخبريني، ما الذي يَمُرّ بكِ الآن؟",
      "مرحباً. وسط اليوم له ثقله الخاص. كيف تَحمِلينه؟"
    ],
    evening: [
      "مساء الخير. كيف كان نهاركِ؟\n\nلا تَختزِليه في كلمة — خذي مساحة.",
      "مساء النور. اليوم بأكمله خَلفكِ الآن. ماذا تُريدين أن تَتركيه هنا؟"
    ],
    night: [
      "أهلاً يا غالية. الليل عميق — وأنتِ أعمق.\n\nخذي وقتكِ. أنا هنا.",
      "مساء الهدوء. أنتِ في مساحتكِ الآن. ابدئي بأي كلمة تَأتيكِ.",
      "أهلاً. حين ينام الجميع ولا تنامين أنتِ — هذا ليس ضعفاً. اِحكي."
    ],
    returning: [
      "أهلاً بعودتكِ. كنتُ هنا.\n\nماذا حَدَث منذ آخر مرة؟",
      "تَعَوَّدتُ على وجودكِ. شَيءٌ في داخلكِ يطلب الكلام اليوم؟"
    ]
  },

  acknowledgments: {
    pain: [
      "أسمعكِ. هذا حقيقي.",
      "ما تَقولينه ليس صغيراً. وأنتِ لستِ مُبالِغة.",
      "هذا حقّ مشروع تَشعرين به. وله مكان هنا.",
      "صَعب — وأنتِ تَحمِلينه. هذا يستحقّ الاعتراف."
    ],
    confusion: [
      "ليس عليكِ أن تفهمي كل شيء الآن. عدم الفهم وَعي بحَدّ ذاته.",
      "هذا اضطراب طبيعي. أن تكوني حائرة لا يعني أنكِ ضائعة."
    ],
    anger: [
      "غضبكِ مشروع. لا تَكتميه — لكن وَجِّهيه بحكمة.",
      "هذا ليس غضباً عابراً. شَيءٌ يستحقّ الانتباه."
    ],
    courage: [
      "أن تَقولي هذا بوضوح — هذي شجاعة. كثيرات يَكتُمن.",
      "كَلِماتكِ تَدلّ على وَعي عميق. تَستحقّين أن تَفخري بنفسكِ."
    ]
  },

  questions: {
    body: [
      "أين تَشعرين بهذا في جسدكِ؟ في الصدر؟ المعدة؟ الكتفين؟",
      "ما الذي يحدث لجسدكِ حين تَفَكِّرين بهذا؟",
      "هل لاحَظتِ أنّ نَفَسكِ يتغيّر عند هذا الشعور؟"
    ],
    history: [
      "متى بدأ هذا الشعور؟ هل حَدَث شيء قريباً؟",
      "هل سَبَق وعشتِ شعوراً مشابهاً؟ كيف مَرّ؟",
      "إن نظرتِ خَلفكِ — منذ متى وهذا يَتراكَم؟"
    ],
    need: [
      "ما الذي تَحتاجينه الآن — مَن يُصغي، أم مَن يَقترح، أم مَن يَتركُكِ؟",
      "لو كان معكِ شخصٌ يُحبّكِ تماماً، ماذا سَيقول لكِ هذه اللحظة؟",
      "ما هو الشيء الواحد البسيط الذي يُحدِث فَرقاً صغيراً الآن؟"
    ],
    reframe: [
      "ما الذي يقوله جزءٌ آخر فيكِ — الجزء الهادئ — عن هذا؟",
      "لو كانت صديقتكِ تَمُرّ بهذا، ماذا كنتِ ستَقولين لها؟",
      "ما الذي ربما تُريد هذه الفكرة منكِ — قراراً، مغفرة، انتباهاً؟"
    ]
  },

  reframes: [
    "ربما هذا ليس ضَعفاً، بل وَعياً عالياً يَتعب لأنه يَرى أكثر.",
    "أحياناً ما يَبدو إخفاقاً، هو في الحقيقة إنذار مُبَكِّر من جسدكِ يَطلب راحة.",
    "ما تَصِفينه ليس مَرضاً. هو إشارة طبيعية لإنسانة تَعيش في عالم يُجبرها على التسارع.",
    "صَبركِ ليس ضَعفاً — هو شجاعة هادئة لا يَراها كثيرون.",
    "أن تَشعري بكل هذا، يعني أنّكِ ما زِلتِ حَيّة. الخَدَر أسوأ بكثير من الألم."
  ],

  microActions: [
    "اِشربي كوب ماء بطيء الآن. هذي خطوة لجسدكِ.",
    "خذي نَفَساً عميقاً واحداً قبل أن تَكتُبي الردّ التالي.",
    "ضَعي يَدكِ على قلبكِ لـ ٣٠ ثانية. الجسد يَحتاج إشارة من نفسه.",
    "افتحي نافذة قليلاً. هواء جديد يَكسِر شيئاً صغيراً.",
    "اكتبي جملة واحدة: 'أنا هنا. الآن.' كَرِّريها ثلاثاً.",
    "غَيِّري وضعيّتكِ — قِفي إن كنتِ جالسة، أو العكس. الجسد يَحتاج تَنبيهاً."
  ],

  protocolSuggestion: [
    "لاحَظتُ أنّ ما تَصفينه يَتكَرَّر. ربما يُساعد بروتوكول قصير لـ ٥ دقائق.\n\nهل تُجَرِّبين؟",
    "ما تَشعرين به الآن، فيه بروتوكول مُخَصَّص يُخَفِّفه.\n\nأَوَدّ أن أَعرِضه عليكِ، لو سَمَحتِ.",
    "بَدلاً من الكلام، رُبَّما تُجَرِّبين شيئاً عملياً — بروتوكول قصير.\n\nأَرشِدكِ إليه؟"
  ]
};

// ===== State =====
let conversation = [];
let userMessageCount = 0;
let currentSessionId = null;
let emotionalState = { tone: 'neutral', intensity: 0 };

const STORAGE_KEY = 'nada_chat';

const loadConversation = () => {
  conversation = DB.get(STORAGE_KEY, []);
  userMessageCount = conversation.filter(m => m.role === 'user').length;
};

const saveConversation = () => {
  if (conversation.length > 100) conversation = conversation.slice(-100);
  DB.set(STORAGE_KEY, conversation);
};

// ===== Tone analysis =====
const analyzeTone = (text) => {
  const lower = text.toLowerCase();
  const tones = {
    crisis: ['أنهي حياتي', 'مايستاهل العيش', 'ابي اموت', 'انتحار', 'اقتل نفسي', 'ما أبي أعيش'],
    anger: ['غاضبة', 'زعلانة', 'مكسورة', 'كرهت', 'بَكفي', 'مللت'],
    sad: ['حزينة', 'بكيت', 'بكاء', 'دمع', 'فاقدة', 'وحدة'],
    anxious: ['قلقانة', 'متوترة', 'خوف', 'هلع', 'قلبي يدق', 'مايجي النفس'],
    tired: ['متعبة', 'مرهقة', 'ما أقدر', 'تعبت'],
    confused: ['ما أعرف', 'مش متأكدة', 'مَحتارة', 'مَتشَتِّتة'],
    grateful: ['شكراً', 'ممتنّة', 'الحمد', 'فرحانة'],
    hopeful: ['أحسن', 'أهدأ', 'أقوى', 'يَتغَيَّر']
  };

  for (const [tone, kws] of Object.entries(tones)) {
    if (kws.some(kw => lower.includes(kw))) {
      return { tone, intensity: 1 };
    }
  }
  return { tone: 'neutral', intensity: 0 };
};

const getGreeting = () => {
  const h = new Date().getHours();
  const period = h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 22 ? 'evening' : 'night';
  const lastChat = DB.get('lastChat', null);
  const hoursSince = lastChat ? (Date.now() - lastChat) / 3600000 : 999;
  if (hoursSince < 24 && lastChat) return pickOne(NADA.greetings.returning);
  return pickOne(NADA.greetings[period] || NADA.greetings.evening);
};

const generateResponse = (userMsg) => {
  userMessageCount++;
  const analysis = analyzeTone(userMsg);
  emotionalState = analysis;

  if (analysis.tone === 'crisis') {
    return {
      text: "ما تَقولينه يَهُمّني جداً. أنتِ مُهِمَّة.\n\nأنا هنا لأَسمَعَكِ، لكن لو الأمر حادّ، اتصلي على خط الدعم الفوري ٩٢٠٠٣٣٣٦٠ — متاح ٢٤/٧.\n\nهل تَستطيعين الآن أن تأخذي نَفَساً عميقاً واحداً؟",
      isCrisis: true
    };
  }

  if (userMessageCount === 1) return acknowledgeAndAsk(userMsg, analysis);

  if (userMessageCount % 3 === 0) {
    const recent = conversation.filter(m => m.role === 'user').slice(-4).map(m => m.text);
    const suggested = detectProtocolNeed([...recent, userMsg]);
    if (suggested) return { text: pickOne(NADA.protocolSuggestion), protocolId: suggested };
  }

  if (userMessageCount % 5 === 0) {
    return { text: pickOne(NADA.reframes) + '\n\n' + pickOne(NADA.microActions) };
  }

  return acknowledgeAndAsk(userMsg, analysis);
};

const acknowledgeAndAsk = (userMsg, analysis) => {
  const tone = analysis.tone;
  let ackPool = NADA.acknowledgments.pain;
  if (tone === 'anger') ackPool = NADA.acknowledgments.anger;
  else if (tone === 'confused') ackPool = NADA.acknowledgments.confusion;
  else if (['grateful', 'hopeful'].includes(tone)) ackPool = NADA.acknowledgments.courage;

  const qPools = [NADA.questions.body, NADA.questions.history, NADA.questions.need, NADA.questions.reframe];
  const qPool = qPools[userMessageCount % qPools.length];

  return { text: `${pickOne(ackPool)}\n\n${pickOne(qPool)}` };
};

// ===== Render =====
const renderMessages = () => {
  const container = $('#nada-messages');
  if (!container) return;
  container.innerHTML = '';

  if (conversation.length === 0) {
    conversation.push({ role: 'nada', text: getGreeting(), timestamp: new Date().toISOString() });
    saveConversation();
  }

  conversation.forEach(msg => container.appendChild(buildMessageEl(msg)));
  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 50);
};

const buildMessageEl = (msg) => {
  const cls = msg.role === 'user' ? 'msg user'
    : msg.isCrisis ? 'msg nada msg-crisis'
    : 'msg nada';
  const message = el('div', { class: cls, html: escapeHTML(msg.text).replace(/\n/g, '<br>') });

  if (msg.protocolId) {
    const proto = getProtocol(msg.protocolId);
    if (proto) {
      const actionWrap = el('div', { class: 'msg-actions' },
        el('button', {
          class: 'btn btn-primary btn-sm',
          onclick: () => openProtocolFromChat(msg.protocolId)
        }, `جَرِّبي: ${proto.title}`),
        el('button', {
          class: 'btn btn-ghost btn-sm',
          onclick: () => sendMessage('لا، أُكْمِل الكلام')
        }, 'لاحقاً')
      );
      message.appendChild(actionWrap);
    }
  }

  if (msg.isCrisis) {
    const callBtn = el('a', {
      href: 'tel:920033360',
      class: 'btn btn-crisis-call',
      style: { marginTop: '12px', display: 'block', textDecoration: 'none', textAlign: 'center' }
    }, '☎ اتصلي بخط الدعم — ٩٢٠٠٣٣٣٦٠');
    message.appendChild(callBtn);
  }

  return message;
};

const showTypingIndicator = () => {
  const container = $('#nada-messages');
  if (!container) return;
  const typing = el('div', { class: 'typing-indicator', id: 'nada-typing' },
    el('div', { class: 'typing-dot' }), el('div', { class: 'typing-dot' }), el('div', { class: 'typing-dot' })
  );
  container.appendChild(typing);
};

const hideTypingIndicator = () => { $('#nada-typing')?.remove(); };

const sendMessage = (text) => {
  if (!text || !text.trim()) return;

  const quota = canUseFeature('nadaMessages');
  if (!quota.ok) { showPaywall('nadaMessages', quota.reason); return; }
  trackFeatureUsage('nadaMessages');

  if (!currentSessionId) currentSessionId = startSession('nada');
  DB.set('lastChat', Date.now());

  haptic([10]);
  conversation.push({ role: 'user', text: text.trim(), timestamp: new Date().toISOString() });
  saveConversation();
  renderMessages();

  const input = $('#nada-input');
  if (input) { input.value = ''; input.style.height = 'auto'; }
  const sendBtn = $('#nada-send-btn');
  if (sendBtn) sendBtn.disabled = true;

  showTypingIndicator();

  setTimeout(() => {
    hideTypingIndicator();
    const response = generateResponse(text);
    conversation.push({
      role: 'nada',
      text: response.text,
      protocolId: response.protocolId,
      isCrisis: response.isCrisis,
      timestamp: new Date().toISOString()
    });
    saveConversation();
    renderMessages();
    haptic([5]);
  }, 800 + Math.random() * 1200);
};

const openProtocolFromChat = (protocolId) => {
  const proto = getProtocol(protocolId);
  if (!proto) return;

  const content = el('div', { class: 'proto-detail' },
    el('div', { class: 'proto-head' },
      el('div', { class: 'proto-head-icon' }, proto.icon),
      el('h2', { class: 'proto-head-title' }, proto.title),
      el('p', { class: 'proto-head-desc' }, proto.desc),
      el('div', { class: 'proto-head-duration' }, proto.duration)
    ),
    ...proto.steps.map((s, i) => el('div', { class: 'proto-step' },
      el('div', { class: 'proto-step-num' }, `الخطوة ${toAR(i + 1)}: ${s.title}`),
      el('div', { class: 'proto-step-content' }, s.content)
    )),
    proto.closingQuote && el('div', { class: 'proto-closing-quote' }, proto.closingQuote)
  );
  openModal(content);
};

const openClosingRitual = () => {
  const userMsgs = conversation.filter(m => m.role === 'user');
  if (userMsgs.length < 2) {
    toast('أَكمِلي محادثتكِ مع ندى أولاً', 'warning');
    return;
  }

  const summary = generateSessionSummary(userMsgs.map(m => m.text));
  const quote = pickOne(wisdom.closing);

  const content = el('div', { class: 'closing-ritual' },
    el('div', { class: 'closing-gem' }, '✦'),
    el('div', { class: 'closing-eyebrow' }, 'إغلاق الجلسة'),
    el('h2', { class: 'closing-title' }, summary.theme),
    el('p', { class: 'closing-quote' }, quote),
    el('div', { class: 'closing-stats' },
      stat(userMsgs.length, 'رسالة'),
      stat(summary.wordCount, 'كلمة'),
      stat(Math.round((Date.now() - new Date(conversation[0].timestamp)) / 60000) || 1, 'دقيقة')
    ),
    el('div', { class: 'closing-actions' },
      el('button', {
        class: 'btn btn-primary',
        onclick: () => {
          archiveSession();
          completeSession('nada', { messages: userMsgs.length });
          closeModal();
          conversation = [];
          DB.set(STORAGE_KEY, []);
          renderMessages();
          toast('تم حفظ جلستكِ في الأرشيف', 'success');
          currentSessionId = null;
        }
      }, 'احفظي وَأَغلِقي'),
      el('button', { class: 'btn btn-ghost', onclick: closeModal }, 'تابعي')
    )
  );
  openModal(content);
};

const stat = (num, label) => el('div', { class: 'closing-stat' },
  el('div', { class: 'closing-stat-num' }, toAR(num)),
  el('div', { class: 'closing-stat-label' }, label)
);

const generateSessionSummary = (userTexts) => {
  const allText = userTexts.join(' ');
  const wordCount = allText.trim().split(/\s+/).length;
  let theme = 'مَنَحتِ نفسكِ مساحة';
  if (/تعب|إرهاق|متعبة/.test(allText)) theme = 'تَفَهَّمتِ تَعَبكِ';
  else if (/قلق|خوف|هلع/.test(allText)) theme = 'سَمَّيتِ قَلَقكِ';
  else if (/حزن|دمع|بكيت/.test(allText)) theme = 'احتَضَنتِ حُزنكِ';
  else if (/تفكير|أفكار|تدور/.test(allText)) theme = 'رَتَّبتِ أفكاركِ';
  else if (/وحدة|وحيدة/.test(allText)) theme = 'وَجَدتِ كَلِمات لِوَحدَتكِ';
  else if (/حب|علاقة|أمي|أبي/.test(allText)) theme = 'تَأَمَّلتِ في علاقاتكِ';
  return { theme, wordCount };
};

const archiveSession = () => {
  const archive = DB.get('archive', []);
  archive.unshift({
    id: Date.now(),
    sessionId: currentSessionId,
    type: 'nada',
    messages: conversation,
    summary: generateSessionSummary(conversation.filter(m => m.role === 'user').map(m => m.text)),
    timestamp: new Date().toISOString()
  });
  DB.set('archive', archive.slice(0, 500));
};

// ===== Public render =====
export const renderNada = () => {
  const view = $('#view-nada');
  if (!view) return;
  loadConversation();
  view.innerHTML = '';

  view.appendChild(el('div', { class: 'nada-header' },
    el('div', { class: 'nada-avatar' }, 'ن'),
    el('div', { class: 'nada-info' },
      el('div', { class: 'nada-name' }, 'ندى'),
      el('div', { class: 'nada-status' }, 'معكِ الآن')
    ),
    el('div', { class: 'nada-actions' },
      el('button', { class: 'nada-close-btn', title: 'إغلاق الجلسة', onclick: openClosingRitual }, '✦')
    )
  ));

  view.appendChild(el('div', { class: 'nada-messages', id: 'nada-messages' }));

  if (conversation.length <= 1) {
    const suggestions = ['حاسة بثقل', 'ما أعرف وش فيني', 'مَتعبة جداً', 'أحتاج أَتكَلَّم', 'قلقانة', 'أبكي بدون سبب'];
    view.appendChild(el('div', { class: 'nada-suggestions' },
      ...suggestions.map(s => el('button', {
        class: 'nada-suggestion',
        onclick: () => sendMessage(s)
      }, s))
    ));
  }

  view.appendChild(el('div', { class: 'nada-input-bar' },
    el('textarea', {
      class: 'nada-input',
      id: 'nada-input',
      placeholder: 'اكتبي ما تَشعرين به...',
      rows: '1',
      oninput: (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px';
        const btn = $('#nada-send-btn');
        if (btn) btn.disabled = !e.target.value.trim();
      },
      onkeydown: (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage(e.target.value);
        }
      }
    }),
    el('button', {
      class: 'nada-send',
      id: 'nada-send-btn',
      disabled: true,
      'aria-label': 'إرسال',
      onclick: () => {
        const input = $('#nada-input');
        if (input) sendMessage(input.value);
      }
    },
      el('svg', {
        viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        width: '20', height: '20',
        html: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>'
      })
    )
  ));

  renderMessages();
};
