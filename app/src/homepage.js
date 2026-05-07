let _clickHandler = null;
let _hideTimer = null;

const C = {
  bg: '#0d1f0e',
  bgDark: '#091509',
  card: '#122614',
  cardBorder: '#1e3a20',
  gold: '#c9a84c',
  goldDark: '#a8872e',
  text: '#ffffff',
  muted: '#6a8a6c',
  heroBg: 'linear-gradient(160deg, #0d2a0f, #091a0a)',
};

const EMOJI = {
  'campus-tour': '🗺️',
  'academics-tour': '📚',
  'athletics-tour': '🏟️',
  'arts-tour': '🎨',
  'career-tech-tour': '🔧',
};

function injectStyles() {
  if (document.getElementById('hp-styles')) return;
  const style = document.createElement('style');
  style.id = 'hp-styles';
  style.textContent = `
    #homepage {
      position: fixed;
      inset: 0;
      z-index: 10;
      background: ${C.bg};
      color: ${C.text};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow-y: auto;
      transition: opacity 0.3s ease;
    }

    /* ── Nav bar (desktop only) ── */
    .hp-nav {
      background: ${C.bgDark};
      padding: 0 2rem;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid ${C.cardBorder};
    }
    .hp-nav-brand { font-size: 1.1rem; font-weight: 700; color: ${C.gold}; letter-spacing: 0.05em; }
    .hp-nav-school { font-size: 0.85rem; color: ${C.muted}; }

    /* ── Hero banner (desktop only) ── */
    .hp-hero {
      background: ${C.heroBg};
      padding: 3rem 2rem 2.5rem;
      text-align: center;
      border-bottom: 1px solid ${C.cardBorder};
    }
    .hp-hero-label { font-size: 0.85rem; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; }
    .hp-hero-heading { font-size: 2.2rem; font-weight: 800; color: ${C.text}; margin-bottom: 0.75rem; }
    .hp-hero-subtitle { font-size: 1rem; color: ${C.muted}; }

    /* ── Tour cards — shared ── */
    .hp-card {
      background: ${C.card};
      border: 1px solid ${C.cardBorder};
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .hp-card:hover { transform: translateY(-2px); border-color: ${C.gold}; }
    .hp-card-thumb { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; background: ${C.bgDark}; }
    .hp-card-body { padding: 1rem; }
    .hp-card-emoji { font-size: 1.5rem; margin-bottom: 0.4rem; }
    .hp-card-name { font-size: 1rem; font-weight: 700; color: ${C.text}; margin-bottom: 0.3rem; }
    .hp-card-desc { font-size: 0.8rem; color: ${C.muted}; }

    /* ── Campus CTA bar — shown below grid ── */
    .hp-campus-cta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      background: linear-gradient(90deg, ${C.goldDark}, ${C.gold}, ${C.goldDark});
      color: #0d1f0e;
      padding: 1.25rem 2rem;
      cursor: pointer;
      font-weight: 700;
      font-size: 1.1rem;
      transition: opacity 0.15s ease;
      margin: 0 2rem 2rem;
      border-radius: 10px;
    }
    .hp-campus-cta:hover { opacity: 0.9; }

    /* ── Desktop layout: show nav+hero+grid+cta, hide mobile pieces ── */
    @media (min-width: 768px) {
      .hp-nav { display: flex; }
      .hp-hero { display: block; }
      .hp-tour-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; padding: 2rem; max-width: 900px; margin: 0 auto; }
      .hp-campus-cta { display: flex; }

      /* In the grid, campus card is hidden — shown only as CTA bar */
      .hp-campus-card-wrapper { display: none; }

      .hp-mobile-header { display: none; }
      .hp-mobile-campus { display: none; }
      .hp-mobile-desc { display: block; }
    }

    /* ── Mobile layout ── */
    @media (max-width: 767px) {
      .hp-nav { display: none; }
      .hp-hero { display: none; }
      .hp-tour-grid { display: flex; flex-direction: column; padding: 0.75rem; gap: 0.75rem; }
      .hp-campus-cta { display: none; }

      .hp-campus-card-wrapper { display: flex; }
      .hp-card { display: flex; align-items: center; gap: 0.9rem; border-radius: 10px; }
      .hp-card-thumb { display: none; }
      .hp-card-body { display: flex; align-items: center; gap: 0.9rem; padding: 0.9rem 1rem; flex: 1; }

      .hp-mobile-campus {
        background: linear-gradient(135deg, ${C.goldDark}, ${C.gold}) !important;
        color: #0d1f0e !important;
        font-weight: 700;
      }
      .hp-mobile-campus .hp-card-name { color: #0d1f0e; }
      .hp-mobile-campus .hp-card-desc { color: rgba(0,0,0,0.7); }
      .hp-mobile-header {
        background: ${C.bgDark};
        padding: 1rem 1.25rem;
        border-bottom: 1px solid ${C.cardBorder};
        font-size: 1.1rem;
        font-weight: 700;
        color: ${C.text};
      }
      .hp-chevron { color: ${C.gold}; font-size: 1.2rem; margin-left: auto; }
    }
  `;
  document.head.appendChild(style);
}

