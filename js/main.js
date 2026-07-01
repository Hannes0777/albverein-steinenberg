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

// ── Globe hero animation (Three.js + Leaflet satellite) ───
(function () {
  'use strict';

  const section    = document.getElementById('hero');
  if (!section || !section.classList.contains('globe-hero')) return;
  if (typeof THREE === 'undefined') return;

  const canvas     = document.getElementById('globe-canvas');
  const landingMap = document.getElementById('landing-map');
  const content    = document.getElementById('globe-content');
  const ctaEl      = document.getElementById('globe-cta');
  const cueEl      = document.getElementById('globe-scroll-cue');
  if (!canvas) return;

  // ── Helpers ──────────────────────────────────────────────
  const clamp    = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp     = (a, b, t) => a + (b - a) * t;
  const easeIn3  = t => t * t * t;
  const easeOut2 = t => 1 - (1 - t) * (1 - t);
  const easeIO   = t => t < 0.5 ? 4*t*t*t : 1 - 4*(1-t)*(1-t)*(1-t);
  const mapR     = (v, a, b, c, d) => lerp(c, d, clamp((v - a) / (b - a), 0, 1));

  // ── Three.js scene ────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x00050f, 1);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 200);
  camera.position.z = 2.8;

  // Earth textures (Three.js r134 repo, stable URLs with CORS)
  const TEX = 'https://raw.githubusercontent.com/mrdoob/three.js/r134/examples/textures/planets/';
  const loader = new THREE.TextureLoader();
  loader.crossOrigin = 'anonymous';

  const earthMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    new THREE.MeshPhongMaterial({
      map:         loader.load(TEX + 'earth_atmos_2048.jpg'),
      normalMap:   loader.load(TEX + 'earth_normal_2048.jpg'),
      specularMap: loader.load(TEX + 'earth_specular_2048.jpg'),
      specular:    new THREE.Color(0x333333),
      shininess:   18,
    })
  );
  scene.add(earthMesh);

  // Cloud layer
  const cloudMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.007, 64, 64),
    new THREE.MeshPhongMaterial({ map: loader.load(TEX + 'earth_clouds_1024.png'), transparent: true, opacity: 0.5 })
  );
  scene.add(cloudMesh);

  // Atmosphere rim
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.1, side: THREE.BackSide })
  ));

  // Lighting – sun from upper-right
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.3);
  sun.position.set(5, 3, 5);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x223355, 0.35));

  // Stars (point cloud)
  const starPos = new Float32Array(3000 * 3);
  for (let i = 0; i < starPos.length; i++) starPos[i] = (Math.random() - 0.5) * 200;
  const starField = new THREE.Points(
    (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(starPos, 3)); return g; })(),
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, sizeAttenuation: true })
  );
  scene.add(starField);

  // Germany target rotation (Three.js SphereGeometry UV: lon 0° faces +Z at rot.y=0,
  // positive rot.y rotates eastward longitudes into view)
  // rot.x = -lat tilts north pole toward camera; rot.y = lon offset
  const TGT_X = -48.86 * Math.PI / 180;
  const TGT_Y =   9.55 * Math.PI / 180; // fine-tune if needed

  // Scroll progress
  function getP() {
    const scrollable = section.offsetHeight - window.innerHeight;
    return scrollable > 0 ? clamp(window.scrollY / scrollable, 0, 1) : 0;
  }

  // ── Leaflet satellite map ─────────────────────────────────
  let leaflet = null, mapInited = false;

  function initLeaflet() {
    if (mapInited || typeof L === 'undefined' || !landingMap) return;
    mapInited = true;
    leaflet = L.map('landing-map', {
      zoomControl: false, attributionControl: true,
      dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, touchZoom: false,
    });
    // ESRI World Imagery (satellite) – free, no API key, proper attribution
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Imagery &copy; Esri, Maxar, GeoEye, Earthstar Geographics',
      maxZoom: 19,
    }).addTo(leaflet);
    leaflet.setView([48.8632, 9.5541], 17);

    // Custom teardrop pin
    const pinIcon = L.divIcon({
      className: '',
      html: '<div class="lp-pin"><div class="lp-pin__ball"></div></div>',
      iconAnchor: [14, 32],
    });
    L.marker([48.8632, 9.5541], { icon: pinIcon })
      .bindPopup('<strong>Obersteinenberger Str.&nbsp;50</strong><br>73635 Rudersberg', { offset: [0, -10] })
      .addTo(leaflet)
      .openPopup();
  }

  // ── Animation loop ────────────────────────────────────────
  let autoY = 0, lastTime = 0;

  function render(ts) {
    const dt = Math.min(ts - lastTime, 50) / 1000;
    lastTime = ts;

    const p = getP();

    // Auto-rotate Y, slows toward end
    autoY += 0.28 * dt * (1 - clamp(p / 0.72, 0, 1));

    // Blend rotation toward Germany
    const rotP      = easeIO(clamp(p / 0.78, 0, 1));
    earthMesh.rotation.x = lerp(-0.25, TGT_X, rotP);
    earthMesh.rotation.y = autoY + easeIO(clamp(p * 1.4, 0, 1)) * (TGT_Y - autoY);
    cloudMesh.rotation.x = earthMesh.rotation.x;
    cloudMesh.rotation.y = earthMesh.rotation.y + 0.003;

    // Camera zoom
    camera.position.z = lerp(2.8, 1.04, easeIn3(clamp(p / 0.92, 0, 1)));
    camera.fov        = lerp(45, 28, easeIO(clamp(p / 0.92, 0, 1)));
    camera.updateProjectionMatrix();

    // Stars fade
    starField.material.opacity = clamp(1 - p * 5, 0, 1);

    renderer.render(scene, camera);

    // Satellite map fade-in
    const mapA = easeOut2(mapR(p, 0.78, 0.97, 0, 1));
    if (mapA > 0.02 && !mapInited) initLeaflet();
    if (landingMap) {
      landingMap.style.opacity       = mapA;
      landingMap.style.pointerEvents = mapA > 0.5 ? 'auto' : 'none';
      landingMap.setAttribute('aria-hidden', mapA < 0.1 ? 'true' : 'false');
      if (mapInited && leaflet && mapA > 0.1) leaflet.invalidateSize();
    }

    // Text slide-out
    if (content) {
      const slideP = easeOut2(mapR(p, 0.08, 0.44, 0, 1));
      const textOp = 1 - easeOut2(mapR(p, 0.18, 0.50, 0, 1));
      const mob    = window.innerWidth <= 768;
      content.style.transform = mob
        ? `translateX(-50%) translateY(calc(-50% - ${slideP * 60}%))`
        : `translateY(-50%) translateX(${-slideP * 120}%)`;
      content.style.opacity = Math.max(0, textOp);
    }

    // CTA buttons
    if (ctaEl) {
      const op = mapR(p, 0.85, 1, 0, 1);
      ctaEl.style.opacity       = op;
      ctaEl.style.pointerEvents = op > 0.4 ? 'auto' : 'none';
      ctaEl.setAttribute('aria-hidden', op < 0.1 ? 'true' : 'false');
    }

    // Scroll cue
    if (cueEl) cueEl.style.opacity = clamp(1 - p * 14, 0, 1);

    requestAnimationFrame(render);
  }

  // ── Resize ────────────────────────────────────────────────
  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    if (mapInited && leaflet) leaflet.invalidateSize();
  }

  // prefers-reduced-motion: skip to satellite map immediately
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    section.style.height = '100vh';
    if (content) content.style.opacity = '0';
    if (cueEl)   cueEl.style.display = 'none';
    if (ctaEl)   { ctaEl.style.opacity = '1'; ctaEl.style.pointerEvents = 'auto'; ctaEl.removeAttribute('aria-hidden'); }
    if (landingMap) { landingMap.style.opacity = '1'; landingMap.style.pointerEvents = 'auto'; landingMap.removeAttribute('aria-hidden'); }
    initLeaflet();
    renderer.render(scene, camera);
    return;
  }

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
