/* ============================================================
   ARAGID — CORE UTILITIES (v2)
   DOM helpers, Storage, State, Notifications, Migrations
   ============================================================ */

// ===== DOM helpers =====
export const $ = (s, p = document) => p.querySelector(s);
export const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

export const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'html') node.innerHTML = v;
    else if (v != null) node.setAttribute(k, v);
  });
  children.flat().forEach(c => {
    if (c == null || c === false) return;
    node.appendChild(typeof c === 'string' || typeof c === 'number'
      ? document.createTextNode(String(c))
      : c);
  });
  return node;
};

// ===== Arabic numerals =====
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
export const toAR = n => String(n).replace(/\d/g, d => AR_DIGITS[+d]);
export const pad2 = n => String(n).padStart(2, '0');

// ===== Date helpers =====
export const todayKey = () => new Date().toISOString().slice(0, 10);

export const arDate = (d) => {
  try { return new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return ''; }
};
export const arDateShort = (d) => {
  try { return new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }); }
  catch { return ''; }
};
export const arTime = (d) => {
  try { return new Date(d).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

export const timeAgo = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (m < 1) return 'الآن';
  if (m < 60) return `قبل ${toAR(m)} دقيقة`;
  if (h < 24) return `قبل ${toAR(h)} ساعة`;
  if (days < 7) return `قبل ${toAR(days)} يوم`;
  return arDateShort(d);
};

export const trunc = (s, n) => (s && s.length > n) ? s.slice(0, n - 1) + '…' : (s || '');

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'مساء الخير';
  if (h < 12) return 'صباح الخير';
  if (h < 17) return 'مساء النور';
  if (h < 21) return 'مساء الورد';
  return 'مساء الهدوء';
};

export const timeOfDay = () => {
  const h = new Date().getHours();
  if (h < 5) return 'في هدوء الليل';
  if (h < 12) return 'في صفاء الصباح';
  if (h < 17) return 'في وسط النهار';
  if (h < 21) return 'في غروب اليوم';
  return 'في سكون المساء';
};

// ===== Storage =====
const NS = 'aragid.';
const SCHEMA_VERSION = 2;

export const DB = {
  get(k, def = null) {
    try {
      const v = localStorage.getItem(NS + k);
      return v === null ? def : JSON.parse(v);
    } catch (e) { console.warn('[DB] get failed:', k, e); return def; }
  },
  set(k, v) {
    try { localStorage.setItem(NS + k, JSON.stringify(v)); return true; }
    catch (e) { console.warn('[DB] set failed:', k, e); return false; }
  },
  remove(k) {
    try { localStorage.removeItem(NS + k); return true; } catch { return false; }
  },
  clear() {
    try {
      Object.keys(localStorage).filter(k => k.startsWith(NS)).forEach(k => localStorage.removeItem(k));
      return true;
    } catch { return false; }
  },
  exportAll() {
    const data = {};
    Object.keys(localStorage).filter(k => k.startsWith(NS)).forEach(k => {
      try { data[k.slice(NS.length)] = JSON.parse(localStorage.getItem(k)); }
      catch { data[k.slice(NS.length)] = localStorage.getItem(k); }
    });
    return data;
  },
  importAll(data) {
    try {
      Object.entries(data).forEach(([k, v]) => {
        localStorage.setItem(NS + k, JSON.stringify(v));
      });
      return true;
    } catch { return false; }
  }
};

// ===== Schema Migration =====
export const runMigrations = () => {
  const currentVersion = DB.get('schemaVersion', 0);
  if (currentVersion >= SCHEMA_VERSION) return;
  if (currentVersion < 1) {
    if (DB.get('onboardingComplete', false) && !DB.get('profileCreatedAt')) {
      DB.set('profileCreatedAt', new Date().toISOString());
    }
  }
  if (currentVersion < 2) {
    if (DB.get('mood_logs', null) === null) DB.set('mood_logs', []);
  }
  DB.set('schemaVersion', SCHEMA_VERSION);
};

// ===== App State =====
export const state = {
  view: 'home',
  user: null,
  dnd: false,
  ambience: true,
  currentSessionId: null,
  init() {
    this.user = DB.get('profile', null);
    this.dnd = DB.get('dnd', false);
    this.ambience = DB.get('ambience', true);
    return this;
  }
};

// ===== Toast =====
let toastTimer = null;
export const toast = (msg, type = '', dur = 2500) => {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, dur);
};

// ===== Haptics =====
export const haptic = (pattern = 10) => {
  if (state.dnd) return;
  if ('vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
};

// ===== Audio =====
let audioCtx = null;
export const playTone = (freq = 528, duration = 0.3, type = 'sine') => {
  if (!state.ambience || state.dnd) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) { console.warn('[Audio] failed:', e); }
};

