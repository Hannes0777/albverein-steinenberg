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

// ── Scroll-expand Hero ────────────────────────────────────
(function () {
  const media     = document.getElementById('expand-media');
  const bg        = document.getElementById('expand-bg');
  const dim       = document.getElementById('expand-dim');
  const meta1     = document.getElementById('expand-meta1');
  const meta2     = document.getElementById('expand-meta2');
  const w1        = document.getElementById('expand-w1');
  const w2        = document.getElementById('expand-w2');
  const cta       = document.getElementById('expand-cta');
  const scrollBtn = document.getElementById('expand-scroll-btn');

  if (!media) return;

  let progress    = 0;
  let expanded    = false;
  let touchStartY = 0;
  const mobile    = () => window.innerWidth < 768;

  function update() {
    const m = mobile();
    const p = progress;

    // Grow media — CSS max-width/max-height clamp to viewport
    media.style.width        = (380 + p * (m ? 570  : 1170)) + 'px';
    media.style.height       = (340 + p * (m ? 260  : 460))  + 'px';
    media.style.borderRadius = Math.max(0, 16 * (1 - p))     + 'px';

    // Fade background and media dim
    bg.style.opacity  = Math.max(0, 1 - p);
    dim.style.opacity = Math.max(0, 0.42 - p * 0.35);

    // Split title and meta apart horizontally
    const tx = p * (m ? 180 : 150);
    w1.style.transform    = 'translateX(-' + tx + 'vw)';
    w2.style.transform    = 'translateX('  + tx + 'vw)';
    meta1.style.transform = 'translateX(-' + tx + 'vw)';
    meta2.style.transform = 'translateX('  + tx + 'vw)';

    // CTA fades in near the end
    if (p >= 0.96) {
      cta.style.opacity       = String(Math.min(1, (p - 0.96) / 0.04));
      cta.style.pointerEvents = 'auto';
      cta.removeAttribute('aria-hidden');
    } else {
      cta.style.opacity       = '0';
      cta.style.pointerEvents = 'none';
      cta.setAttribute('aria-hidden', 'true');
    }
  }

  function advance(delta) {
    progress = Math.min(1, Math.max(0, progress + delta));
    if (progress >= 1) expanded = true;
    if (progress <= 0) expanded = false;
    update();
  }

  // ── Wheel ────────────────────────────────────────────────
  window.addEventListener('wheel', function (e) {
    if (expanded) {
      if (e.deltaY < 0 && window.scrollY <= 5) {
        expanded = false;
        e.preventDefault();
        advance(e.deltaY * 0.001);
      }
      return;
    }
    e.preventDefault();
    advance(e.deltaY * 0.001);
  }, { passive: false });

  // ── Scroll lock while animating ──────────────────────────
  window.addEventListener('scroll', function () {
    if (!expanded) window.scrollTo(0, 0);
  }, { passive: false });

  // ── Touch ────────────────────────────────────────────────
  window.addEventListener('touchstart', function (e) {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    if (!touchStartY) return;
    const y  = e.touches[0].clientY;
    const dy = touchStartY - y; // positive = finger moved up = scroll down

    if (expanded) {
      if (dy < -20 && window.scrollY <= 5) {
        expanded = false;
        e.preventDefault();
        advance(dy * 0.004);
      }
      touchStartY = y;
      return;
    }

    e.preventDefault();
    advance(dy * 0.004);
    touchStartY = y;
  }, { passive: false });

  window.addEventListener('touchend', function () { touchStartY = 0; });

  // ── Scroll down button ───────────────────────────────────
  if (scrollBtn) {
    scrollBtn.addEventListener('click', function () {
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    });
  }

  // ── Resize ───────────────────────────────────────────────
  window.addEventListener('resize', update);

  // ── Initial render ───────────────────────────────────────
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
