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

  // ── Render gallery item ──────────────────────────────────
  function renderGalleryItem(item, index) {
    return `
<li class="gallery-item reveal" data-index="${index}">
  <button class="gallery-item__btn" aria-label="Bild vergrößern: ${item.titel || ''}">
    <img src="${item.bild}" alt="${item.titel || ''}" loading="lazy" class="gallery-item__img">
    ${item.titel ? `<span class="gallery-item__caption">${item.titel}</span>` : ''}
  </button>
</li>`.trim();
  }

  // ── Render download item ─────────────────────────────────
  const DL_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><line x1="12" y1="12" x2="12" y2="18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><polyline points="9 15 12 18 15 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function renderDownloadItem(d) {
    return `
<li class="download-item">
  <div class="download-item__icon" aria-hidden="true">${DL_ICON}</div>
  <div class="download-item__info">
    <span class="download-item__title">${d.titel}</span>
    ${d.beschreibung ? `<span class="download-item__desc">${d.beschreibung}</span>` : ''}
  </div>
  <a href="${d.datei}" download class="download-item__btn btn btn--primary btn--sm" aria-label="${d.titel} herunterladen">
    Herunterladen
  </a>
</li>`.trim();
  }

  // ── Fetch everything in parallel ─────────────────────────
  const [site, hero, wanderplan, ueberuns, chronik, team, beitraege, kontakt, aktuelles, galerie, downloads, rechtliches] =
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
      fetchJSON('content/galerie.json'),
      fetchJSON('content/downloads.json'),
      fetchJSON('content/rechtliches.json'),
    ]);

  // ── 1. Site meta ─────────────────────────────────────────
  if (site) {
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', site.meta_description);
    document.title = site.site_title;
  }

  // ── 2. Hero ───────────────────────────────────────────────
  if (hero) {
    const eyebrow = document.querySelector('.hero__eyebrow');
    if (eyebrow) eyebrow.textContent = hero.eyebrow;

    const title = document.querySelector('.hero__title');
    if (title) title.innerHTML = `${hero.title_line1}<br><em>${hero.title_line2}</em>`;

    const sub = document.querySelector('.hero__sub');
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
    // Section and its nav links always stay visible, with or without posts -
    // "keine Beiträge" placeholder above covers the empty state.
  }

  // ── 10. Galerie ───────────────────────────────────────────
  const galleryGrid  = document.getElementById('gallery-grid');
  const galleryEmpty = document.getElementById('gallery-empty');
  const bilder = galerie?.bilder || [];
  if (galleryGrid) {
    if (bilder.length > 0) {
      if (galleryEmpty) galleryEmpty.remove();
      const ul = document.createElement('ul');
      ul.className = 'gallery-items';
      ul.setAttribute('role', 'list');
      ul.innerHTML = bilder.map(renderGalleryItem).join('\n');
      galleryGrid.appendChild(ul);
      initLightbox(bilder);
    }
  }

  // ── 11. Downloads ─────────────────────────────────────────
  const dlList  = document.getElementById('download-list');
  const dlEmpty = document.getElementById('downloads-empty');
  const dateien = downloads?.dateien || [];
  if (dlList) {
    if (dateien.length > 0) {
      dlList.innerHTML = dateien.map(renderDownloadItem).join('\n');
      if (dlEmpty) dlEmpty.hidden = true;
    } else {
      dlList.hidden = true;
      if (dlEmpty) dlEmpty.hidden = false;
    }
  }

  // ── 12. Rechtliches: Impressum & Datenschutzerklärung ────
  // Only runs on pages that actually have these elements (impressum.html /
  // datenschutz.html), so this is a no-op on index.html.
  if (document.getElementById('legal-strasse')) {
    if (kontakt) {
      setText('legal-vereinsname', kontakt.vereinsname);
      setText('legal-strasse', kontakt.strasse);
      setText('legal-ort',     kontakt.ort);
      setText('legal-telefon', kontakt.telefon);

      const telLink = document.getElementById('legal-telefon-link');
      if (telLink && kontakt.telefon_href) telLink.href = `tel:${kontakt.telefon_href}`;

      // E-Mail: only replace the visible placeholder once a real address exists
      const emailWrap = document.getElementById('legal-email-wrap');
      if (emailWrap && kontakt.email && kontakt.email.trim()) {
        emailWrap.innerHTML = `<a href="mailto:${kontakt.email}">${kontakt.email}</a>`;
        emailWrap.classList.remove('legal-placeholder');
      }

      // Hauptverein (Schwäbischer Albverein e.V.) - laut dessen eigenem
      // öffentlichen Impressum die tatsächlich verantwortliche Stelle,
      // da die Ortsgruppe rechtlich unselbständig ist.
      setText('legal-uebergeordneter-name',           kontakt.uebergeordneter_verein_name);
      setText('legal-uebergeordneter-adresse',        kontakt.uebergeordneter_verein_adresse);
      setText('legal-uebergeordneter-telefon',        kontakt.uebergeordneter_verein_telefon);
      setText('legal-uebergeordneter-registergericht', kontakt.uebergeordneter_verein_registergericht);
      setText('legal-uebergeordneter-registernummer',  kontakt.uebergeordneter_verein_registernummer);
      setText('legal-uebergeordneter-ustid',           kontakt.uebergeordneter_verein_ustid);
      setText('legal-uebergeordneter-praesident',      kontakt.uebergeordneter_verein_praesident);
      const ubTelLink = document.getElementById('legal-uebergeordneter-telefon-link');
      if (ubTelLink && kontakt.uebergeordneter_verein_telefon_href) {
        ubTelLink.href = `tel:${kontakt.uebergeordneter_verein_telefon_href}`;
      }

      // "Verantwortlich für den Inhalt dieser Unterseite" falls back to the
      // general Ansprechpartner unless a specific vertretungsberechtigte
      // Person has been entered under Rechtliches (see below) - that field
      // always wins once filled in.
      if (kontakt.ansprechpartner) setText('legal-vertreten-durch', kontakt.ansprechpartner);
    }

    if (rechtliches && rechtliches.vertretungsberechtigte_person && rechtliches.vertretungsberechtigte_person.trim()) {
      setText('legal-vertreten-durch', rechtliches.vertretungsberechtigte_person.trim());
    }
  }

  // ── Re-observe any newly added .reveal elements ──────────
  if (typeof window.cmsObserveReveal === 'function') {
    window.cmsObserveReveal();
  }

  // ── Signal tour-search/filter to initialize ──────────────
  document.dispatchEvent(new Event('cms-ready'));

})();

