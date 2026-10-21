/* Demo shop layer shared by every page: account, cart, chosen vehicle.
   Everything lives in this browser only (localStorage); nothing is sent anywhere. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.body.dataset.root || '';
  const KEY = { cart: 'piesenord-demo-cart', user: 'piesenord-demo-user', car: 'piesenord-demo-car' };
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const lei = n => n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' lei';

  // Demo prices: stable per product code, labelled as demo wherever they show.
  const price = id => (window.PN_PRICES && window.PN_PRICES[id]) || fallback(id);
  const fallback = id => { let h = 2166136261; for (const c of String(id)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.round((19 + (Math.abs(h) % 120000) / 100) * 100) / 100; };

  const shop = window.PieseShop = {
    user: () => read(KEY.user, null),
    cart: () => read(KEY.cart, []),
    car: () => read(KEY.car, null),
    price, lei,
    login(name) { write(KEY.user, { name: name || 'Service Demo SRL', points: 1240 }); shop.sync(); },
    logout() { localStorage.removeItem(KEY.user); shop.sync(); },
    setCar(car) { write(KEY.car, car); shop.sync(); },
    clearCar() { localStorage.removeItem(KEY.car); shop.sync(); },
    add(item, qty = 1) {
      const cart = shop.cart(); const row = cart.find(r => r.id === item.id);
      if (row) row.qty += qty; else cart.push({ ...item, qty });
      write(KEY.cart, cart); shop.sync(); toast(`Adăugat în coș: ${item.name}`);
    },
    setQty(id, qty) { let cart = shop.cart(); cart = qty > 0 ? cart.map(r => r.id === id ? { ...r, qty } : r) : cart.filter(r => r.id !== id); write(KEY.cart, cart); shop.sync(); },
    empty() { write(KEY.cart, []); shop.sync(); },
    sync() {
      const user = shop.user(), cart = shop.cart(), car = shop.car();
      const count = cart.reduce((a, r) => a + r.qty, 0);
      $$('[data-cart-count]').forEach(el => { el.textContent = count; el.hidden = !count; });
      $$('[data-account-label]').forEach(el => { el.textContent = user ? user.name : 'Contul meu'; });
      $$('[data-car-label]').forEach(el => { el.textContent = car ? car.label : 'Alege mașina'; });
      document.documentElement.classList.toggle('is-logged', !!user);
      // prices: shown to signed-in customers only, like the live shop
      $$('[data-price]').forEach(el => {
        const p = price(el.dataset.price);
        el.innerHTML = user ? `<strong>${lei(p)}</strong><small>cu TVA · preț demo</small>` : `<button type="button" class="price-login" data-login>Autentifică-te pentru preț</button>`;
      });
      document.dispatchEvent(new CustomEvent('piesenord:sync'));
    }
  };

  // ---- toast
  let toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.append(toastEl); }
    toastEl.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-check"/></svg><span></span><a href="${root}cos.html">Vezi coșul</a>`;
    toastEl.querySelector('span').textContent = msg;
    toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 3200);
  }
  shop.toast = toast;

  // ---- login / register / forgot password dialog
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-login]');
    if (t) { e.preventDefault(); openAuth('login'); }
    const a = e.target.closest('[data-add]');
    if (a) {
      const qtyEl = a.closest('[data-buy]') && $('input[type=number]', a.closest('[data-buy]'));
      shop.add({ id: a.dataset.add, name: a.dataset.name, brand: a.dataset.brand || '', img: a.dataset.img || '', url: a.dataset.url || '' }, qtyEl ? Math.max(1, +qtyEl.value || 1) : 1);
    }
    const acc = e.target.closest('[data-account]');
    if (acc) { e.preventDefault(); if (shop.user()) location.href = root + 'cont.html'; else openAuth('login'); }
  });
  function openAuth(tab) {
    const d = $('#auth'); if (!d) return;
    $$('[data-auth-tab]', d).forEach(b => b.setAttribute('aria-selected', String(b.dataset.authTab === tab)));
    $$('[data-auth-panel]', d).forEach(p => { p.hidden = p.dataset.authPanel !== tab; });
    if (!d.open) d.showModal();
    const first = $(`[data-auth-panel="${tab}"] input`, d); if (first) first.focus();
  }
  shop.openAuth = openAuth;
  const auth = $('#auth');
  if (auth) {
    $$('[data-auth-tab]', auth).forEach(b => b.addEventListener('click', () => openAuth(b.dataset.authTab)));
    $$('[data-auth-go]', auth).forEach(b => b.addEventListener('click', e => { e.preventDefault(); openAuth(b.dataset.authGo); }));
    $$('form', auth).forEach(f => f.addEventListener('submit', e => {
      e.preventDefault();
      const kind = f.dataset.kind;
      if (kind === 'forgot') { $('.auth-msg', f).hidden = false; return; }
      const name = (f.firma && f.firma.value.trim()) || (f.user && f.user.value.trim().split('@')[0]) || '';
      shop.login(kind === 'register' ? (name || 'Service nou') : 'Service Demo SRL');
      auth.close(); toast(kind === 'register' ? 'Cont demo creat. Prețurile sunt acum vizibile.' : 'Te-ai autentificat (demo). Prețurile sunt acum vizibile.');
    }));
    $('[data-close]', auth).addEventListener('click', () => auth.close());
    auth.addEventListener('click', e => { if (e.target === auth) auth.close(); });
  }

  document.addEventListener('DOMContentLoaded', shop.sync);
  if (document.readyState !== 'loading') shop.sync();
})();
