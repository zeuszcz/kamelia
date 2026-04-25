/* ════════════════════════════════════════════════════════════
   КАМЕЛИЯ · МЕД — Admin panel logic
   Auth, chrome injection, fetch helpers, page bootstrap.
   Depends on cabinet.js for shared api/getMe/logout.
   ════════════════════════════════════════════════════════════ */

(function () {

const { api, getMe, logout } = window.KAMELIA_CABINET;

const STAMP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L13 8 L19 7 L15 12 L19 17 L13 16 L12 22 L11 16 L5 17 L9 12 L5 7 L11 8 Z"/></svg>`;

async function requireAdmin() {
  const me = await getMe();
  if (!me) {
    location.href = '/kamelia/cabinet/login.html?next=/kamelia/admin/';
    return null;
  }
  if (!me.is_admin) {
    location.href = '/kamelia/cabinet/?denied=admin';
    return null;
  }
  return me;
}

const SECTIONS = [
  { id: 'home',         label: 'Дашборд',     href: '/kamelia/admin/',                  num: '01' },
  { id: 'appointments', label: 'Заявки',      href: '/kamelia/admin/appointments.html', num: '02' },
  { id: 'users',        label: 'Пациенты',    href: '/kamelia/admin/users.html',        num: '03' },
];

function buildAdminChrome(user, currentSection) {
  const initial = (user.name || user.email)[0].toUpperCase();
  const navHtml = SECTIONS.map(s =>
    `<li><a href="${s.href}" class="${s.id === currentSection ? 'active' : ''}">${s.label}</a></li>`
  ).join('');

  return `
  <header class="nav-wrap" id="navWrap">
    <div class="container nav">
      <a href="/kamelia/admin/" class="brand">
        <span class="brand-mark">${STAMP}</span>
        <span class="brand-name">
          <b>Камелия·Мед</b>
          <small>Админ-панель · оператор</small>
        </span>
      </a>
      <nav>
        <ul class="nav-links">${navHtml}</ul>
      </nav>
      <div class="nav-actions">
        <a href="/kamelia/cabinet/" style="font-size: 13px; color: var(--ink-3);">← Личный кабинет</a>
        <a href="/kamelia/" style="font-size: 13px; color: var(--ink-3);">На сайт</a>
        <div class="user-chip">
          <div class="user-info">
            <div class="uname">${user.name}</div>
            <div class="uemail" style="color: var(--accent);">administrator</div>
          </div>
          <div class="user-avatar" style="background: var(--accent);">${initial}</div>
        </div>
        <button class="btn btn--ghost btn--sm" id="adminLogout" title="Выйти" style="padding: 8px 12px;">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" style="width:14px;height:14px;"><path d="M10 12l4-4-4-4M14 8H6M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="menu-btn" id="menuBtn" aria-label="Меню"><span></span><span></span><span></span></button>
      </div>
    </div>
  </header>

  <aside class="mobile-nav" id="mobileToc">
    <nav>
      ${SECTIONS.map(s => `<a href="${s.href}" class="${s.id === currentSection ? 'active' : ''}"><span>${s.label}</span><span class="muted">${s.num}</span></a>`).join('')}
      <a href="/kamelia/cabinet/"><span>← Личный кабинет</span></a>
      <a href="/kamelia/"><span>На сайт</span></a>
      <a href="#" id="adminLogoutMobile" style="color: var(--accent);"><span>Выйти</span></a>
    </nav>
  </aside>
  `;
}

function buildAdminSidebar(currentSection) {
  return `
    <aside class="admin-side">
      <div class="admin-side-head">Админ-панель</div>
      <ul class="admin-side-list">
        ${SECTIONS.map(s => `
          <li class="admin-side-item ${s.id === currentSection ? 'active' : ''}">
            <a href="${s.href}">
              <span class="num">${s.num}</span>
              <span>${s.label}</span>
            </a>
          </li>
        `).join('')}
      </ul>
      <div class="admin-side-foot">
        <a href="/kamelia/cabinet/">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" style="width:12px;height:12px;"><path d="M13 8H3M7 4L3 8l4 4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Мой кабинет
        </a>
        <a href="/kamelia/">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" style="width:12px;height:12px;"><path d="M13 8H3M7 4L3 8l4 4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Главная сайта
        </a>
      </div>
    </aside>
  `;
}

async function initAdminPage(currentSection) {
  const user = await requireAdmin();
  if (!user) return null;

  const headMount = document.getElementById('chrome-head');
  if (headMount) headMount.innerHTML = buildAdminChrome(user, currentSection);

  const sideMount = document.getElementById('admin-side');
  if (sideMount) sideMount.innerHTML = buildAdminSidebar(currentSection);

  // logout
  const logoutBtn = document.getElementById('adminLogout');
  if (logoutBtn) logoutBtn.addEventListener('click', e => { e.preventDefault(); logout(); });
  const logoutBtnM = document.getElementById('adminLogoutMobile');
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

const STATUS_LABEL = {
  new: 'новая',
  confirmed: 'подтв.',
  done: 'выполнена',
  cancelled: 'отменена',
};
const STATUSES = ['new', 'confirmed', 'done', 'cancelled'];

const fmtDate = iso => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtDateTime = iso => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};
const fmtPhoneTel = p => (p || '').replace(/\D/g, '').replace(/^8/, '7').replace(/^([^7])/, '7$1');

window.KAMELIA_ADMIN = {
  api,
  initAdminPage,
  requireAdmin,
  STATUS_LABEL,
  STATUSES,
  fmtDate,
  fmtDateTime,
  fmtPhoneTel,
};

})();
