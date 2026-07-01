'use strict';

// ── Footer year ───────────────────────────────────────────
(function () {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
})();

// ── Progress bar ──────────────────────────────────────────
(function () {
  const fill = document.getElementById('progress-bar__fill');
  if (!fill) return;
  function update() {
    const scrolled  = window.scrollY;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    fill.style.width = (maxScroll > 0 ? Math.min(100, (scrolled / maxScroll) * 100) : 0) + '%';
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

// ── Sticky navigation ─────────────────────────────────────
(function () {
  const nav  = document.getElementById('main-nav');
  const hero = document.getElementById('hero');
  if (!nav || !hero) return;

  new IntersectionObserver(
    ([e]) => nav.classList.toggle('nav--scrolled', !e.isIntersecting),
    { threshold: 0.05 }
  ).observe(hero);
})();

// ── Mobile menu ───────────────────────────────────────────
(function () {
  const toggle = document.getElementById('nav-toggle');
  const menu   = document.getElementById('nav-menu');
  const nav    = document.getElementById('main-nav');
  if (!toggle || !menu) return;

  let isOpen = false;

  function open() {
    isOpen = true;
    menu.classList.add('nav__menu--open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Navigation schließen');
    document.body.style.overflow = 'hidden';
    const bars = toggle.querySelectorAll('.nav__toggle-bar');
    if (bars[0]) bars[0].style.transform = 'translateY(7px) rotate(45deg)';
    if (bars[1]) bars[1].style.opacity   = '0';
    if (bars[2]) bars[2].style.transform = 'translateY(-7px) rotate(-45deg)';
  }

  function close() {
    isOpen = false;
    menu.classList.remove('nav__menu--open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Navigation öffnen');
    document.body.style.overflow = '';
    const bars = toggle.querySelectorAll('.nav__toggle-bar');
    if (bars[0]) bars[0].style.transform = '';
    if (bars[1]) bars[1].style.opacity   = '';
    if (bars[2]) bars[2].style.transform = '';
  }

  toggle.addEventListener('click', () => isOpen ? close() : open());
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) { close(); toggle.focus(); } });
  document.addEventListener('click', e => { if (isOpen && nav && !nav.contains(e.target)) close(); });
})();

// ── Smooth scroll with nav offset ─────────────────────────
(function () {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function (e) {
      const id     = this.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const navH = document.getElementById('main-nav')?.offsetHeight || 70;
      const top  = target.getBoundingClientRect().top + window.scrollY - navH - 8;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();

// ── Scroll reveal ─────────────────────────────────────────
(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = document.querySelectorAll('.reveal');
  if (prefersReduced) { items.forEach(el => el.classList.add('reveal--visible')); return; }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal--visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  items.forEach(el => observer.observe(el));
})();

// ── Nav scroll spy ────────────────────────────────────────
(function () {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav__link[href^="#"]');
  if (!sections.length || !links.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(link => {
          link.classList.toggle('nav__link--active',
            link.getAttribute('href') === '#' + entry.target.id);
        });
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => observer.observe(s));
})();

// ── Tour search + filter ──────────────────────────────────
(function () {
  const searchInput = document.getElementById('tour-search');
  const filterBtns  = document.querySelectorAll('.filter-btn');
  const tourItems   = document.querySelectorAll('.tour-item');
  const emptyMsg    = document.getElementById('tour-empty-msg');
  if (!searchInput && !filterBtns.length) return;

  let activeFilter = 'all';
  let searchQuery  = '';

  function applyFilters() {
    let visible = 0;
    tourItems.forEach(item => {
      const type   = item.dataset.type   || '';
      const status = item.dataset.status || '';
      const search = (item.dataset.search || '') + ' ' + (item.querySelector('.tour-item__title')?.textContent || '');

      const matchesFilter =
        activeFilter === 'all'      ? true :
        activeFilter === 'upcoming' ? status === 'upcoming' :
        type === activeFilter;

      const matchesSearch = !searchQuery || search.toLowerCase().includes(searchQuery.toLowerCase());

      const show = matchesFilter && matchesSearch;
      item.classList.toggle('tour-item--hidden', !show);
      if (show) visible++;
    });

    if (emptyMsg) emptyMsg.hidden = visible > 0;
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('filter-btn--active'));
      btn.classList.add('filter-btn--active');
      activeFilter = btn.dataset.filter;
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim();
      applyFilters();
    });
  }
})();