// ===== Modal =====
export const openModal = (content, opts = {}) => {
  const m = $('#modal');
  const body = $('#modalBody');
  if (!m || !body) return;
  body.innerHTML = '';
  if (typeof content === 'string') body.innerHTML = content;
  else body.appendChild(content);
  if (opts.size) m.dataset.size = opts.size; else delete m.dataset.size;
  m.classList.add('show');
  setTimeout(() => {
    const focusable = body.querySelector('button, input, textarea');
    focusable?.focus();
  }, 100);
};

export const closeModal = () => { $('#modal')?.classList.remove('show'); };

// ===== Routing =====
export const router = {
  go(viewName) {
    $$('.view').forEach(v => v.classList.remove('active'));
    const target = $(`#view-${viewName}`);
    if (!target) {
      console.warn('[Router] view not found:', viewName);
      $('#view-home')?.classList.add('active');
      viewName = 'home';
    } else {
      target.classList.add('active');
    }
    $$('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.go === viewName));
    state.view = viewName;
    DB.set('lastView', viewName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.viewHandlers?.[viewName]) {
      try { window.viewHandlers[viewName](); }
      catch (e) { console.error(`[Router] render error for ${viewName}:`, e); }
    }
  }
};

// ===== Streak =====
export const updateStreak = () => {
  const today = todayKey();
  const last = DB.get('lastActive', null);
  let streak = DB.get('streak', 0);
  if (last === today) return streak;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (last === yesterday) streak += 1;
  else streak = 1;
  DB.set('lastActive', today);
  DB.set('streak', streak);
  if (streak > DB.get('streakBest', 0)) DB.set('streakBest', streak);
  return streak;
};

// ===== Particles =====
export const initParticles = () => {
  const container = $('#particles');
  if (!container) return;
  container.innerHTML = '';
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const count = window.innerWidth < 768 ? 12 : 24;
  for (let i = 0; i < count; i++) {
    const p = el('div', { class: 'particle' });
    const size = 1 + Math.random() * 2;
    p.style.left = Math.random() * 100 + '%';
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.animationDuration = (15 + Math.random() * 20) + 's';
    p.style.animationDelay = (Math.random() * 20) + 's';
    container.appendChild(p);
  }
};

// ===== Sessions =====
export const startSession = (type = 'general') => {
  const sessionId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  state.currentSessionId = sessionId;
  return sessionId;
};

export const completeSession = (type = 'general', meta = {}) => {
  const sessions = DB.get('sessions', []);
  const entry = {
    id: state.currentSessionId || `${type}-${Date.now()}`,
    type,
    timestamp: new Date().toISOString(),
    ...meta
  };
  sessions.push(entry);
  DB.set('sessions', sessions.slice(-1000));
  const id = state.currentSessionId;
  state.currentSessionId = null;
  return id || entry.id;
};

export const incrementSession = (type = 'general') => {
  const sid = startSession(type);
  completeSession(type);
  return sid;
};

// ===== Garden =====
export const addFlower = (type = 'plum', meta = {}) => {
  const garden = DB.get('garden', []);
  garden.push({ id: Date.now(), type, plantedAt: new Date().toISOString(), ...meta });
  DB.set('garden', garden);
  return garden.length;
};

// ===== Helpers =====
export const countWords = (text) => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
};

export const escapeHTML = (s) => {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = String(s);
  return div.innerHTML;
};

export const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

// ===== Premium =====
export const isPremium = () => DB.get('premium', false) === true;
export const isInDemoMode = () => DB.get('demoMode', false) === true;

export const canUseFeature = (feature) => {
  if (isPremium()) return { ok: true };
  const quotas = {
    weeklyReport: { max: 1, period: 7 },
    monthlyReset: { max: 0, period: 30 },
    nadaMessages: { max: 30, period: 1 },
    letters: { max: 3, period: null }
  };
  const q = quotas[feature];
  if (!q) return { ok: true };
  if (q.max === 0) return { ok: false, reason: 'premium-only', feature };
  if (q.period) {
    const cutoff = Date.now() - q.period * 86400000;
    const usage = (DB.get('usage', {})[feature] || []).filter(t => t > cutoff);
    if (usage.length >= q.max) return { ok: false, reason: 'quota', feature, used: usage.length, max: q.max };
  } else {
    const items = DB.get(feature === 'letters' ? 'letters' : feature, []);
    if (items.length >= q.max) return { ok: false, reason: 'cap', feature, count: items.length, max: q.max };
  }
  return { ok: true };
};

export const trackFeatureUsage = (feature) => {
  const usage = DB.get('usage', {});
  usage[feature] = usage[feature] || [];
  usage[feature].push(Date.now());
  usage[feature] = usage[feature].slice(-100);
  DB.set('usage', usage);
};
