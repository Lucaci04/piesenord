/* Page behaviour for the demo shop: menu drawer, listings, product quantity, vehicle finder, cart, account, branches. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const shop = window.PieseShop;
  const root = document.body.dataset.root || '';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const icon = n => `<svg class="ico" aria-hidden="true"><use href="#i-${n}"/></svg>`;

  // ---- drawer menu (phones)
  const drawer = $('#drawer'), menuBtn = $('[data-menu]');
  if (drawer && menuBtn) {
    const close = () => { drawer.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; menuBtn.focus(); };
    menuBtn.addEventListener('click', () => { drawer.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; $('[data-menu-close]', drawer).focus(); });
    $('[data-menu-close]', drawer).addEventListener('click', close);
    drawer.addEventListener('click', e => { if (e.target === drawer) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) close(); });
  }

  // ---- listings: facets, sort, grid/list
  const grid = $('[data-listing]');
  if (grid) {
    const cards = $$('.pcard', grid);
    cards.forEach((c, i) => { c.dataset.order = i; try { c._f = JSON.parse(c.dataset.facets || '{}'); } catch (e) { c._f = {}; } });
    const desk = $('[data-facets]'), mob = $('[data-facets-mobile]');
    if (desk && mob) mob.innerHTML = desk.innerHTML; // same filters in the phone sheet
    const boxes = () => $$('input[data-facet]');
    const apply = () => {
      const chosen = {};
      boxes().filter(b => b.checked).forEach(b => { (chosen[b.dataset.facet] ||= new Set()).add(b.value); });
      let n = 0;
      cards.forEach(c => { const ok = Object.entries(chosen).every(([k, set]) => set.has(c._f[k])); c.hidden = !ok; if (ok) n++; });
      const v = $('[data-visible]'); if (v) v.textContent = n;
      const empty = $('.empty-filter'); if (empty) empty.hidden = n > 0;
    };
    document.addEventListener('change', e => {
      const b = e.target.closest('input[data-facet]'); if (!b) return;
      boxes().filter(x => x !== b && x.dataset.facet === b.dataset.facet && x.value === b.value).forEach(x => { x.checked = b.checked; });
      apply();
    });
    $$('[data-clear-facets]').forEach(b => b.addEventListener('click', () => { boxes().forEach(x => { x.checked = false; }); apply(); }));
    const sheet = $('[data-facets-sheet]');
    $$('[data-facets-open]').forEach(b => b.addEventListener('click', () => { sheet.hidden = false; }));
    $$('[data-facets-close]').forEach(b => b.addEventListener('click', () => { sheet.hidden = true; }));
    const sort = $('[data-sort]');
    if (sort) sort.addEventListener('change', () => {
      const v = sort.value;
      if ((v === 'asc' || v === 'desc') && !shop.user()) { sort.value = ''; shop.openAuth('login'); return; }
      const key = c => v === 'name' ? c.dataset.name : v ? shop.price(c.dataset.id) : +c.dataset.order;
      cards.slice().sort((a, b) => { const x = key(a), y = key(b); return (typeof x === 'string' ? x.localeCompare(y, 'ro') : x - y) * (v === 'desc' ? -1 : 1); }).forEach(c => grid.append(c));
    });
    $$('[data-view]').forEach(b => b.addEventListener('click', () => {
      $$('[data-view]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      grid.classList.toggle('as-list', b.dataset.view === 'list');
      try { localStorage.setItem('piesenord-demo-view', b.dataset.view); } catch (e) {}
    }));
    try { if (localStorage.getItem('piesenord-demo-view') === 'list') $('[data-view="list"]').click(); } catch (e) {}
  }

  // ---- quantity steppers
  $$('[data-qty]').forEach(b => b.addEventListener('click', () => {
    const input = $('input', b.closest('.qty')); input.value = Math.max(1, (+input.value || 1) + +b.dataset.qty);
  }));

  // ---- branches filter
  const bf = $('[data-branch-filter]');
  if (bf) bf.addEventListener('input', () => {
    const q = bf.value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    $$('.branch').forEach(li => { li.hidden = q && !li.dataset.city.normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(q); });
  });

  // ---- vehicle finder
  if (document.body.classList.contains('page-vehicle')) {
    const start = () => {
      const V = window.PN_VEH; if (!V) return setTimeout(start, 50);
      const TOP = ['DACIA', 'VW', 'RENAULT', 'FORD', 'OPEL', 'SKODA', 'BMW', 'MERCEDES-BENZ', 'AUDI', 'TOYOTA'];
      const SHOW = { DACIA: 'Dacia', VW: 'Volkswagen', RENAULT: 'Renault', FORD: 'Ford', OPEL: 'Opel', SKODA: 'Škoda', BMW: 'BMW', 'MERCEDES-BENZ': 'Mercedes-Benz', AUDI: 'Audi', TOYOTA: 'Toyota' };
      const lists = { make: $('[data-list="make"]'), model: $('[data-list="model"]'), engine: $('[data-list="engine"]') };
      const steps = { model: $('[data-step="model"]'), engine: $('[data-step="engine"]') };
      let make = null, model = null;
      const btn = (label, sub, data, pressed) => `<button type="button" ${data} aria-pressed="${pressed ? 'true' : 'false'}"><span>${esc(label)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</button>`;
      const renderMakes = (q = '') => {
        const qq = q.toLowerCase();
        lists.make.innerHTML = V.makes.filter(m => m.n.toLowerCase().includes(qq)).map(m => btn(m.n, V.models[m.n] ? '' : 'pe https://piesenord.example/', `data-make="${esc(m.n)}"`, m.n === make)).join('');
      };
      $('[data-top-makes]').innerHTML = TOP.filter(t => V.models[t]).map(t => `<button type="button" data-make="${t}" aria-pressed="false">${SHOW[t]}</button>`).join('');
      const renderModels = (q = '') => {
        const ms = V.models[make] || [];
        const qq = q.toLowerCase();
        lists.model.innerHTML = ms.filter(m => m.n.toLowerCase().includes(qq)).map(m => btn(m.n, m.y, `data-model="${esc(m.n)}"`, m.n === model)).join('') || '<p class="veh-hint">Niciun model.</p>';
      };
      const renderEngines = () => {
        const es = V.engines[model];
        if (!es) {
          const m = (V.models[make] || []).find(x => x.n === model);
          lists.engine.innerHTML = `<p class="veh-hint">În acest demo, motorizările sunt încărcate pentru <strong>Dacia Logan 1 (LS)</strong>. Pentru ${esc(model)} vezi motorizările în catalogul complet.</p><a class="btn btn-outline" href="https://piesenord.example/${esc(m ? m.l : '')}" target="_blank" rel="noopener noreferrer">Deschide pe https://piesenord.example/ ${icon('external')}</a> <button type="button" class="btn btn-primary" data-try-logan>Încearcă Dacia Logan 1</button>`;
          return;
        }
        lists.engine.innerHTML = es.map(x => {
          const c = x.c || [];
          const sub = [c[1], c[3] && c[3] + ' CP', c[6]].filter(Boolean).join(' · ');
          return btn(x.n, sub, `data-engine="${esc(x.l)}" data-label="${esc(x.n)}"`, false);
        }).join('');
      };
      const setStep = (el, on) => { el.setAttribute('aria-disabled', String(!on)); const f = $('input', el); if (f) f.disabled = !on; };
      document.addEventListener('click', e => {
        const mk = e.target.closest('[data-make]');
        if (mk) {
          make = mk.dataset.make; model = null;
          $$('[data-make]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.make === make)));
          if (!V.models[make]) {
            const m = V.makes.find(x => x.n === make);
            lists.model.innerHTML = `<p class="veh-hint">În acest demo, modelele sunt încărcate pentru 10 mărci populare.</p><a class="btn btn-outline" href="https://piesenord.example/${esc(m.l)}" target="_blank" rel="noopener noreferrer">Modele ${esc(make)} pe https://piesenord.example/ ${icon('external')}</a>`;
            setStep(steps.model, true); setStep(steps.engine, false); lists.engine.innerHTML = '<p class="veh-hint">Alege întâi modelul.</p>'; return;
          }
          setStep(steps.model, true); setStep(steps.engine, false); renderModels(); lists.engine.innerHTML = '<p class="veh-hint">Alege întâi modelul.</p>';
          if (innerWidth < 900) steps.model.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        const md = e.target.closest('[data-model]');
        if (md) { model = md.dataset.model; renderModels($('[data-filter="model"]').value); setStep(steps.engine, true); renderEngines(); if (innerWidth < 900) steps.engine.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        if (e.target.closest('[data-try-logan]')) { make = 'DACIA'; model = 'LOGAN 1 (LS) 08/04-11/12'; $$('[data-make]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.make === make))); setStep(steps.model, true); renderModels(); setStep(steps.engine, true); renderEngines(); }
        const en = e.target.closest('[data-engine]');
        if (en) {
          const label = 'DACIA LOGAN 1 (LS) ' + en.dataset.label;
          if (en.dataset.engine === V.demo.engine) { shop.setCar({ label, url: V.demo.url }); location.href = root + V.demo.url; }
          else {
            shop.setCar({ label, url: 'https://piesenord.example/' + en.dataset.engine });
            lists.engine.insertAdjacentHTML('afterbegin', `<p class="veh-hint">Piesele pentru ${esc(en.dataset.label)} se deschid în catalogul complet. În demo, lista de piese e încărcată pentru <strong>1.5 dCi (LS0K)</strong>.</p>`);
            window.open('https://piesenord.example/' + en.dataset.engine, '_blank', 'noopener');
          }
        }
      });
      $('[data-filter="make"]').addEventListener('input', e => renderMakes(e.target.value));
      $('[data-filter="model"]').addEventListener('input', e => renderModels(e.target.value));
      renderMakes();
      const car = shop.car(), cur = $('[data-veh-current]');
      if (car && cur) { cur.hidden = false; cur.innerHTML = `<div class="veh-chosen">${icon('car')}<div><small>Mașina ta</small><b>${esc(car.label)}</b></div><a class="btn" href="${car.url.startsWith('http') ? car.url : root + car.url}">Vezi piesele</a><button type="button" class="link-remove" data-forget-car style="color:#fff">Șterge</button></div>`; }
      document.addEventListener('click', e => { if (e.target.closest('[data-forget-car]')) { shop.clearCar(); cur.hidden = true; } });
    };
    start();
  }

  // ---- cart page
  const cartBox = $('[data-cart-page]');
  if (cartBox) {
    const render = () => {
      const cart = shop.cart(), user = shop.user();
      const last = (() => { try { return JSON.parse(sessionStorage.getItem('piesenord-demo-last')); } catch (e) { return null; } })();
      if (last) {
        sessionStorage.removeItem('piesenord-demo-last');
        cartBox.innerHTML = `<div class="done"><h2>Comanda ${esc(last.no)} a fost trimisă (demo)</h2><p>${last.qty} produse · ${esc(last.mode)}. În site-ul real, filiala Constanța confirmă comanda și primești notificare pe email și SMS.</p><div class="vin-actions"><a class="btn btn-primary" href="${root}cont.html">Vezi comenzile mele</a><a class="btn btn-outline" href="${root}catalog.html">Continuă cumpărăturile</a></div></div>`;
        return;
      }
      if (!cart.length) { cartBox.innerHTML = `<div class="empty">${icon('cart')}<h2>Coșul e gol</h2><p>Caută un produs sau pornește de la mașina ta.</p><div class="vin-actions"><a class="btn btn-primary" href="${root}catalog.html">Mergi la catalog</a><a class="btn btn-outline" href="${root}vehicul.html">Caută după mașină</a></div></div>`; return; }
      const rows = cart.map(r => `<li class="cart-row"><img src="${r.img ? root + esc(r.img) : root + 'assets/favicon.svg'}" alt="" loading="lazy"><div><h3><a href="${root}produs/${esc(r.id)}.html">${esc(r.name)}</a></h3><p class="meta">${esc(r.brand)} · Cod ${esc(r.id)}</p></div><div class="row-foot"><div class="qty"><button type="button" data-cq="-1" data-id="${esc(r.id)}" aria-label="Scade">−</button><input type="number" min="1" value="${r.qty}" data-ci="${esc(r.id)}" aria-label="Cantitate"><button type="button" data-cq="1" data-id="${esc(r.id)}" aria-label="Crește">+</button></div><div class="price">${user ? `<strong>${shop.lei(shop.price(r.id) * r.qty)}</strong><small>preț demo</small>` : ''}</div><button type="button" class="link-remove" data-rm="${esc(r.id)}">Șterge</button></div></li>`).join('');
      const qty = cart.reduce((a, r) => a + r.qty, 0);
      const sub = cart.reduce((a, r) => a + shop.price(r.id) * r.qty, 0);
      cartBox.innerHTML = `<div class="cart-layout"><div><ul class="cart-list">${rows}</ul><button type="button" class="link-remove" data-empty style="margin-top:14px">Golește coșul</button></div>
        <aside class="summary"><h2>Sumar comandă</h2>
          ${user ? `<dl><div><dt>Produse (${qty})</dt><dd>${shop.lei(sub)}</dd></div><div><dt>Livrare</dt><dd>gratuit</dd></div><div class="total"><dt>Total cu TVA</dt><dd>${shop.lei(sub)}</dd></div></dl><p class="auth-demo" style="margin:0">Prețuri demo. În site-ul real vezi prețurile contului tău.</p>` : `<p>Autentifică-te ca să vezi prețurile contului tău și să trimiți comanda.</p><button type="button" class="btn btn-primary btn-lg" data-login>Autentificare</button>`}
          <fieldset style="border:0;padding:0;margin:0;display:grid;gap:8px"><legend style="font-weight:700;margin-bottom:6px">Livrare</legend>
            <label class="radio-card"><input type="radio" name="mode" value="Ridicare din filiala Constanța" checked><span><b>Ridicare din filiala Constanța</b><small>Str. Exemplului nr. 14 · L–V 8–17, Sâm 8–12</small></span></label>
            <label class="radio-card"><input type="radio" name="mode" value="Livrare la atelier"><span><b>Livrare la atelier</b><small>Flota PieseNord livrează de mai multe ori pe zi</small></span></label></fieldset>
          <div class="field"><label for="obs">Observații</label><textarea id="obs" rows="2" placeholder="Nr. de înmatriculare, serie șasiu…"></textarea></div>
          <button type="button" class="btn btn-primary btn-lg" data-order ${user ? '' : 'disabled'}>Trimite comanda</button>
        </aside></div>`;
    };
    cartBox.addEventListener('click', e => {
      const q = e.target.closest('[data-cq]'); if (q) { const r = shop.cart().find(x => x.id === q.dataset.id); shop.setQty(q.dataset.id, r.qty + +q.dataset.cq); }
      const rm = e.target.closest('[data-rm]'); if (rm) shop.setQty(rm.dataset.rm, 0);
      if (e.target.closest('[data-empty]')) shop.empty();
      if (e.target.closest('[data-order]')) {
        const cart = shop.cart(); const mode = $('input[name=mode]:checked', cartBox).value;
        const no = 'CT-' + String(Date.now()).slice(-6);
        const orders = JSON.parse(localStorage.getItem('piesenord-demo-orders') || '[]');
        orders.unshift({ no, date: new Date().toLocaleDateString('ro-RO'), qty: cart.reduce((a, r) => a + r.qty, 0), total: cart.reduce((a, r) => a + shop.price(r.id) * r.qty, 0), mode, status: 'În pregătire' });
        localStorage.setItem('piesenord-demo-orders', JSON.stringify(orders));
        sessionStorage.setItem('piesenord-demo-last', JSON.stringify({ no, qty: orders[0].qty, mode }));
        shop.empty();
      }
    });
    cartBox.addEventListener('change', e => { const i = e.target.closest('[data-ci]'); if (i) shop.setQty(i.dataset.ci, Math.max(0, +i.value || 0)); });
    document.addEventListener('piesenord:sync', render);
    render();
  }

  // ---- account page
  const acc = $('[data-account-page]');
  if (acc) {
    const render = () => {
      const user = shop.user(), car = shop.car();
      if (!user) { acc.innerHTML = `<div class="empty">${icon('user')}<h2>Intră în contul tău</h2><p>Vezi prețurile tale, comenzile, punctele de loialitate și mașinile salvate.</p><div class="vin-actions"><button type="button" class="btn btn-primary btn-lg" data-login>Accesare</button></div></div>`; return; }
      let orders = []; try { orders = JSON.parse(localStorage.getItem('piesenord-demo-orders') || '[]'); } catch (e) {}
      const rows = orders.map(o => `<tr><td>${esc(o.no)}</td><td>${esc(o.date)}</td><td>${o.qty}</td><td>${shop.lei(o.total)}</td><td>${esc(o.mode)}</td><td><span class="status">${esc(o.status)}</span></td></tr>`).join('');
      acc.innerHTML = `<div class="acc-grid">
        <section class="acc-card"><h2>${esc(user.name)}</h2><p class="auth-demo" style="margin:0">Cont demo · filiala Constanța</p><button type="button" class="btn btn-outline" data-logout>Ieșire din cont</button></section>
        <section class="acc-card"><h2>Puncte de loialitate</h2><p class="big">${user.points.toLocaleString('ro-RO')}</p><a href="https://piesenord.example/" target="_blank" rel="noopener noreferrer">Regulamentul programului ${icon('external')}</a></section>
        <section class="acc-card"><h2>Mașina mea</h2>${car ? `<p><b>${esc(car.label)}</b></p><a class="btn btn-outline" href="${car.url.startsWith('http') ? car.url : root + car.url}">Piese pentru ea</a>` : `<p>Nicio mașină salvată.</p><a class="btn btn-outline" href="${root}vehicul.html">Alege mașina</a>`}</section>
      </div>
      <section class="acc-card" style="margin-top:16px;overflow-x:auto"><h2>Comenzile mele</h2>${rows ? `<table class="orders"><thead><tr><th>Nr.</th><th>Data</th><th>Buc.</th><th>Total demo</th><th>Livrare</th><th>Stare</th></tr></thead><tbody>${rows}</tbody></table>` : '<p>Nicio comandă încă. Comenzile trimise din coș apar aici.</p>'}</section>
      <section class="acc-card" style="margin-top:16px"><h2>PieseNord Pro, inclus în cont</h2><ul class="checks"><li><strong>Gestionarea comenzilor</strong>: calendar, oferte, foi de comandă</li><li><strong>Date tehnice și de service</strong>: montaj, reglaje, timpi de lucru</li><li><strong>Carte de service electronică</strong> pentru fiecare mașină</li></ul></section>`;
    };
    acc.addEventListener('click', e => { if (e.target.closest('[data-logout]')) shop.logout(); });
    document.addEventListener('piesenord:sync', render);
    render();
  }
})();
