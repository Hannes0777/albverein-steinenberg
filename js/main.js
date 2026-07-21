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
  const nav     = document.getElementById('main-nav');
  const navMenu = document.getElementById('nav-menu'); // lives outside <header>, needs the class too
  const hero    = document.getElementById('hero');
  if (!nav || !hero) return;

  new IntersectionObserver(
    ([e]) => {
      const scrolled = !e.isIntersecting;
      nav.classList.toggle('nav--scrolled', scrolled);
      if (navMenu) navMenu.classList.toggle('nav--scrolled', scrolled);
    },
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
  document.addEventListener('click', e => { if (isOpen && !nav.contains(e.target) && !menu.contains(e.target)) close(); });
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

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal--visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  function observeAll() {
    const items = document.querySelectorAll('.reveal:not(.reveal--visible)');
    if (prefersReduced) { items.forEach(el => el.classList.add('reveal--visible')); return; }
    items.forEach(el => observer.observe(el));
  }

  observeAll();
  // Expose so cms-content.js can re-observe after rendering new elements
  window.cmsObserveReveal = observeAll;
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
// Deferred until cms-content.js has rendered the tour list from JSON.
// Falls back automatically after 1 s if no CMS content script is present.
(function () {
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    const searchInput = document.getElementById('tour-search');
    const filterBtns  = document.querySelectorAll('.filter-btn');
    const emptyMsg    = document.getElementById('tour-empty-msg');
    const moreWrap    = document.getElementById('tour-more-wrap');
    const moreBtn     = document.getElementById('tour-more-btn');
    if (!searchInput && !filterBtns.length) return;

    let activeFilter = 'all';
    let searchQuery  = '';
    let expanded     = false;

    // Featured set shown by default: the next 3 upcoming tours + the last past tour.
    // Only applies with no active search/filter, so search & filters still reach every tour.
    function getFeatured(tourItems) {
      const featured = new Set();
      const past = tourItems
        .filter(i => i.dataset.status === 'past')
        .sort((a, b) => b.dataset.date.localeCompare(a.dataset.date));
      const upcoming = tourItems
        .filter(i => i.dataset.status === 'upcoming')
        .sort((a, b) => a.dataset.date.localeCompare(b.dataset.date));
      past.slice(0, 1).forEach(i => featured.add(i));
      upcoming.slice(0, 3).forEach(i => featured.add(i));
      return featured;
    }

    function applyFilters() {
      const tourItems = Array.from(document.querySelectorAll('.tour-item')); // re-query after render
      const collapseActive = !expanded && activeFilter === 'all' && !searchQuery;
      const featured = collapseActive ? getFeatured(tourItems) : null;

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
        const matchesFeature = !collapseActive || featured.has(item);

        const show = matchesFilter && matchesSearch && matchesFeature;
        item.classList.toggle('tour-item--hidden', !show);
        if (show) visible++;
      });
      if (emptyMsg) emptyMsg.hidden = visible > 0;

      if (moreWrap && moreBtn) {
        // The expand/collapse toggle only makes sense in the default view
        // (no filter, no search) - a filter or search already shows every match.
        const relevant = activeFilter === 'all' && !searchQuery;
        const total = tourItems.length;
        const featuredCount = getFeatured(tourItems).size;
        moreWrap.hidden = !relevant || total - featuredCount <= 0;
        moreBtn.textContent = expanded ? 'Weniger anzeigen' : 'Weitere Touren anzeigen';
      }
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

    if (moreBtn) {
      moreBtn.addEventListener('click', () => {
        expanded = !expanded;
        applyFilters();
        if (!expanded) moreWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }

    applyFilters(); // run once after init
  }

  // cms-content.js dispatches this event after rendering tour items
  document.addEventListener('cms-ready', init);
  // Fallback: initialize after 1 s even without cms-content.js
  setTimeout(init, 1000);
})();

// ── Chronik: show the beginning of the story, expand for more ─
// Deferred until cms-content.js has rendered the timeline from JSON.
(function () {
  let initialized = false;

  function init() {
    if (initialized) return;
    const items = document.querySelectorAll('.timeline-item');
    const wrap  = document.getElementById('chronik-more-wrap');
    const btn   = document.getElementById('chronik-more-btn');
    if (!items.length || !wrap || !btn) return;
    initialized = true;

    if (items.length <= 1) return; // nothing to collapse

    let chronikExpanded = false;

    function applyChronik() {
      items.forEach((item, i) => {
        item.classList.toggle('timeline-item--collapsed', !chronikExpanded && i > 0);
      });
      btn.textContent = chronikExpanded ? 'Chronik einklappen' : 'Ganze Chronik anzeigen';
      if (typeof window.cmsObserveReveal === 'function') window.cmsObserveReveal();
    }

    applyChronik();
    wrap.hidden = false;

    btn.addEventListener('click', () => {
      chronikExpanded = !chronikExpanded;
      applyChronik();
      if (!chronikExpanded) wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // cms-content.js dispatches this event after rendering the chronik
  document.addEventListener('cms-ready', init);
  // Fallback: initialize after 1 s even without cms-content.js
  setTimeout(init, 1000);
})();

// ── Mountain hero: subtle parallax + scroll cue fade ──────
(function () {
  'use strict';

  const hero  = document.getElementById('hero');
  if (!hero) return;

  const layers = hero.querySelectorAll('[data-parallax]');
  const cue    = document.getElementById('hero-scroll-cue');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !layers.length) return;

  let ticking = false;

  function update() {
    ticking = false;
    const rect    = hero.getBoundingClientRect();
    const scrolled = Math.max(0, -rect.top);

    layers.forEach(layer => {
      const factor = parseFloat(layer.dataset.parallax) || 0.2;
      layer.style.transform = `translateY(${scrolled * factor}px)`;
    });

    if (cue) {
      const heroH = hero.offsetHeight || 1;
      cue.style.opacity = String(Math.max(0, 1 - (scrolled / heroH) * 6));
    }
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });

  update();
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

    const errorEl = document.getElementById('cf-error-general');
    const originalText = submit.textContent;
    submit.disabled = true;
    submit.textContent = 'Wird gesendet …';
    if (errorEl) errorEl.hidden = true;

    const data = Object.fromEntries(new FormData(form).entries());

    fetch('https://contact-form-albverein-steinenberg.ehmann-hannes07.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(res => res.json().then(body => ({ ok: res.ok && body.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body?.error || 'Versand fehlgeschlagen');
        form.hidden  = true;
        success.hidden = false;
      })
      .catch(() => {
        submit.disabled = false;
        submit.textContent = originalText;
        if (errorEl) errorEl.hidden = false;
      });
  });
})();