export function showHomepage(tours, onSelect) {
  injectStyles();

  const el = document.getElementById('homepage');
  if (!el) throw new Error('homepage.js: #homepage element not found in DOM');
  el.style.display = 'block';
  el.style.opacity = '1';

  const campusTour = tours.find(t => t.id === 'campus-tour');
  const themedTours = tours.filter(t => t.id !== 'campus-tour');

  // Each tour gets exactly ONE [data-tour-id] element.
  // Campus tour: rendered as a card inside the grid AND as a CTA bar — but only ONE carries data-tour-id.
  // To stay at exactly 5 total data-tour-id elements, the CTA bar below is a visual duplicate
  // that delegates clicks through the grid card.  We solve this by using a SINGLE data-tour-id
  // per tour: themed tours inside the grid, campus tour as the CTA bar (not duplicated in grid).

  const themedCardHtml = themedTours.map(t => `
    <div class="hp-card" data-tour-id="${t.id}">
      <img class="hp-card-thumb" src="${t.thumbnail}" alt="${t.name}" />
      <div class="hp-card-body">
        <div class="hp-card-emoji">${EMOJI[t.id] || '🏫'}</div>
        <div class="hp-card-name">${t.name}</div>
        <div class="hp-card-desc">${t.description}</div>
      </div>
    </div>
  `).join('');

  const campusCtaHtml = campusTour ? `
    <div class="hp-campus-cta" data-tour-id="${campusTour.id}">
      <span>${EMOJI[campusTour.id] || '🗺️'}</span>
      <span>Take the Full Campus Tour</span>
      <span>→</span>
    </div>
  ` : '';

  el.innerHTML = `
    <!-- Desktop: nav bar -->
    <nav class="hp-nav">
      <div class="hp-nav-brand">SBHS Virtual Tours</div>
      <div class="hp-nav-school">Santa Barbara High School</div>
    </nav>

    <!-- Mobile: compact header -->
    <div class="hp-mobile-header">Santa Barbara High School</div>

    <!-- Desktop: hero banner -->
    <div class="hp-hero">
      <div class="hp-hero-label">Welcome to</div>
      <h1 class="hp-hero-heading">Santa Barbara High School</h1>
      <p class="hp-hero-subtitle">Explore our campus through immersive virtual tours</p>
    </div>

    <!-- Tour grid: themed tours (+ campus card on mobile) -->
    <div class="hp-tour-grid">
      ${campusTour ? `
      <div class="hp-campus-card-wrapper hp-mobile-campus hp-card" data-tour-id="${campusTour.id}">
        <div class="hp-card-body">
          <div class="hp-card-emoji">${EMOJI[campusTour.id] || '🗺️'}</div>
          <div>
            <div class="hp-card-name">${campusTour.name}</div>
            <div class="hp-card-desc">${campusTour.description}</div>
          </div>
          <div class="hp-chevron">›</div>
        </div>
      </div>` : ''}
      ${themedCardHtml}
    </div>

    <!-- Desktop: full campus CTA bar (visual only, click handled via delegation) -->
    ${campusCtaHtml}
  `;

  // Remove the duplicate data-tour-id from CTA bar when campus tour is present —
  // the grid card already has data-tour-id="campus-tour".
  // Make the CTA bar trigger the grid card's click instead.
  if (campusTour) {
    const ctaBar = el.querySelector('.hp-campus-cta');
    if (ctaBar) {
      ctaBar.removeAttribute('data-tour-id');
      ctaBar.addEventListener('click', () => {
        const gridCard = el.querySelector('.hp-campus-card-wrapper');
        if (gridCard) gridCard.click();
        else onSelect(campusTour.id);
      });
    }
  }

  // Event delegation: one listener on the container (replace previous to avoid accumulation)
  if (_clickHandler) el.removeEventListener('click', _clickHandler);
  _clickHandler = (e) => {
    const target = e.target.closest('[data-tour-id]');
    if (target) onSelect(target.dataset.tourId);
  };
  el.addEventListener('click', _clickHandler);
}

export function hideHomepage() {
  const el = document.getElementById('homepage');
  if (!el) throw new Error('homepage.js: #homepage element not found in DOM');
  if (_hideTimer) clearTimeout(_hideTimer);
  el.style.transition = 'opacity 0.3s ease';
  el.style.opacity = '0';

  return new Promise(resolve => {
    _hideTimer = setTimeout(() => {
      _hideTimer = null;
      el.style.display = 'none';
      resolve();
    }, 300);
  });
}
