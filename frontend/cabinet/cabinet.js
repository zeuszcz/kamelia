/* ════════════════════════════════════════════════════════════
   КАМЕЛIЯ · МЕД — Cabinet (личный кабинет) logic
   API client + route guards + UI bindings
   ════════════════════════════════════════════════════════════ */

(function () {

const API = '';  // same origin

async function api(path, opts = {}) {
  const o = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  };
  if (o.body && typeof o.body !== 'string') o.body = JSON.stringify(o.body);
  const res = await fetch(API + path, o);
  let data;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const err = new Error((data && data.detail) || `Ошибка ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function getMe() {
  try { return await api('/api/auth/me'); }
  catch (e) { return null; }
}

async function logout() {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
  location.href = '/kamelia/cabinet/login.html';
}

function requireAuth(redirectTo = '/kamelia/cabinet/login.html') {
  return getMe().then(user => {
    if (!user) { location.href = redirectTo; return null; }
    return user;
  });
}

function requireGuest(redirectTo = '/kamelia/cabinet/') {
  return getMe().then(user => {
    if (user) { location.href = redirectTo; return null; }
    return null;
  });
}

const fmtDate = iso => {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
};

const fmtDateTime = iso => {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const STATUS_LABEL = {
  new: 'новая',
  confirmed: 'подтверждена',
  done: 'выполнена',
  cancelled: 'отменена',
};
const STATUS_COLOR = {
  new: 'var(--blood)',
  confirmed: 'var(--ink)',
  done: 'var(--sage-deep, #5E6E5A)',
  cancelled: 'var(--ash)',
};

/* ═════════════════════════════════════════════════
   Cabinet layout: side nav + content
   ═════════════════════════════════════════════════ */

function buildCabinetChrome(user, currentSection) {
  const sections = [
    { id: 'home',         label: 'Главная',       href: '/kamelia/cabinet/',                  num: '01' },
    { id: 'appointments', label: 'Мои записи',    href: '/kamelia/cabinet/appointments.html', num: '02' },
    { id: 'profile',      label: 'Личные данные', href: '/kamelia/cabinet/profile.html',      num: '03' },
  ];

  const initial = (user.name || user.email)[0].toUpperCase();
  const STAMP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L13 8 L19 7 L15 12 L19 17 L13 16 L12 22 L11 16 L5 17 L9 12 L5 7 L11 8 Z"/></svg>`;

  return `
  <header class="nav-wrap" id="navWrap">
    <div class="container nav">
      <a href="/kamelia/" class="brand">
        <span class="brand-mark">${STAMP}</span>
        <span class="brand-name"><b>Камелия·Мед</b><small>Личный кабинет</small></span>
      </a>
      <nav>
        <ul class="nav-links">
          ${sections.map(s => `<li><a href="${s.href}" class="${s.id === currentSection ? 'active' : ''}">${s.label}</a></li>`).join('')}
        </ul>
      </nav>
      <div class="nav-actions">
        ${user.is_admin ? '<a href="/kamelia/admin/" style="font-size: 13px; color: var(--accent); font-weight: 500; padding: 6px 12px; background: var(--accent-tint); border-radius: 999px;">⚙ Админка</a>' : ''}
        <a href="/kamelia/" style="font-size: 13px; color: var(--ink-3);">← На сайт</a>
        <a href="/kamelia/booking.html" class="btn btn--brand btn--sm"><span>+ Запись</span></a>
        <div class="user-chip">
          <div class="user-info">
            <div class="uname">${user.name}</div>
            <div class="uemail">№ ${String(user.id).padStart(4, '0')}${user.is_admin ? ' · admin' : ''}</div>
          </div>
          <div class="user-avatar"${user.is_admin ? ' style="background: var(--accent);"' : ''}>${initial}</div>
        </div>
        <button class="btn btn--ghost btn--sm" id="cabLogout" title="Выйти" style="padding: 8px 12px;">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" style="width:14px;height:14px;"><path d="M10 12l4-4-4-4M14 8H6M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="menu-btn" id="menuBtn" aria-label="Меню"><span></span><span></span><span></span></button>
      </div>
    </div>
  </header>

  <aside class="mobile-nav" id="mobileToc">
    <nav>
      ${sections.map(s => `<a href="${s.href}" class="${s.id === currentSection ? 'active' : ''}"><span>${s.label}</span><span class="muted">${s.num}</span></a>`).join('')}
      ${user.is_admin ? '<a href="/kamelia/admin/" style="color: var(--accent);"><span>⚙ Админ-панель</span><span class="muted">A</span></a>' : ''}
      <a href="/kamelia/booking.html"><span>+ Новая запись</span></a>
      <a href="/kamelia/"><span>← На сайт</span></a>
      <a href="#" id="cabLogoutMobile" style="color: var(--accent);"><span>Выйти</span></a>
    </nav>
  </aside>
  `;
}

function buildCabinetSidebar(currentSection) {
  const sections = [
    { id: 'home',         label: 'Главная',       href: '/kamelia/cabinet/',                  num: '01' },
    { id: 'appointments', label: 'Мои записи',    href: '/kamelia/cabinet/appointments.html', num: '02' },
    { id: 'profile',      label: 'Личные данные', href: '/kamelia/cabinet/profile.html',      num: '03' },
  ];
  return `
    <aside class="cab-side">
      <div class="cab-side-head">Разделы кабинета</div>
      <ul class="cab-side-list">
        ${sections.map(s => `
          <li class="cab-side-item ${s.id === currentSection ? 'active' : ''}">
            <a href="${s.href}">
              <span class="num">${s.num}</span>
              <span>${s.label}</span>
            </a>
          </li>
        `).join('')}
      </ul>
      <div class="cab-side-foot">
        <a href="/kamelia/booking.html" class="btn btn--brand btn--sm" style="width:100%;justify-content:center;">+ Новая запись</a>
      </div>
    </aside>
  `;
}

/* ═════════════════════════════════════════════════
   PAGE INIT helpers
   ═════════════════════════════════════════════════ */

async function initCabinetPage(currentSection) {
  const user = await requireAuth();
  if (!user) return null;

  const headMount = document.getElementById('chrome-head');
  if (headMount) headMount.innerHTML = buildCabinetChrome(user, currentSection);

  const sideMount = document.getElementById('cab-side');
  if (sideMount) sideMount.innerHTML = buildCabinetSidebar(currentSection);

  const logoutBtn = document.getElementById('cabLogout');
  if (logoutBtn) logoutBtn.addEventListener('click', e => { e.preventDefault(); logout(); });
  const logoutBtnM = document.getElementById('cabLogoutMobile');
  if (logoutBtnM) logoutBtnM.addEventListener('click', e => { e.preventDefault(); logout(); });

  // mobile menu
  const btn = document.getElementById('menuBtn');
  const drawer = document.getElementById('mobileToc');
  if (btn && drawer) {
    const open = () => { drawer.classList.add('open'); btn.classList.add('open'); document.body.style.overflow='hidden'; };
    const closeFn = () => { drawer.classList.remove('open'); btn.classList.remove('open'); document.body.style.overflow=''; };
    btn.addEventListener('click', () => drawer.classList.contains('open') ? closeFn() : open());
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeFn));
  }

  // nav scroll state
  const nav = document.getElementById('navWrap');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  return user;
}

/* ─────────── EXPORT ─────────── */
window.KAMELIA_CABINET = {
  api,
  getMe,
  logout,
  requireAuth,
  requireGuest,
  initCabinetPage,
  fmtDate,
  fmtDateTime,
  STATUS_LABEL,
  STATUS_COLOR,
};

})();