// ── Lightbox ──────────────────────────────────────────────
function initLightbox(bilder) {
  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lightbox-img');
  const lbCap   = document.getElementById('lightbox-caption');
  const lbClose = document.getElementById('lightbox-close');
  const lbPrev  = document.getElementById('lightbox-prev');
  const lbNext  = document.getElementById('lightbox-next');
  const lbBack  = document.getElementById('lightbox-backdrop');
  if (!lb || !lbImg) return;

  let current = 0;

  function show(index) {
    current = (index + bilder.length) % bilder.length;
    const b = bilder[current];
    lbImg.src = b.bild;
    lbImg.alt = b.titel || '';
    lbCap.textContent = b.titel || '';
    lbPrev.hidden = bilder.length <= 1;
    lbNext.hidden = bilder.length <= 1;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }

  function close() {
    lb.hidden = true;
    lbImg.src = '';
    document.body.style.overflow = '';
  }

  document.getElementById('gallery-grid').addEventListener('click', e => {
    const btn = e.target.closest('.gallery-item__btn');
    if (!btn) return;
    show(Number(btn.closest('.gallery-item').dataset.index));
  });

  lbClose.addEventListener('click', close);
  lbBack.addEventListener('click', close);
  lbPrev.addEventListener('click', () => show(current - 1));
  lbNext.addEventListener('click', () => show(current + 1));

  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft')  show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
}
