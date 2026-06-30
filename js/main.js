'use strict';

// ── Footer year ───────────────────────────────────────────
(function () {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
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
