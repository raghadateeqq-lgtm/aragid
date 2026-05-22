/* ============================================================
   ARAGID — SVG DEFINITIONS
   Reusable SVG symbols (crest, flowers, icons)
   ============================================================ */

export const svgDefs = `
<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
  <defs>

    <!-- Linear Gradients -->
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#BC7DEF"/>
      <stop offset="50%" stop-color="#A060E8"/>
      <stop offset="100%" stop-color="#6B30B8"/>
    </linearGradient>

    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5C088"/>
      <stop offset="50%" stop-color="#C9A66B"/>
      <stop offset="100%" stop-color="#8B6F3D"/>
    </linearGradient>

    <linearGradient id="roseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E5A6C0"/>
      <stop offset="100%" stop-color="#A57892"/>
    </linearGradient>

    <linearGradient id="rescueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#BC7DEF"/>
      <stop offset="50%" stop-color="#C9A66B"/>
      <stop offset="100%" stop-color="#A060E8"/>
    </linearGradient>

    <!-- Main Crest (Floral) -->
    <symbol id="crest-flower" viewBox="0 0 100 100">
      <g transform="translate(50, 50)">
        <!-- Outer petals -->
        <g opacity="0.85">
          <ellipse rx="8" ry="18" fill="url(#brandGrad)" transform="rotate(0)"/>
          <ellipse rx="8" ry="18" fill="url(#brandGrad)" transform="rotate(60)"/>
          <ellipse rx="8" ry="18" fill="url(#brandGrad)" transform="rotate(120)"/>
          <ellipse rx="8" ry="18" fill="url(#brandGrad)" transform="rotate(180)"/>
          <ellipse rx="8" ry="18" fill="url(#brandGrad)" transform="rotate(240)"/>
          <ellipse rx="8" ry="18" fill="url(#brandGrad)" transform="rotate(300)"/>
        </g>
        <!-- Inner petals -->
        <g opacity="0.9">
          <ellipse rx="5" ry="12" fill="url(#roseGrad)" transform="rotate(30)"/>
          <ellipse rx="5" ry="12" fill="url(#roseGrad)" transform="rotate(90)"/>
          <ellipse rx="5" ry="12" fill="url(#roseGrad)" transform="rotate(150)"/>
          <ellipse rx="5" ry="12" fill="url(#roseGrad)" transform="rotate(210)"/>
          <ellipse rx="5" ry="12" fill="url(#roseGrad)" transform="rotate(270)"/>
          <ellipse rx="5" ry="12" fill="url(#roseGrad)" transform="rotate(330)"/>
        </g>
        <!-- Center -->
        <circle r="6" fill="url(#goldGrad)"/>
        <circle r="3" fill="#FFF8E7"/>
      </g>
    </symbol>

    <!-- Flower 1: Rose -->
    <symbol id="flower-rose" viewBox="0 0 50 50">
      <g>
        <circle cx="25" cy="18" r="6" fill="#C49AAE" opacity="0.9"/>
        <circle cx="18" cy="22" r="5" fill="#A060E8" opacity="0.85"/>
        <circle cx="32" cy="22" r="5" fill="#A060E8" opacity="0.85"/>
        <circle cx="22" cy="28" r="5" fill="#C49AAE" opacity="0.85"/>
        <circle cx="28" cy="28" r="5" fill="#C49AAE" opacity="0.85"/>
        <circle cx="25" cy="24" r="3" fill="#C9A66B"/>
        <line x1="25" y1="32" x2="25" y2="48" stroke="#5a4878" stroke-width="1.5"/>
        <path d="M 25 38 Q 20 36 18 40" stroke="#5a4878" stroke-width="1.2" fill="none"/>
      </g>
    </symbol>

    <!-- Flower 2: Tulip -->
    <symbol id="flower-tulip" viewBox="0 0 50 50">
      <g>
        <ellipse cx="25" cy="20" rx="8" ry="11" fill="url(#brandGrad)" opacity="0.9"/>
        <ellipse cx="25" cy="20" rx="4" ry="7" fill="#C49AAE"/>
        <circle cx="25" cy="18" r="2" fill="#C9A66B"/>
        <line x1="25" y1="31" x2="25" y2="48" stroke="#5a4878" stroke-width="1.5"/>
        <path d="M 25 36 Q 30 34 32 38" stroke="#5a4878" stroke-width="1.2" fill="none"/>
      </g>
    </symbol>

    <!-- Flower 3: Daisy -->
    <symbol id="flower-daisy" viewBox="0 0 50 50">
      <g>
        <ellipse cx="20" cy="20" rx="3" ry="6" fill="#E8C4FF" opacity="0.9" transform="rotate(-25 20 20)"/>
        <ellipse cx="30" cy="20" rx="3" ry="6" fill="#E8C4FF" opacity="0.9" transform="rotate(25 30 20)"/>
        <ellipse cx="25" cy="15" rx="3" ry="6" fill="#E8C4FF" opacity="0.9"/>
        <ellipse cx="17" cy="25" rx="3" ry="6" fill="#E8C4FF" opacity="0.85" transform="rotate(-65 17 25)"/>
        <ellipse cx="33" cy="25" rx="3" ry="6" fill="#E8C4FF" opacity="0.85" transform="rotate(65 33 25)"/>
        <ellipse cx="22" cy="29" rx="3" ry="6" fill="#E8C4FF" opacity="0.85" transform="rotate(-115 22 29)"/>
        <ellipse cx="28" cy="29" rx="3" ry="6" fill="#E8C4FF" opacity="0.85" transform="rotate(115 28 29)"/>
        <circle cx="25" cy="22" r="3" fill="#C9A66B"/>
        <line x1="25" y1="30" x2="25" y2="48" stroke="#5a4878" stroke-width="1.5"/>
      </g>
    </symbol>

    <!-- Flower 4: Lotus -->
    <symbol id="flower-lotus" viewBox="0 0 50 50">
      <g>
        <path d="M25,15 Q15,20 15,28 Q15,35 25,32 Q35,35 35,28 Q35,20 25,15Z" fill="#C49AAE" opacity="0.9"/>
        <path d="M25,17 Q19,22 19,28 Q19,33 25,30 Q31,33 31,28 Q31,22 25,17Z" fill="url(#brandGrad)" opacity="0.7"/>
        <circle cx="25" cy="25" r="3" fill="#C9A66B"/>
        <line x1="25" y1="32" x2="25" y2="48" stroke="#5a4878" stroke-width="1.5"/>
      </g>
    </symbol>

    <!-- Flower 5: Bloom -->
    <symbol id="flower-bloom" viewBox="0 0 50 50">
      <g>
        <circle cx="25" cy="22" r="10" fill="url(#brandGrad)" opacity="0.9"/>
        <circle cx="25" cy="22" r="6" fill="#C49AAE"/>
        <circle cx="25" cy="22" r="3" fill="#C9A66B"/>
        <line x1="25" y1="32" x2="25" y2="48" stroke="#5a4878" stroke-width="1.5"/>
        <path d="M 25 38 Q 30 36 32 40" stroke="#5a4878" stroke-width="1.2" fill="none"/>
        <path d="M 25 42 Q 20 40 18 44" stroke="#5a4878" stroke-width="1.2" fill="none"/>
      </g>
    </symbol>

  </defs>
</svg>
`;

// Inject SVG defs into body once
export const injectSVGDefs = () => {
  if (document.getElementById('aragid-svg-defs')) return;
  const div = document.createElement('div');
  div.id = 'aragid-svg-defs';
  div.innerHTML = svgDefs;
  document.body.insertBefore(div, document.body.firstChild);
};
