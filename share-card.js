/* ============================================================
   ARAGID — SHARE CARD GENERATOR
   ترسم بطاقة PNG قابلة للمشاركة (Instagram Story 1080x1920)
   ============================================================ */

import { toAR } from './core.js';

// Helper: load gradient
const drawGradientBg = (ctx, w, h) => {
  // Deep plum background
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#3A1F6B');
  g.addColorStop(0.5, '#1A0F2E');
  g.addColorStop(1, '#0A0612');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Aurora glow - plum
  const aur1 = ctx.createRadialGradient(w * 0.2, h * 0.2, 0, w * 0.2, h * 0.2, w * 0.7);
  aur1.addColorStop(0, 'rgba(160, 96, 232, 0.45)');
  aur1.addColorStop(1, 'rgba(160, 96, 232, 0)');
  ctx.fillStyle = aur1;
  ctx.fillRect(0, 0, w, h);

  // Aurora glow - rose
  const aur2 = ctx.createRadialGradient(w * 0.8, h * 0.8, 0, w * 0.8, h * 0.8, w * 0.6);
  aur2.addColorStop(0, 'rgba(196, 154, 174, 0.28)');
  aur2.addColorStop(1, 'rgba(196, 154, 174, 0)');
  ctx.fillStyle = aur2;
  ctx.fillRect(0, 0, w, h);

  // Subtle gold glow center
  const aur3 = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5);
  aur3.addColorStop(0, 'rgba(201, 166, 107, 0.10)');
  aur3.addColorStop(1, 'rgba(201, 166, 107, 0)');
  ctx.fillStyle = aur3;
  ctx.fillRect(0, 0, w, h);
};

// Draw crest (floral mark)
const drawCrest = (ctx, x, y, size, color = '#C9A66B') => {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  // 6 petals around
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 3);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.12, size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Inner core
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#E5C088';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

// Decorative top/bottom divider
const drawDivider = (ctx, y, w) => {
  ctx.save();
  ctx.fillStyle = 'rgba(201, 166, 107, 0.5)';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(w / 2 + i * 40, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

// Wrap text
const wrapText = (ctx, text, maxWidth) => {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
};

// ===== Main: Build session summary card =====
export const buildSessionCard = ({ title, subtitle, lines, footer }) => {
  const w = 1080, h = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';

  drawGradientBg(ctx, w, h);

  // Brand line top
  ctx.fillStyle = 'rgba(201, 166, 107, 0.75)';
  ctx.font = '300 28px "Tajawal", sans-serif';
  ctx.fillText('✦  أَراغـيد  ·  ARAGID  ✦', w / 2, 180);

  // Crest
  drawCrest(ctx, w / 2, 380, 140);

  // Eyebrow
  ctx.fillStyle = 'rgba(229, 192, 136, 0.85)';
  ctx.font = '500 32px "Tajawal", sans-serif';
  ctx.fillText(subtitle || 'لحظة من رحلتي', w / 2, 600);

  // Title (large, display)
  ctx.fillStyle = '#F0E4CC';
  ctx.font = '600 78px "Reem Kufi", "Tajawal", sans-serif';
  const titleLines = wrapText(ctx, title || 'مساحتي الخاصة', w - 200);
  let titleY = 720;
  titleLines.forEach(line => { ctx.fillText(line, w / 2, titleY); titleY += 100; });

  // Divider
  drawDivider(ctx, titleY + 40, w);

  // Body lines
  ctx.fillStyle = 'rgba(240, 228, 204, 0.92)';
  ctx.font = '400 44px "Tajawal", sans-serif';
  let bodyY = titleY + 160;
  (lines || []).forEach(line => {
    const wrapped = wrapText(ctx, line, w - 200);
    wrapped.forEach(l => { ctx.fillText(l, w / 2, bodyY); bodyY += 72; });
    bodyY += 32;
  });

  // Footer divider
  drawDivider(ctx, h - 280, w);

  // Footer
  ctx.fillStyle = 'rgba(201, 166, 107, 0.7)';
  ctx.font = '300 28px "Tajawal", sans-serif';
  ctx.fillText(footer || 'مساحتي الخاصة. للحظات لا تُقال.', w / 2, h - 200);

  ctx.fillStyle = 'rgba(240, 228, 204, 0.5)';
  ctx.font = '300 22px "Tajawal", sans-serif';
  ctx.fillText('aragid.app', w / 2, h - 140);

  return canvas;
};

// ===== Build weekly report card =====
export const buildWeeklyCard = (report) => {
  const lines = [];
  if (report.avgMood !== null) lines.push(`متوسط شعوري: ${toAR(report.avgMood)} من ١٠`);
  if (report.sessions > 0) lines.push(`${toAR(report.sessions)} جلسة هذا الأسبوع`);
  if (report.words > 0) lines.push(`${toAR(report.words)} كلمة كَتَبتُها لنفسي`);
  if (report.lift?.improvedPercent >= 50) {
    lines.push(`${toAR(report.lift.improvedPercent)}٪ من جلساتي تنفعني`);
  }
  return buildSessionCard({
    title: 'أسبوعي مع أراغيد',
    subtitle: 'تقريري الأسبوعي',
    lines,
    footer: report.theme ? `موضوع أسبوعي: ${report.theme}` : 'مساحتي الخاصة'
  });
};

// ===== Build mood lift card =====
export const buildLiftCard = ({ pre, post, sessionType }) => {
  const labels = {
    write: 'الكتابة',
    nada: 'محادثة مع ندى',
    rescue: 'إنقاذ',
    emdr: 'تأرجح بصري',
    protocol: 'بروتوكول'
  };
  const type = labels[sessionType] || 'جلسة';
  return buildSessionCard({
    title: 'هَدَأتُ',
    subtitle: type,
    lines: [
      `قبل: ${toAR(pre)} من ١٠`,
      `بعد: ${toAR(post)} من ١٠`,
      `+${toAR(post - pre)} درجة هدوء`
    ],
    footer: 'لحظة مَلَكتُها لنفسي'
  });
};

// ===== Download canvas as PNG =====
export const downloadCanvas = (canvas, filename = 'aragid-share.png') => {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve(true);
    }, 'image/png', 0.95);
  });
};

// ===== Share via Web Share API (if available) =====
export const shareCanvas = async (canvas, { title, text }) => {
  if (!navigator.canShare) return false;
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return resolve(false);
      const file = new File([blob], 'aragid-share.png', { type: 'image/png' });
      try {
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title, text });
          resolve(true);
        } else {
          resolve(false);
        }
      } catch (e) {
        resolve(false);
      }
    }, 'image/png', 0.95);
  });
};
