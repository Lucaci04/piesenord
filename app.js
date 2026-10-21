(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Sections rise into view once
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !still) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(el => io.observe(el));
  } else reveals.forEach(el => el.classList.add('in'));

  // Phone call bar shows only after the hero's call button has left the screen
  const bar = $('.callbar'), heroCta = $('.hero-actions');
  if (bar && heroCta && 'IntersectionObserver' in window) {
    new IntersectionObserver(es => bar.classList.toggle('is-on', !es[0].isIntersecting && es[0].boundingClientRect.top < 0), { threshold: 0 }).observe(heroCta);
  } else if (bar) bar.classList.add('is-on');

  // Reviews: swipe, arrows, dots, and a gentle auto-advance that any touch holds
  const track = $('#reviews-track');
  if (track) {
    const items = $$('.review', track);
    const dots = $('.reviews-dots');
    dots.innerHTML = items.map(() => '<span></span>').join('');
    const marks = $$('span', dots);
    const step = () => items[1] ? items[1].offsetLeft - items[0].offsetLeft : track.clientWidth;
    let t = 0;
    const sync = () => { t = 0; const i = Math.round(track.scrollLeft / step()); marks.forEach((m, k) => m.classList.toggle('on', k === Math.min(i, marks.length - 1))); };
    track.addEventListener('scroll', () => { if (!t) t = requestAnimationFrame(sync); }, { passive: true });
    const go = d => {
      const max = track.scrollWidth - track.clientWidth - 4;
      track.scrollTo({ left: d > 0 && track.scrollLeft >= max ? 0 : Math.max(0, track.scrollLeft + step() * d), behavior: 'smooth' });
    };
    let held = 0, visible = false;
    const hold = () => { clearTimeout(held); held = setTimeout(() => { held = 0; }, 7000); };
    $$('[data-rev]').forEach(b => b.addEventListener('click', () => { go(+b.dataset.rev); hold(); }));
    if (!still) {
      setInterval(() => { if (visible && !held && !document.hidden) go(1); }, 4500);
      ['pointerdown', 'pointerenter', 'focusin', 'wheel', 'touchstart'].forEach(ev => track.addEventListener(ev, hold, { passive: true }));
      if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: .15 }).observe(track);
      else visible = true;
    }
    $$('.review-avatar img', track).forEach(img => img.addEventListener('error', () => img.remove()));
    sync();
  }

  // The Google map loads only on request
  $$('[data-load-map]').forEach(btn => btn.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.title = 'Harta: PieseNord Constanța, Str. Exemplului nr. 14';
    frame.loading = 'lazy';
    frame.src = 'https://www.google.com/maps/search/?api=1&query=Constan%C8%9Ba';
    $('#map').replaceChildren(frame);
  }));

  // Dialogs
  $$('[data-dialog]').forEach(btn => btn.addEventListener('click', () => {
    const d = document.getElementById(btn.dataset.dialog);
    if (d && d.showModal) { d.showModal(); d._opener = btn; }
  }));
  $$('dialog').forEach(d => {
    $('[data-close]', d).addEventListener('click', () => d.close());
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => d._opener && d._opener.focus());
  });

  // Brand chips on category pages
  const chips = $$('.chip');
  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(x => x.setAttribute('aria-pressed', String(x === c)));
    $$('.pgrid .pcard').forEach(card => { card.hidden = !!c.dataset.brand && card.dataset.brand !== c.dataset.brand; });
  }));

  // Catalog search: loads the index on first open, and works when opened from disk too
  const dlg = $('#search'), input = $('#search-input'), out = $('#search-results');
  const root = document.body.dataset.root || '';
  if (dlg) {
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const esc = s => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    let ready = false;
    const load = () => new Promise(res => {
      if (window.PN_SEARCH) return res();
      const s = document.createElement('script'); s.src = root + 'assets/search.js'; s.onload = res; s.onerror = res; document.head.append(s);
    });
    const open = async () => { dlg.showModal(); input.focus(); if (!ready) { await load(); ready = true; render(); } };
    $$('[data-search-open]').forEach(b => b.addEventListener('click', open));
    document.addEventListener('keydown', e => { if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName) && !dlg.open) { e.preventDefault(); open(); } });
    const hl = (t, words) => { let h = esc(t); words.forEach(w => { const i = norm(h).indexOf(w); if (w && i >= 0) h = h.slice(0, i) + '<mark>' + h.slice(i, i + w.length) + '</mark>' + h.slice(i + w.length); }); return h; };
    function render() {
      const q = norm(input.value.trim());
      if (q.length < 2 || !window.PN_SEARCH) { out.innerHTML = '<p class="search-hint">Scrie cel puțin 2 litere. Cauți în produsele și categoriile din acest catalog.</p>'; return; }
      const words = q.split(/\s+/).filter(Boolean);
      const hits = window.PN_SEARCH.filter(x => { const s = norm(x.t + ' ' + x.k); return words.every(w => s.includes(w)); });
      const cats = hits.filter(x => !x.u.startsWith('produs/')).slice(0, 6), prods = hits.filter(x => x.u.startsWith('produs/')).slice(0, 30);
      const link = x => x.x ? x.u : root + x.u;
      const ext = x => x.x ? ' target="_blank" rel="noopener noreferrer"' : '';
      let h = '';
      if (cats.length) h += '<p class="sr-group">Categorii</p>' + cats.map(x => `<a class="sr-item" href="${link(x)}"${ext(x)}><span class="sr-ico"><svg class="ico"><use href="#i-search"/></svg></span><span><strong>${hl(x.t, words)}</strong><small>${esc(x.k)}</small></span></a>`).join('');
      if (prods.length) h += '<p class="sr-group">Produse</p>' + prods.map(x => `<a class="sr-item" href="${link(x)}">${x.i ? `<img src="${root}assets/products/${x.i}.webp" alt="" loading="lazy">` : '<span class="sr-ico"></span>'}<span><strong>${hl(x.t, words)}</strong><small>${esc(x.k)}</small></span></a>`).join('');
      if (!h) h = `<p class="search-hint">Nimic pentru „${esc(input.value)}” în acest catalog. <a href="https://piesenord.example/" target="_blank" rel="noopener noreferrer">Caută în tot catalogul pe https://piesenord.example/</a> sau sună la 0300 001 300.</p>`;
      out.innerHTML = h;
    }
    input.addEventListener('input', render);
  }
})();
