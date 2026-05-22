/* ============================================================
   ARAGID — GARDEN (v2)
   Mental garden: flowers tied to real sessions + meaningful milestones
   ============================================================ */

import { $, el, DB, toAR, arDateShort, arDate, router, toast } from './core.js';

const MILESTONES = [
  { count: 1,  label: 'البذرة الأولى', icon: '🌱', sub: 'بدأتِ رحلتكِ' },
  { count: 7,  label: 'الأسبوع الأول', icon: '🌿', sub: 'عادة تتكوّن' },
  { count: 14, label: 'أسبوعان',       icon: '🌸', sub: 'الجذور تَتمدّد' },
  { count: 21, label: 'حديقة كاملة',   icon: '✦',  sub: 'عادة راسخة' },
  { count: 30, label: 'شهر متواصل',    icon: '🌺', sub: 'تحوّل حقيقي' },
  { count: 60, label: 'شهران',         icon: '🌷', sub: 'أنتِ نفسكِ الجديدة' },
  { count: 100,label: 'مئة زهرة',      icon: '✿',  sub: 'سَفَر طويل، أنتِ بَطَلَتُه' }
];

export const renderGarden = () => {
  const view = $('#view-garden');
  if (!view) return;
  view.innerHTML = '';

  const garden = DB.get('garden', []);

  // Find next milestone
  const nextMilestone = MILESTONES.find(m => m.count > garden.length) || MILESTONES[MILESTONES.length - 1];
  const lastMilestone = [...MILESTONES].reverse().find(m => m.count <= garden.length);
  const progressFromLast = lastMilestone ? garden.length - lastMilestone.count : garden.length;
  const distanceToNext = nextMilestone.count - garden.length;
  const milestoneSpan = nextMilestone.count - (lastMilestone?.count || 0);
  const milestonePercent = Math.min(100, (progressFromLast / milestoneSpan) * 100);

  view.appendChild(el('div', { class: 'garden-header' },
    el('div', { class: 'view-eyebrow' }, '✿  حديقتكِ الداخلية  ✿'),
    el('div', { class: 'view-title' }, 'كل زهرة لحظة منكِ'),
    el('div', { class: 'view-desc' }, 'تَنمو مع كل جلسة كتابة، حديث، أو هدوء. خاصة بكِ — لا أحد يراها.')
  ));

  // Empty state
  if (garden.length === 0) {
    view.appendChild(el('div', { class: 'empty-state empty-state-rich' },
      el('div', { class: 'empty-gem' }, '🌱'),
      el('div', { class: 'empty-title' }, 'حديقتكِ تنتظر بذرتكِ الأولى'),
      el('div', { class: 'empty-desc' },
        'كل جلسة كتابة تُنبت زهرة. كل محادثة مع ندى تُنبت زهرة. ',
        'كل لحظة هدوء — زهرة.',
        el('br'), el('br'),
        'ابدئي بأول جلسة الآن. ٧ دقائق فقط.'
      ),
      el('div', { class: 'empty-actions' },
        el('button', { class: 'btn btn-primary', onclick: () => router.go('write') }, 'اكتبي'),
        el('button', { class: 'btn btn-ghost', onclick: () => router.go('nada') }, 'حَدِّثي ندى')
      )
    ));
    return;
  }

  // Next milestone card
  view.appendChild(el('div', { class: 'milestone-card' },
    el('div', { class: 'milestone-card-head' },
      el('div', { class: 'milestone-icon' }, nextMilestone.icon),
      el('div', {},
        el('div', { class: 'milestone-eyebrow' }, 'المرحلة القادمة'),
        el('div', { class: 'milestone-title' }, nextMilestone.label),
        el('div', { class: 'milestone-sub' }, nextMilestone.sub)
      )
    ),
    el('div', { class: 'progress-bar-outer' },
      el('div', { class: 'progress-bar-fill', style: { width: milestonePercent + '%' } })
    ),
    el('div', { class: 'milestone-foot' },
      el('span', {}, `${toAR(garden.length)} / ${toAR(nextMilestone.count)} زهرة`),
      el('span', {}, distanceToNext > 0
        ? `${toAR(distanceToNext)} زهرة لِبلوغها`
        : '✦ بَلَغتِها — أحسنتِ')
    )
  ));

  // Garden grid (display flowers)
  const flowerTypes = ['rose', 'tulip', 'daisy', 'lotus', 'bloom'];
  const grid = el('div', { class: 'garden-grid' });

  garden.forEach((flower, i) => {
    const type = flower.type || flowerTypes[i % flowerTypes.length];
    const tile = el('div', { class: 'flower-tile' },
      el('svg', {
        viewBox: '0 0 50 50',
        html: `<use href="#flower-${type}"/>`
      })
    );
    tile.addEventListener('click', () => {
      const date = arDateShort(flower.plantedAt);
      toast(`زهرة من ${date}`);
    });
    grid.appendChild(tile);
  });

  // Empty future slots — show next 6 to next milestone
  const slots = Math.min(6, distanceToNext);
  for (let i = 0; i < slots; i++) {
    grid.appendChild(el('div', { class: 'flower-tile empty' }, '✦'));
  }

  view.appendChild(grid);

  // Achievements
  const earnedMilestones = MILESTONES.filter(m => m.count <= garden.length);
  if (earnedMilestones.length > 0) {
    view.appendChild(el('div', { class: 'section-title' }, 'مَراحلكِ المُنجَزة'));
    const achievements = el('div', { class: 'achievements-list' });
    earnedMilestones.forEach(m => {
      achievements.appendChild(el('div', { class: 'achievement-row' },
        el('div', { class: 'achievement-icon' }, m.icon),
        el('div', { class: 'achievement-info' },
          el('div', { class: 'achievement-label' }, m.label),
          el('div', { class: 'achievement-sub' }, m.sub)
        ),
        el('div', { class: 'achievement-check' }, '✓')
      ));
    });
    view.appendChild(achievements);
  }

  // CTA
  view.appendChild(el('div', { class: 'garden-cta' },
    el('button', {
      class: 'btn btn-primary',
      onclick: () => router.go('write')
    }, 'ازرعي زهرة جديدة')
  ));
};
