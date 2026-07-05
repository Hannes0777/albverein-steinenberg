/* ============================================================
   cms-content.js  –  Loads JSON content files and populates the
   Albverein Steinenberg page at runtime.
   The CMS (Sveltia) edits these JSON files via GitHub; Cloudflare
   Pages serves the static result.
   ============================================================ */
'use strict';

(async function () {

  // ── Fetch helpers ────────────────────────────────────────
  async function fetchJSON(path) {
    try {
      const r = await fetch(path);
      if (!r.ok) throw new Error(r.status);
      return r.json();
    } catch (e) {
      console.warn('[CMS] Could not load', path, e.message);
      return null;
    }
  }

  // ── Minimal Markdown → HTML (bold, italic, links only) ──
  function md(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,     '<em>$1</em>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  }

  // ── Safely set text/html on an element ──────────────────
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value != null) el.textContent = value;
  }
  function setHTML(id, value) {
    const el = document.getElementById(id);
    if (el && value != null) el.innerHTML = value;
  }

  // ── Tour type labels & CSS classes ──────────────────────
  const TYPE_LABEL = {
    wanderung: 'Wanderung',
    familie:   'Familienwanderung',
    senioren:  'Seniorentour',
    ebike:     'E-Bike Tour',
    event:     'Vereinsabend',
  };
  const TYPE_CLASS = {
    wanderung: 'tour-tag--group',
    familie:   'tour-tag--family',
    senioren:  'tour-tag--senior',
    ebike:     'tour-tag--bike',
    event:     'tour-tag--event',
  };

  const MONTH_SHORT = ['Jan.','Feb.','Mär.','Apr.','Mai','Jun.',
                       'Jul.','Aug.','Sep.','Okt.','Nov.','Dez.'];

  // ── Render a single tour <li> ────────────────────────────
  function renderTour(t) {
    const d      = new Date(t.date + 'T00:00:00');
    const day    = String(d.getDate()).padStart(2, '0');
    const month  = MONTH_SHORT[d.getMonth()];
    const isPast = t.status === 'past';
    const typeLabel = TYPE_LABEL[t.type] || t.type;
    const typeClass = TYPE_CLASS[t.type] || '';
    const statusLabel = isPast ? 'Vergangen' : 'Bevorstehend';
    const statusClass = isPast ? 'tour-item__status--past' : 'tour-item__status--upcoming';
    const itemClass   = isPast ? 'tour-item--past' : 'tour-item--upcoming';
    const searchStr   = (t.title + ' ' + t.meta).toLowerCase();

    return `
<li class="tour-item ${itemClass}"
    data-type="${t.type}"
    data-date="${t.date}"
    data-status="${t.status}"
    data-search="${searchStr}">
  <div class="tour-item__date">
    <span class="tour-item__day">${day}</span>
    <span class="tour-item__month">${month}</span>
  </div>
  <div class="tour-item__info">
    <span class="tour-tag ${typeClass}">${typeLabel}</span>
    <h3 class="tour-item__title">${t.title}</h3>
    <p class="tour-item__meta">${t.meta}</p>
  </div>
  <span class="tour-item__status ${statusClass}">${statusLabel}</span>
</li>`.trim();
  }

  // ── Render a news card ───────────────────────────────────
  const NEWS_CLASS = {
    aktuell:   'tour-tag--group',
    wanderung: 'tour-tag--family',
    verein:    'tour-tag--senior',
    sonstiges: 'tour-tag--event',
  };
  const NEWS_LABEL = {
    aktuell:   'Aktuell',
    wanderung: 'Wanderung',
    verein:    'Vereinsnews',
    sonstiges: 'Sonstiges',
  };

  function renderNewsCard(item) {
    const cat    = item.kategorie || 'aktuell';
    const cls    = NEWS_CLASS[cat] || 'tour-tag--group';
    const label  = NEWS_LABEL[cat] || 'Aktuell';
    const imgHtml = item.bild
      ? `<div class="news-card__img"><img src="${item.bild}" alt="${item.titel}" loading="lazy"></div>`
      : '';
    // Convert simple markdown paragraphs in item.text
    const bodyHtml = (item.text || '')
      .split(/\n\n+/)
      .filter(Boolean)
      .map(p => `<p>${md(p.trim())}</p>`)
      .join('');

    return `
<article class="news-card reveal">
  ${imgHtml}
  <div class="news-card__body">
    <div class="news-card__meta">
      <span class="tour-tag ${cls}">${label}</span>
      <time class="news-card__date">${item.datum || ''}</time>
    </div>
    <h3 class="news-card__title">${item.titel}</h3>
    <div class="news-card__text">${bodyHtml}</div>
  </div>
</article>`.trim();
  }

  // ── Render team card ─────────────────────────────────────
  function renderTeamCard(m) {
    const phoneContent = m.telefon
      ? `<a href="tel:+49${m.telefon.replace(/^0/, '').replace(/\s/g, '')}" class="team-card__phone">${m.telefon}</a>`
      : `<a href="#kontakt" class="team-card__phone">Kontakt aufnehmen</a>`;
    return `
<li class="team-card reveal">
  <div class="team-card__avatar" aria-hidden="true">${m.kuerzel}</div>
  <div class="team-card__info">
    <h3 class="team-card__name">${m.name}</h3>
    <p class="team-card__role">${m.rolle}</p>
    ${phoneContent}
  </div>
</li>`.trim();
  }

  // ── Render chronik item ──────────────────────────────────
  function renderChronikItem(e) {
    return `
<li class="timeline-item reveal">
  <div class="timeline-item__year">${e.year}</div>
  <div class="timeline-item__content">
    <h3 class="timeline-item__title">${e.titel}</h3>
    <p class="timeline-item__desc">${e.beschreibung}</p>
  </div>
</li>`.trim();
  }

  // ── Render price row ─────────────────────────────────────
  function renderPreisRow(p) {
    return `<tr><td>${p.kategorie}</td><td class="beitraege-table__price">${p.preis}</td></tr>`;
  }

  // Checkmark SVG reused for leistungen
  const CHECK_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2"/><polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

  // ── Fetch everything in parallel ─────────────────────────
  const [site, hero, wanderplan, ueberuns, chronik, team, beitraege, kontakt, aktuelles] =
    await Promise.all([
      fetchJSON('content/siteinfo.json'),
      fetchJSON('content/hero.json'),
      fetchJSON('content/wanderplan.json'),
      fetchJSON('content/ueberuns.json'),
      fetchJSON('content/chronik.json'),
      fetchJSON('content/team.json'),
      fetchJSON('content/beitraege.json'),
      fetchJSON('content/kontakt.json'),
      fetchJSON('content/aktuelles.json'),
    ]);

  // ── 1. Site meta ─────────────────────────────────────────
  if (site) {
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', site.meta_description);
    document.title = site.site_title;
  }

  // ── 2. Hero ───────────────────────────────────────────────
  if (hero) {
    const eyebrow = document.querySelector('.globe-hero__eyebrow');
    if (eyebrow) eyebrow.textContent = hero.eyebrow;

    const title = document.querySelector('.globe-hero__title');
    if (title) title.innerHTML = `${hero.title_line1}<br><em>${hero.title_line2}</em>`;

    const sub = document.querySelector('.globe-hero__sub');
    if (sub) sub.textContent = hero.subtitle;
  }

  // ── 3. Tour list ──────────────────────────────────────────
  if (wanderplan) {
    const list = document.getElementById('tour-list');
    if (list && wanderplan.touren?.length) {
      list.innerHTML = wanderplan.touren.map(renderTour).join('\n');
    }
    // Update section heading year
    const heading = document.getElementById('wanderplan-heading');
    if (heading && wanderplan.year) heading.textContent = `Wanderplan ${wanderplan.year}`;
    // Note under list
    const noteEl = document.querySelector('.events-note');
    if (noteEl && wanderplan.note) {
      // Keep the SVG icon, replace only the text node
      const textNodes = [...noteEl.childNodes].filter(n => n.nodeType === Node.TEXT_NODE);
      if (textNodes.length) textNodes[textNodes.length - 1].textContent = '\n        ' + wanderplan.note;
    }
  }

  // ── 4. Über uns ───────────────────────────────────────────
  if (ueberuns) {
    const paras = document.querySelectorAll('.about-desc');
    const texts = [ueberuns.absatz1, ueberuns.absatz2, ueberuns.absatz3];
    paras.forEach((p, i) => { if (texts[i]) p.innerHTML = md(texts[i]); });

    const features = document.querySelectorAll('.about-feature');
    if (ueberuns.features?.length) {
      features.forEach((f, i) => {
        const txt = ueberuns.features[i];
        if (txt == null) return;
        // Keep the SVG icon; update only the last text child
        const textNodes = [...f.childNodes].filter(n => n.nodeType === Node.TEXT_NODE);
        if (textNodes.length) textNodes[textNodes.length - 1].textContent = '\n              ' + txt;
      });
    }
  }

  // ── 5. Chronik ────────────────────────────────────────────
  if (chronik?.eintraege?.length) {
    const ol = document.querySelector('.timeline');
    if (ol) ol.innerHTML = chronik.eintraege.map(renderChronikItem).join('\n');
  }

  // ── 6. Team ───────────────────────────────────────────────
  if (team?.mitglieder?.length) {
    const grid = document.querySelector('.team-grid');
    if (grid) grid.innerHTML = team.mitglieder.map(renderTeamCard).join('\n');
  }

  // ── 7. Beiträge ───────────────────────────────────────────
  if (beitraege) {
    // Price table caption year
    const caption = document.querySelector('.beitraege-table__caption');
    if (caption && beitraege.jahr) caption.textContent = `Jahresbeiträge ${beitraege.jahr}`;

    const tbody = document.querySelector('.beitraege-table tbody');
    if (tbody && beitraege.preise?.length) {
      tbody.innerHTML = beitraege.preise.map(renderPreisRow).join('\n');
    }

    const tableNote = document.querySelector('.beitraege-table__note');
    if (tableNote && beitraege.hinweis) tableNote.textContent = beitraege.hinweis;

    const leistungenList = document.querySelector('.leistungen-list ul');
    if (leistungenList && beitraege.leistungen?.length) {
      leistungenList.innerHTML = beitraege.leistungen
        .map(l => `<li>${CHECK_SVG} ${l}</li>`)
        .join('\n');
    }
  }

  // ── 8. Kontakt ────────────────────────────────────────────
  if (kontakt) {
    const addr = document.querySelector('.contact-block__address');
    if (addr) addr.innerHTML =
      `${kontakt.strasse}<br>${kontakt.ort}<br>${kontakt.bundesland}`;

    const phoneLink = document.querySelector('.contact-link[href^="tel:"]');
    if (phoneLink) {
      phoneLink.href = `tel:${kontakt.telefon_href}`;
      phoneLink.lastChild.textContent = ` ${kontakt.telefon} (${kontakt.ansprechpartner})`;
    }

    const webLink = document.querySelector('.contact-link[href*="albverein"]');
    if (webLink) {
      webLink.href   = kontakt.website_href;
      webLink.lastChild.textContent = ' ' + kontakt.website;
    }

    // Map iframe
    const iframe = document.querySelector('.kontakt-map iframe');
    if (iframe && kontakt.map_embed_url) iframe.src = kontakt.map_embed_url;

    const mapLink = document.querySelector('.map-link[href*="openstreetmap"]');
    if (mapLink && kontakt.map_link_url) mapLink.href = kontakt.map_link_url;
  }

  // ── 9. Aktuelles / News (new section) ────────────────────
  const newsGrid = document.getElementById('news-grid');
  if (newsGrid) {
    const items = aktuelles?.beitraege || [];
    if (items.length === 0) {
      newsGrid.innerHTML = '<p class="news-empty">Derzeit keine aktuellen Beiträge.</p>';
    } else {
      newsGrid.innerHTML = items.map(renderNewsCard).join('\n');
    }
    // Hide the whole section if there are no entries
    const newsSection = document.getElementById('aktuelles');
    if (newsSection) newsSection.hidden = items.length === 0;
  }

  // ── Re-observe any newly added .reveal elements ──────────
  if (typeof window.cmsObserveReveal === 'function') {
    window.cmsObserveReveal();
  }

  // ── Signal tour-search/filter to initialize ──────────────
  document.dispatchEvent(new Event('cms-ready'));

})();