// ── Globe hero animation ──────────────────────────────────
(function () {
  'use strict';

  const section = document.getElementById('hero');
  if (!section || !section.classList.contains('globe-hero')) return;

  const canvas  = document.getElementById('globe-canvas');
  const content = document.getElementById('globe-content');
  const ctaEl   = document.getElementById('globe-cta');
  const cueEl   = document.getElementById('globe-scroll-cue');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const DEG = Math.PI / 180;

  // Steinenberg, Rudersberg
  const TGT_LON = 9.55, TGT_LAT = 48.86;

  let W, H, stars = [], rotLon = 30, lastTime = 0;

  // Simplified continent outlines [lon, lat]
  const CONTS = [
    [[-168,70],[-130,55],[-125,49],[-117,32],[-100,50],[-85,45],[-78,43],[-70,44],
     [-60,46],[-65,44],[-80,30],[-80,24],[-88,15],[-85,10],[-78,8],
     [-90,18],[-100,18],[-108,22],[-120,30],[-130,52],[-165,68],[-168,70]],// N America
    [[-75,76],[-45,60],[-18,65],[-18,76],[-35,84],[-55,84],[-75,76]],       // Greenland
    [[-24,64],[-13,63],[-13,66],[-22,66],[-24,64]],                          // Iceland
    [[-80,12],[-65,12],[-55,5],[-50,0],[-38,-8],[-40,-22],
     [-48,-28],[-53,-34],[-68,-56],[-75,-50],[-80,-35],[-75,-18],[-80,12]], // S America
    [[-10,36],[0,37],[10,38],[16,38],[28,42],[30,45],[36,45],[30,50],
     [36,55],[28,60],[30,65],[26,70],[15,70],[5,62],[0,58],[-5,50],[-10,36]],// Europe
    [[-18,16],[-10,5],[0,5],[10,5],[20,12],[32,12],[42,12],[52,12],
     [44,-10],[36,-20],[32,-30],[28,-35],[22,-35],[10,-22],[0,-5],[-18,16]], // Africa
    [[30,70],[60,70],[80,72],[100,72],[150,70],[140,48],[150,40],[142,35],
     [130,32],[118,22],[110,2],[100,5],[80,8],[68,22],[55,42],[45,38],
     [35,36],[28,42],[36,45],[30,50],[36,55],[28,60],[30,65],[30,70]],       // Asia
    [[130,32],[135,35],[141,40],[140,43],[132,40],[130,32]],                  // Japan
    [[115,-35],[125,-30],[135,-22],[150,-22],[152,-28],[152,-38],
     [146,-38],[138,-35],[120,-35],[115,-35]],                                // Australia
  ];

  // ── Helpers ──────────────────────────────────────────────
  const clamp  = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp   = (a, b, t) => a + (b - a) * t;
  const easeIn = t => t * t;
  const easeOut   = t => 1 - (1 - t) * (1 - t);
  const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
  const mapR   = (v, a, b, c, d) => lerp(c, d, clamp((v - a) / (b - a), 0, 1));

  function lerpAngle(a, b, t) {
    a = ((a % 360) + 360) % 360;
    b = ((b % 360) + 360) % 360;
    let d = b - a;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return a + d * t;
  }

  // ── Orthographic projection ───────────────────────────────
  function proj(lon, lat, cLon, cLat, r) {
    const phi  = lat  * DEG, phi0 = cLat  * DEG;
    const dLam = (lon - cLon) * DEG;
    const x = r * Math.cos(phi) * Math.sin(dLam);
    const y = -r * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(dLam));
    const vis = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(dLam) > 0;
    return { x: W / 2 + x, y: H / 2 + y, vis };
  }

  function makeStars() {
    stars = Array.from({ length: 220 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.4 + 0.2,
      a: Math.random() * 0.65 + 0.15
    }));
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    makeStars();
  }

  // ── Round-rect helper ─────────────────────────────────────
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x,     y + h, x,     y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y,         x + r, y,          r);
    ctx.closePath();
  }

  // ── Draw rotating globe ───────────────────────────────────
  function drawGlobe(r, cLon, cLat, alpha, ts) {
    if (alpha < 0.01) return;
    const cx = W / 2, cy = H / 2;
    ctx.save();
    ctx.globalAlpha = alpha;

    // Clip to sphere
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.clip();

    // Ocean
    const ocn = ctx.createRadialGradient(cx - r * 0.22, cy - r * 0.28, 0, cx, cy, r);
    ocn.addColorStop(0, '#2880cc'); ocn.addColorStop(0.6, '#1155a8'); ocn.addColorStop(1, '#0c2d50');
    ctx.fillStyle = ocn;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = Math.max(0.4, r / 240);
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath(); let mv = true;
      for (let lo = -180; lo <= 180; lo += 4) {
        const p = proj(lo, lat, cLon, cLat, r);
        if (!p.vis) { mv = true; continue; }
        mv ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); mv = false;
      }
      ctx.stroke();
    }
    for (let lo = -180; lo < 180; lo += 30) {
      ctx.beginPath(); let mv = true;
      for (let la = -80; la <= 80; la += 4) {
        const p = proj(lo, la, cLon, cLat, r);
        if (!p.vis) { mv = true; continue; }
        mv ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); mv = false;
      }
      ctx.stroke();
    }

    // Continents
    CONTS.forEach(pts => {
      ctx.beginPath(); let started = false;
      pts.forEach(([lo, la]) => {
        const p = proj(lo, la, cLon, cLat, r);
        if (p.vis) {
          started ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
          started = true;
        } else if (started) {
          ctx.closePath(); ctx.fillStyle = '#2d7a2a'; ctx.fill();
          ctx.beginPath(); started = false;
        }
      });
      if (started) { ctx.closePath(); ctx.fillStyle = '#2d7a2a'; ctx.fill(); }
    });

    // Sphere lighting
    const lit = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0, cx, cy, r * 1.02);
    lit.addColorStop(0, 'rgba(255,255,255,0.16)');
    lit.addColorStop(0.5, 'rgba(255,255,255,0)');
    lit.addColorStop(1, 'rgba(0,0,20,0.62)');
    ctx.fillStyle = lit;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    ctx.restore(); // remove clip

    // Atmosphere glow
    const atm = ctx.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.1);
    atm.addColorStop(0, 'rgba(80,170,240,0.4)');
    atm.addColorStop(1, 'rgba(60,130,200,0)');
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2);
    ctx.fillStyle = atm; ctx.fill();

    // Pulsing location marker (appears as globe zooms in)
    const minR0 = Math.min(W, H) * 0.21;
    const mA = clamp(mapR(r, minR0 * 1.6, minR0 * 3.5, 0, 1), 0, 1);
    if (mA > 0) {
      const sp = proj(TGT_LON, TGT_LAT, cLon, cLat, r);
      if (sp.vis) {
        const dot = Math.max(2.5, r * 0.009);
        const pulse = (Math.sin(ts * 0.0025) + 1) / 2;
        // Pulsing ring
        ctx.save();
        ctx.globalAlpha = mA * (1 - pulse) * 0.7;
        ctx.strokeStyle = 'rgba(255,60,60,0.9)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, dot + pulse * dot * 1.2, 0, Math.PI * 2); ctx.stroke();
        // Solid dot
        ctx.globalAlpha = mA;
        ctx.fillStyle = '#ee2828';
        ctx.beginPath(); ctx.arc(sp.x, sp.y, dot, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath(); ctx.arc(sp.x - dot * 0.3, sp.y - dot * 0.3, dot * 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // ── Draw village landing ──────────────────────────────────
  function drawVillage(alpha) {
    if (alpha < 0.01) return;
    const cx = W / 2, cy = H / 2;
    const sc = Math.min(W, H) / 800;
    ctx.save();
    ctx.globalAlpha = alpha;

    // Ground
    const grd = ctx.createLinearGradient(0, 0, W * 0.5, H);
    grd.addColorStop(0, '#3e7c1a'); grd.addColorStop(0.4, '#2f6012'); grd.addColorStop(1, '#1a400a');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

    // Field patches
    const patches = [
      ['#4a8a20', 0, H*0.55, W*0.35, H*0.45],
      ['#5a9828', W*0.55, H*0.65, W*0.45, H*0.35],
      ['#3a6e14', W*0.7, 0, W*0.3, H*0.45],
      ['#4e8e1e', 0, 0, W*0.2, H*0.45],
    ];
    patches.forEach(([c, x, y, w, h]) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); });

    // Roads
    function road(x1, y1, x2, y2, lw) {
      ctx.strokeStyle = '#7a7060'; ctx.lineWidth = lw * sc; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,180,0.28)'; ctx.lineWidth = 1.5 * sc;
      ctx.setLineDash([18 * sc, 14 * sc]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);
    }
    road(0, cy + 40 * sc, W, cy + 40 * sc, 22);
    road(cx * 0.55, 0, cx * 0.55, H, 14);

    // House (isometric-ish)
    function house(bx, by, bw, bh, rH, wall, side, roofF, roofS) {
      const sk = 9 * sc;
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.beginPath();
      ctx.ellipse(bx + bw / 2 + sk / 2, by + bh + 4 * sc, (bw / 2 + sk) * 0.75, 5 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = side;
      ctx.beginPath();
      ctx.moveTo(bx+bw, by); ctx.lineTo(bx+bw+sk, by-sk);
      ctx.lineTo(bx+bw+sk, by-sk+bh); ctx.lineTo(bx+bw, by+bh);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = wall; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = 'rgba(160,200,240,0.32)';
      ctx.fillRect(bx+bw*0.15, by+bh*0.25, bw*0.25, bh*0.27);
      ctx.fillRect(bx+bw*0.60, by+bh*0.25, bw*0.25, bh*0.27);
      ctx.fillStyle = 'rgba(60,35,12,0.5)';
      ctx.fillRect(bx+bw*0.4, by+bh*0.55, bw*0.2, bh*0.45);
      ctx.fillStyle = roofF;
      ctx.beginPath(); ctx.moveTo(bx-3,by); ctx.lineTo(bx+bw+3,by); ctx.lineTo(bx+bw/2,by-rH); ctx.closePath(); ctx.fill();
      ctx.fillStyle = roofS;
      ctx.beginPath();
      ctx.moveTo(bx+bw+3,by); ctx.lineTo(bx+bw+3+sk,by-sk);
      ctx.lineTo(bx+bw/2+sk,by-rH-sk); ctx.lineTo(bx+bw/2,by-rH);
      ctx.closePath(); ctx.fill();
    }
    const s = sc;
    house(cx-175*s, cy-115*s, 68*s, 52*s, 28*s, '#e8d4b0','#c4b090','#8b2020','#6a1010');
    house(cx+55*s,  cy-90*s,  58*s, 48*s, 24*s, '#d4c8a0','#b0a880','#6a1818','#501010');
    house(cx-90*s,  cy+55*s,  62*s, 54*s, 30*s, '#f0e0c0','#ccc0a0','#802020','#601010');
    house(cx+125*s, cy+40*s,  72*s, 58*s, 32*s, '#ddd0a8','#bab090','#7a1a1a','#5a0808');
    house(cx-38*s,  cy-60*s,  80*s, 64*s, 38*s, '#fff8e8','#ded0b0','#c82828','#a01818');// target

    // Trees
    function tree(tx, ty, tr) {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath(); ctx.ellipse(tx+tr*0.2, ty+tr*0.3, tr*0.6, tr*0.2, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1a5010';
      ctx.beginPath(); ctx.arc(tx, ty, tr, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#2d6818';
      ctx.beginPath(); ctx.arc(tx-tr*0.18, ty-tr*0.18, tr*0.68, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#3d7822';
      ctx.beginPath(); ctx.arc(tx, ty-tr*0.28, tr*0.48, 0, Math.PI*2); ctx.fill();
    }
    tree(cx-205*s,cy-35*s,20*s); tree(cx-225*s,cy-68*s,16*s);
    tree(cx+195*s,cy-18*s,18*s); tree(cx+225*s,cy+14*s,14*s);
    tree(cx-20*s,cy+128*s,22*s); tree(cx+55*s,cy+118*s,16*s);
    tree(cx-140*s,cy+128*s,19*s);

    // Location pin
    const px = cx + 2 * s, py = cy - 95 * s, bR = 18 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(px+4*s, cy-55*s, 9*s, 4*s, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#c01818';
    ctx.beginPath(); ctx.moveTo(px,cy-58*s); ctx.lineTo(px-4*s,py+bR); ctx.lineTo(px+4*s,py+bR); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#dd2020';
    ctx.beginPath(); ctx.arc(px, py, bR, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ee4040';
    ctx.beginPath(); ctx.arc(px-bR*0.3, py-bR*0.3, bR*0.38, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(px-bR*0.22, py-bR*0.22, bR*0.22, 0, Math.PI*2); ctx.fill();

    // Label callout
    const fs = Math.max(10, Math.round(12 * s));
    ctx.font = `bold ${fs}px Inter, Arial, sans-serif`;
    const l1 = 'Obersteinenberger Str. 50', l2 = '73635 Rudersberg';
    const lw = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width) + 22;
    const lh = 42 * s, lx = px - lw / 2, ly = py - bR - lh - 8 * s;
    ctx.fillStyle = 'rgba(6,14,6,0.92)'; rr(lx, ly, lw, lh, 5 * s); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px-7*s, ly+lh); ctx.lineTo(px+7*s, ly+lh); ctx.lineTo(px, py-bR-5*s);
    ctx.closePath(); ctx.fillStyle = 'rgba(6,14,6,0.92)'; ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.font = `bold ${fs}px Inter, Arial, sans-serif`;
    ctx.fillText(l1, px, ly + 16 * s);
    ctx.font = `${Math.max(9, Math.round(10 * s))}px Inter, Arial, sans-serif`;
    ctx.fillStyle = 'rgba(175,220,165,0.9)';
    ctx.fillText(l2, px, ly + 31 * s);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  // ── Scroll progress ───────────────────────────────────────
  function getP() {
    const scrollable = section.offsetHeight - H;
    return scrollable > 0 ? clamp(window.scrollY / scrollable, 0, 1) : 0;
  }

  // ── Main loop ─────────────────────────────────────────────
  function render(ts) {
    const dt = Math.min(ts - lastTime, 50) / 1000;
    lastTime = ts;

    const p = getP();

    // Auto-rotate, decelerating as p → 1
    rotLon += 18 * dt * (1 - easeOut(clamp(p * 1.4, 0, 1)));

    // Blend lon/lat toward Steinenberg
    const lp  = easeInOut(clamp(p * 1.4, 0, 1));
    const dLon = lerpAngle(rotLon, TGT_LON, lp);
    const dLat = lerp(20, TGT_LAT, easeInOut(clamp((p - 0.3) / 0.7, 0, 1)));

    // Globe radius
    const minR = Math.min(W, H) * 0.21;
    const maxR = Math.min(W, H) * 2.8;
    const globeR = lerp(minR, maxR, easeIn(clamp(p / 0.88, 0, 1)));

    // Village / globe blend
    const villA = easeOut(mapR(p, 0.72, 0.94, 0, 1));
    const globeA = 1 - villA;

    // Background
    ctx.fillStyle = '#00050f'; ctx.fillRect(0, 0, W, H);

    // Stars
    const starA = clamp(1 - p * 4, 0, 1);
    if (starA > 0.01) {
      stars.forEach(st => {
        ctx.globalAlpha = st.a * starA;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(st.x * W, st.y * H, st.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    drawGlobe(globeR, dLon, dLat, globeA, ts);
    drawVillage(villA);

    // DOM
    if (content) {
      const slideP = easeOut(mapR(p, 0.08, 0.42, 0, 1));
      const textOp = 1 - easeIn(mapR(p, 0.18, 0.48, 0, 1));
      const mob = W <= 768;
      content.style.transform = mob
        ? `translateX(-50%) translateY(calc(-50% - ${slideP * 55}%))`
        : `translateY(-50%) translateX(${-slideP * 120}%)`;
      content.style.opacity = Math.max(0, textOp);
    }
    if (ctaEl) {
      ctaEl.style.opacity = villA;
      ctaEl.style.pointerEvents = villA > 0.4 ? 'auto' : 'none';
      ctaEl.setAttribute('aria-hidden', villA < 0.1 ? 'true' : 'false');
    }
    if (cueEl) cueEl.style.opacity = clamp(1 - p * 14, 0, 1);

    requestAnimationFrame(render);
  }

  // prefers-reduced-motion: skip animation, show village
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    section.style.height = '100vh';
    resize();
    drawVillage(1);
    if (ctaEl)   { ctaEl.style.opacity = '1'; ctaEl.style.pointerEvents = 'auto'; ctaEl.removeAttribute('aria-hidden'); }
    if (cueEl)   cueEl.style.display = 'none';
    if (content) content.style.opacity = '0';
    return;
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(render); });
})();

// ── Contact form ──────────────────────────────────────────
(function () {
  const form    = document.getElementById('contact-form');
  const success = document.getElementById('cf-success');
  const submit  = document.getElementById('cf-submit');
  if (!form || !success || !submit) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    submit.disabled = true;
    submit.textContent = 'Wird gesendet …';

    // Static site — simulate async send
    setTimeout(function () {
      form.hidden  = true;
      success.hidden = false;
    }, 800);
  });
})();
