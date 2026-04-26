/* ════════════════════════════════════════════════════════════════════
   КАМЕЛИЯ · МЕД — Enterprise enhancements layer
   Custom cursor · view transitions · ⌘K palette · toasts · skeletons ·
   parallax · magnetic buttons · scroll progress · dark theme · calc
   ════════════════════════════════════════════════════════════════════ */

(function () {

const PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─────────────────────────────────
   THEME TOGGLE
   ───────────────────────────────── */

const THEME_KEY = 'kamelia-theme';

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0F0F0E');
  } else {
    document.documentElement.classList.remove('dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#F8F5F0');
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (sysDark ? 'dark' : 'light');
  applyTheme(initial);
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
  toast.info(next === 'dark' ? 'Тёмная тема' : 'Светлая тема', '');
}

initTheme();

/* ─────────────────────────────────
   TOAST SYSTEM
   ───────────────────────────────── */

const ICONS = {
  success: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l3 3 7-7"/></svg>',
  error:   '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M3 3l10 10M13 3L3 13"/></svg>',
  info:    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v.01M8 7v4"/></svg>',
};

function ensureToastsRoot() {
  let r = document.getElementById('toasts');
  if (r) return r;
  r = document.createElement('div');
  r.id = 'toasts';
  r.className = 'toasts';
  document.body.appendChild(r);
  return r;
}

function toast(type, title, sub = '', duration = 5000) {
  const root = ensureToastsRoot();
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.style.setProperty('--dur', duration + 'ms');
  t.innerHTML = `
    <div class="toast-icon">${ICONS[type] || ICONS.info}</div>
    <div class="toast-msg">
      <strong>${title}</strong>
      ${sub ? `<span class="sub">${sub}</span>` : ''}
    </div>
    <button class="toast-close" aria-label="Закрыть">
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>
    </button>
    <div class="toast-bar"></div>
  `;
  root.appendChild(t);

  const remove = () => {
    if (t.classList.contains('removing')) return;
    t.classList.add('removing');
    t.addEventListener('animationend', () => t.remove(), { once: true });
  };
  const timer = setTimeout(remove, duration);
  t.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(timer);
    remove();
  });
  return remove;
}
toast.success = (t, s, d) => toast('success', t, s, d);
toast.error   = (t, s, d) => toast('error', t, s, d);
toast.info    = (t, s, d) => toast('info', t, s, d);

window.toast = toast;

/* override window.alert globally to use toast */
const _origAlert = window.alert.bind(window);
window.alert = function(msg) {
  if (typeof msg === 'string') toast.error('Внимание', msg, 6000);
  else _origAlert(msg);
};

/* ─────────────────────────────────
   TOP PROGRESS BAR (page nav)
   ───────────────────────────────── */

let topBar;
function ensureTopBar() {
  if (topBar) return topBar;
  topBar = document.createElement('div');
  topBar.className = 'top-progress';
  document.body.appendChild(topBar);
  return topBar;
}

let progressTimer;
function startProgress() {
  const bar = ensureTopBar();
  bar.classList.remove('done');
  bar.style.width = '0';
  let p = 0;
  clearInterval(progressTimer);
  requestAnimationFrame(() => { bar.style.width = '20%'; });
  progressTimer = setInterval(() => {
    p += (90 - p) * 0.08;
    bar.style.width = p + '%';
  }, 200);
}
function endProgress() {
  const bar = ensureTopBar();
  clearInterval(progressTimer);
  bar.style.width = '100%';
  setTimeout(() => bar.classList.add('done'), 200);
}

/* intercept internal navigation links */
function interceptNav() {
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;
    if (link.dataset.modal !== undefined) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (link.origin !== location.origin) return;
    if (link.href === location.href) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    startProgress();
  }, true);

  window.addEventListener('pageshow', endProgress);
  window.addEventListener('beforeunload', startProgress);
}

/* ─────────────────────────────────
   SCROLL PROGRESS (right-side)
   ───────────────────────────────── */

function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 200 ? Math.min(100, (window.scrollY / max) * 100) : 0;
      bar.style.setProperty('--p', p + '%');
      bar.classList.toggle('show', max > 800 && window.scrollY > 100);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ─────────────────────────────────
   BACK-TO-TOP BUTTON
   ───────────────────────────────── */

function initBackToTop() {
  const btn = document.createElement('button');
  btn.className = 'back-top';
  btn.setAttribute('aria-label', 'Наверх');
  btn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4-4 4 4"/></svg>';
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.body.appendChild(btn);

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      btn.classList.toggle('show', window.scrollY > 600);
      ticking = false;
    });
  }, { passive: true });
}

/* ─────────────────────────────────
   CUSTOM CURSOR
   ───────────────────────────────── */

function initCursor() {
  if (PREFERS_REDUCED) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  document.documentElement.classList.add('has-cursor');

  const dot = document.createElement('div');
  dot.className = 'kcursor-dot';
  const ring = document.createElement('div');
  ring.className = 'kcursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mx = 0, my = 0;
  let rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });

  let raf;
  function loop() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    raf = requestAnimationFrame(loop);
  }
  loop();

  document.addEventListener('mouseleave', () => {
    dot.classList.add('hidden');
    ring.classList.add('hidden');
  });
  document.addEventListener('mouseenter', () => {
    dot.classList.remove('hidden');
    ring.classList.remove('hidden');
  });
  document.addEventListener('mousedown', () => ring.classList.add('click'));
  document.addEventListener('mouseup', () => ring.classList.remove('click'));

  function bindHover() {
    document.querySelectorAll('a, button, [role="button"], .magnetic, .price-row, .branch-row, .doc-card, .module, .dir-row, .cmdk-trigger').forEach(el => {
      if (el.dataset.kcursorBound) return;
      el.dataset.kcursorBound = '1';
      el.addEventListener('mouseenter', () => ring.classList.add('hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
    });
    document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="password"], input[type="search"], textarea').forEach(el => {
      if (el.dataset.kcursorTextBound) return;
      el.dataset.kcursorTextBound = '1';
      el.addEventListener('mouseenter', () => ring.classList.add('text'));
      el.addEventListener('mouseleave', () => ring.classList.remove('text'));
    });
  }
  bindHover();
  // re-bind after dynamic content
  new MutationObserver(bindHover).observe(document.body, { childList: true, subtree: true });
}

/* ─────────────────────────────────
   MAGNETIC BUTTONS
   ───────────────────────────────── */

function initMagnetic() {
  if (PREFERS_REDUCED) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  function bind(el) {
    if (el.dataset.magneticBound) return;
    el.dataset.magneticBound = '1';
    const inner = el.querySelector('.magnetic-inner') || el;
    let raf;
    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const f = .25;
        el.style.transform = `translate(${x * f}px, ${y * f}px)`;
        if (inner !== el) inner.style.transform = `translate(${x * f * .6}px, ${y * f * .6}px)`;
      });
    });
    el.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      el.style.transform = '';
      if (inner !== el) inner.style.transform = '';
    });
  }

  const sel = '.magnetic, .btn--brand, .btn--accent, .btn--primary, .hero-actions .btn';
  document.querySelectorAll(sel).forEach(bind);
  new MutationObserver(() => document.querySelectorAll(sel).forEach(bind))
    .observe(document.body, { childList: true, subtree: true });
}

/* ─────────────────────────────────
   PARALLAX
   ───────────────────────────────── */

function initParallax() {
  if (PREFERS_REDUCED) return;

  const elements = [];
  function refresh() {
    elements.length = 0;
    document.querySelectorAll('[data-parallax]').forEach(el => {
      elements.push({ el, speed: parseFloat(el.dataset.parallax) || 0.3 });
    });
  }
  refresh();

  let ticking = false;
  function update() {
    const sy = window.scrollY;
    const vh = window.innerHeight;
    elements.forEach(({ el, speed }) => {
      const r = el.getBoundingClientRect();
      const elTop = r.top + sy;
      // only animate when in viewport
      if (r.bottom < -200 || r.top > vh + 200) return;
      const offset = (sy - elTop + vh) * speed;
      el.style.transform = `translate3d(0, ${offset * 0.05}px, 0)`;
    });
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', refresh);
  update();

  // re-scan on dynamic mutations
  new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
}

/* ─────────────────────────────────
   STAGGERED REVEAL (data-stagger)
   ───────────────────────────────── */

function initStaggers() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: .1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-stagger], .r-up, .r-fade, .r-slide-r, .r-zoom').forEach(el => io.observe(el));
}

/* ─────────────────────────────────
   COUNT-UP (improved easing)
   ───────────────────────────────── */

function initCountUp() {
  if (PREFERS_REDUCED) {
    document.querySelectorAll('.count-up[data-to]').forEach(el => {
      el.textContent = (+el.dataset.to).toLocaleString('ru-RU');
    });
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.to;
      const dur = +el.dataset.dur || 1800;
      const start = performance.now();
      const tick = now => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = Math.floor(target * eased);
        el.textContent = v.toLocaleString('ru-RU');
        if (t < 1) requestAnimationFrame(tick);
        else { el.textContent = target.toLocaleString('ru-RU'); el.classList.add('glow'); setTimeout(() => el.classList.remove('glow'), 700); }
      };
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: .5 });
  document.querySelectorAll('.count-up[data-to]').forEach(el => io.observe(el));
}

/* ─────────────────────────────────
   COMMAND PALETTE ⌘K
   ───────────────────────────────── */

const CMD_ITEMS = [
  // pages
  { sec: 'pages', icon: '🏠', ttl: 'Главная', sub: 'kamelia-med.ru', kw: 'home главная', href: '/kamelia/' },
  { sec: 'pages', icon: '⊞', ttl: 'Все услуги', sub: '8 направлений', kw: 'услуги services', href: '/kamelia/services/' },
  { sec: 'pages', icon: '👥', ttl: 'Команда врачей', sub: '42 специалиста', kw: 'врачи doctors team команда', href: '/kamelia/doctors.html' },
  { sec: 'pages', icon: '📍', ttl: 'Филиалы', sub: '5 адресов в Казани', kw: 'филиалы branches', href: '/kamelia/branches.html' },
  { sec: 'pages', icon: '📅', ttl: 'Записаться на приём', sub: 'Форма записи', kw: 'запись booking приём', href: '/kamelia/booking.html' },
  { sec: 'pages', icon: 'ℹ', ttl: 'О клинике', sub: '16 лет в Казани', kw: 'about о клинике', href: '/kamelia/about.html' },

  // services
  { sec: 'services', icon: '01', ttl: 'Консультация и диагностика', sub: 'от 400 ₽', kw: 'консультация осмотр КТ диагностика', href: '/kamelia/services/consult.html' },
  { sec: 'services', icon: '02', ttl: 'Терапия', sub: 'от 4 900 ₽ · кариес, пульпит', kw: 'терапия кариес пульпит', href: '/kamelia/services/therapy.html' },
  { sec: 'services', icon: '03', ttl: 'Хирургия и имплантация', sub: 'от 3 900 ₽', kw: 'хирургия имплантация удаление импланты', href: '/kamelia/services/surgery.html' },
  { sec: 'services', icon: '04', ttl: 'Ортодонтия', sub: 'от 7 500 ₽ · брекеты, элайнеры', kw: 'ортодонтия брекеты элайнеры damon', href: '/kamelia/services/orthodontics.html' },
  { sec: 'services', icon: '05', ttl: 'Протезирование', sub: 'от 16 000 ₽ · коронки, виниры', kw: 'протезирование коронки виниры', href: '/kamelia/services/prosthetics.html' },
  { sec: 'services', icon: '06', ttl: 'Гигиена и пародонтология', sub: 'от 1 200 ₽', kw: 'гигиена чистка vector', href: '/kamelia/services/hygiene.html' },
  { sec: 'services', icon: '07', ttl: 'Эстетика и отбеливание', sub: 'от 9 900 ₽', kw: 'эстетика отбеливание amazing white', href: '/kamelia/services/aesthetics.html' },
  { sec: 'services', icon: '08', ttl: 'Детская стоматология', sub: 'от 700 ₽ · с 1,5 лет', kw: 'детская дети ребёнок седация', href: '/kamelia/services/kids.html' },

  // actions
  { sec: 'actions', icon: '☎', ttl: 'Позвонить +7 (843) 210-09-09', sub: 'пн—вс с 9:00 до 21:00', kw: 'позвонить телефон call phone', href: 'tel:+78432100909' },
  { sec: 'actions', icon: '👤', ttl: 'Личный кабинет', sub: 'История визитов и запись', kw: 'кабинет профиль cabinet', href: '/kamelia/cabinet/' },
  { sec: 'actions', icon: '🔐', ttl: 'Войти / Зарегистрироваться', sub: 'Авторизация', kw: 'логин login регистрация', href: '/kamelia/cabinet/login.html' },
  { sec: 'actions', icon: '🌓', ttl: 'Сменить тему', sub: 'Светлая / Тёмная', kw: 'тема dark light theme', action: 'theme' },
  { sec: 'actions', icon: '💰', ttl: 'Калькулятор стоимости', sub: 'Подобрать услуги', kw: 'калькулятор цена price calc', action: 'calc' },

  // legal
  { sec: 'legal', icon: '§', ttl: 'Политика обработки данных', sub: '152-ФЗ', kw: 'политика privacy persdata', href: '/kamelia/legal/privacy.html' },
  { sec: 'legal', icon: '§', ttl: 'Условия обслуживания', sub: 'Договор оферты', kw: 'условия terms договор', href: '/kamelia/legal/terms.html' },
];

const CMD_ADMIN = [
  { sec: 'admin', icon: '⚙', ttl: 'Админ — Дашборд', sub: 'Сводка', kw: 'админ admin dashboard', href: '/kamelia/admin/' },
  { sec: 'admin', icon: '⚙', ttl: 'Админ — Заявки', sub: 'Журнал записей', kw: 'админ заявки appointments', href: '/kamelia/admin/appointments.html' },
  { sec: 'admin', icon: '⚙', ttl: 'Админ — Пациенты', sub: 'Пользователи кабинета', kw: 'админ пациенты users', href: '/kamelia/admin/users.html' },
];

const SEC_LABEL = {
  pages: 'Страницы',
  services: 'Услуги',
  actions: 'Действия',
  legal: 'Документы',
  admin: 'Админ-панель',
};

let cmdkOpen = false;
let cmdkActive = 0;
let cmdkResults = [];

function ensureCmdK() {
  let m = document.getElementById('cmdk');
  if (m) return m;
  m = document.createElement('div');
  m.id = 'cmdk';
  m.className = 'cmdk';
  m.innerHTML = `
    <div class="cmdk-backdrop" data-close></div>
    <div class="cmdk-card">
      <div class="cmdk-search">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="6.5" cy="6.5" r="4.5"/><path d="m12.5 12.5-2.7-2.7" stroke-linecap="round"/></svg>
        <input type="text" id="cmdkInput" placeholder="Найти страницу, услугу, действие…" autocomplete="off">
        <kbd>esc</kbd>
      </div>
      <div class="cmdk-list" id="cmdkList"></div>
      <div class="cmdk-foot">
        <span><kbd>↑</kbd><kbd>↓</kbd> навигация</span>
        <span><kbd>↵</kbd> выбрать</span>
        <span><kbd>⌘</kbd><kbd>K</kbd> открыть</span>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  m.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) closeCmdK();
  });
  return m;
}

async function openCmdK() {
  if (cmdkOpen) return;
  ensureCmdK();
  document.getElementById('cmdk').classList.add('open');
  document.body.style.overflow = 'hidden';
  cmdkOpen = true;
  cmdkActive = 0;
  // include admin items if user is admin
  let items = CMD_ITEMS.slice();
  try {
    const me = await fetch('/api/auth/me', { credentials: 'include' }).then(r => r.ok ? r.json() : null);
    if (me?.is_admin) items = items.concat(CMD_ADMIN);
    if (me) {
      items = items.concat([
        { sec: 'actions', icon: '🚪', ttl: 'Выйти из кабинета', sub: 'Завершить сессию', kw: 'logout выйти exit', action: 'logout' },
      ]);
    }
  } catch {}
  cmdkResults = items;
  renderCmdK('');
  setTimeout(() => document.getElementById('cmdkInput').focus(), 50);
}

function closeCmdK() {
  const m = document.getElementById('cmdk');
  if (!m) return;
  m.classList.remove('open');
  document.body.style.overflow = '';
  cmdkOpen = false;
  document.getElementById('cmdkInput').value = '';
}

function renderCmdK(query) {
  const list = document.getElementById('cmdkList');
  const q = query.trim().toLowerCase();
  let filtered = cmdkResults;
  if (q) {
    filtered = cmdkResults.filter(it => {
      const hay = (it.ttl + ' ' + it.sub + ' ' + (it.kw || '')).toLowerCase();
      return q.split(/\s+/).every(part => hay.includes(part));
    });
  }
  if (cmdkActive >= filtered.length) cmdkActive = 0;

  if (!filtered.length) {
    list.innerHTML = `<div class="cmdk-empty">Ничего не найдено по «${query}»</div>`;
    return;
  }

  // group by section
  const groups = {};
  filtered.forEach(it => { (groups[it.sec] = groups[it.sec] || []).push(it); });
  const order = ['pages', 'services', 'actions', 'admin', 'legal'];
  let html = '';
  let i = 0;
  order.forEach(sec => {
    if (!groups[sec]) return;
    html += `<div class="cmdk-section">${SEC_LABEL[sec] || sec}</div>`;
    groups[sec].forEach(it => {
      const isActive = i === cmdkActive ? 'active' : '';
      html += `
        <div class="cmdk-item ${isActive}" data-i="${i}">
          <div class="cmdk-icon">${it.icon}</div>
          <div class="cmdk-label">
            <div class="ttl">${it.ttl}</div>
            ${it.sub ? `<div class="sub">${it.sub}</div>` : ''}
          </div>
          ${it.action ? '<div class="cmdk-meta">action</div>' : '<div class="cmdk-meta">→</div>'}
        </div>
      `;
      i++;
    });
  });
  list.innerHTML = html;

  // bind clicks
  list.querySelectorAll('.cmdk-item').forEach(node => {
    node.addEventListener('mouseenter', () => {
      cmdkActive = +node.dataset.i;
      list.querySelectorAll('.cmdk-item').forEach(n => n.classList.toggle('active', +n.dataset.i === cmdkActive));
    });
    node.addEventListener('click', () => executeItem(filtered[+node.dataset.i]));
  });

  // store filtered for keyboard
  list.dataset.count = filtered.length;
  list._filtered = filtered;
}

function executeItem(it) {
  if (!it) return;
  closeCmdK();
  if (it.action === 'theme') { toggleTheme(); return; }
  if (it.action === 'calc') { openCalc(); return; }
  if (it.action === 'logout') {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      .then(() => { toast.success('Вы вышли', 'До встречи!'); setTimeout(() => location.href = '/kamelia/', 800); });
    return;
  }
  if (it.href) {
    if (it.href.startsWith('tel:') || it.href.startsWith('mailto:')) location.href = it.href;
    else { startProgress(); location.href = it.href; }
  }
}

function initCmdK() {
  document.addEventListener('keydown', e => {
    // open on ⌘K / Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (cmdkOpen) closeCmdK(); else openCmdK();
      return;
    }
    // also open on "/" if not in input
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      openCmdK();
      return;
    }
    if (!cmdkOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closeCmdK(); return; }
    const list = document.getElementById('cmdkList');
    const filtered = list?._filtered || [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      cmdkActive = Math.min(filtered.length - 1, cmdkActive + 1);
      renderCmdK(document.getElementById('cmdkInput').value);
      const active = list.querySelector('.cmdk-item.active');
      if (active) active.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cmdkActive = Math.max(0, cmdkActive - 1);
      renderCmdK(document.getElementById('cmdkInput').value);
      const active = list.querySelector('.cmdk-item.active');
      if (active) active.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeItem(filtered[cmdkActive]);
    }
  });

  // filter on input
  document.addEventListener('input', e => {
    if (e.target.id === 'cmdkInput') {
      cmdkActive = 0;
      renderCmdK(e.target.value);
    }
  });
}

window.openCmdK = openCmdK;

/* ─────────────────────────────────
   PRICE CALCULATOR
   ───────────────────────────────── */

const CALC_DATA = [
  { cat: 'Консультация', items: [
    { n: 'Первичный приём терапевта', p: 1000 },
    { n: 'КТ одной челюсти', p: 2500 },
    { n: 'КТ обеих челюстей', p: 3900 },
    { n: 'ИИ-разбор Diagnocat', p: 700 },
  ]},
  { cat: 'Гигиена', items: [
    { n: 'Профессиональная чистка + фторирование', p: 6200, from: true },
    { n: 'Ультразвуковая чистка одной челюсти', p: 2500 },
    { n: 'Air Flow', p: 4200 },
  ]},
  { cat: 'Терапия', items: [
    { n: 'Лечение кариеса (пломба премиум)', p: 6500, from: true },
    { n: 'Лечение пульпита (1 канал)', p: 8500 },
    { n: 'Лечение пульпита (2 канала)', p: 12500 },
    { n: 'Лечение пульпита (3 канала)', p: 15550 },
  ]},
  { cat: 'Хирургия и имплантация', items: [
    { n: 'Удаление зуба простое', p: 6500 },
    { n: 'Удаление зуба мудрости', p: 8900 },
    { n: 'Имплант Osstem (с формирователем)', p: 39000, from: true },
    { n: 'Имплант Medentika (с формирователем)', p: 42000, from: true },
    { n: 'Закрытый синус-лифтинг', p: 25000 },
  ]},
  { cat: 'Протезирование', items: [
    { n: 'Металлокерамическая коронка', p: 19000, from: true },
    { n: 'Цельнокерамическая коронка', p: 29000 },
    { n: 'Коронка из диоксида циркония', p: 29000, from: true },
    { n: 'Винир E.max', p: 31500 },
  ]},
  { cat: 'Эстетика', items: [
    { n: 'Отбеливание Amazing White', p: 16500 },
    { n: 'Эстетическая реставрация зуба', p: 9900, from: true },
  ]},
];

let calcModalEl;
function ensureCalcModal() {
  if (calcModalEl) return calcModalEl;
  calcModalEl = document.createElement('div');
  calcModalEl.className = 'calc-modal';
  calcModalEl.id = 'calcModal';
  calcModalEl.innerHTML = `
    <div class="calc-backdrop" data-close></div>
    <div class="calc-card">
      <div class="calc-head">
        <h2>Калькулятор&nbsp;<em>стоимости</em></h2>
        <button class="kmodal-close" data-close aria-label="Закрыть">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
        </button>
      </div>
      <div class="calc-body" id="calcBody">
        ${CALC_DATA.map((c, ci) => `
          <div class="calc-cat">
            <div class="calc-cat-head">${c.cat}</div>
            ${c.items.map((it, ii) => `
              <div class="calc-row">
                <input type="checkbox" id="calc-${ci}-${ii}" data-price="${it.p}">
                <label for="calc-${ci}-${ii}">
                  <span class="calc-checkbox">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l3 3 7-7"/></svg>
                  </span>
                  <span class="calc-name">
                    ${it.n}
                    ${it.from ? '<div class="calc-meta">базовая стоимость, может вырасти</div>' : ''}
                  </span>
                </label>
                <span class="calc-price">${it.from ? '<em>от</em>' : ''}${it.p.toLocaleString('ru-RU')} ₽</span>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
      <div class="calc-foot">
        <div class="calc-total" id="calcTotal">
          <span class="lbl">Предварительная сумма</span>
          <span class="val"><em>от</em><span id="calcSum">0</span> ₽</span>
        </div>
        <a href="/kamelia/booking.html" class="btn btn--brand"><span>Записаться на консультацию</span></a>
      </div>
    </div>
  `;
  document.body.appendChild(calcModalEl);

  calcModalEl.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) closeCalc();
  });

  const sumEl = document.getElementById('calcSum');
  const totalEl = document.getElementById('calcTotal');
  calcModalEl.querySelectorAll('input[type="checkbox"][data-price]').forEach(cb => {
    cb.addEventListener('change', () => {
      let total = 0;
      calcModalEl.querySelectorAll('input[type="checkbox"][data-price]:checked').forEach(c => {
        total += +c.dataset.price;
      });
      sumEl.textContent = total.toLocaleString('ru-RU');
      totalEl.classList.add('changed');
      setTimeout(() => totalEl.classList.remove('changed'), 350);
    });
  });

  return calcModalEl;
}

function openCalc() {
  ensureCalcModal();
  calcModalEl.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCalc() {
  if (!calcModalEl) return;
  calcModalEl.classList.remove('open');
  document.body.style.overflow = '';
}
window.openCalc = openCalc;

function initCalcFab() {
  // skip on cabinet/admin pages
  const page = document.body.dataset.page;
  if (page === 'cabinet' || page === 'admin') return;

  const fab = document.createElement('button');
  fab.className = 'calc-fab';
  fab.innerHTML = `
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="2"/>
      <path d="M5 5h6M5 8h2M9 8h2M5 11h2M9 11h2"/>
    </svg>
    <span>Калькулятор</span>
  `;
  fab.addEventListener('click', openCalc);
  document.body.appendChild(fab);
}

/* ─────────────────────────────────
   THEME TOGGLE BUTTON (inserted into nav)
   ───────────────────────────────── */

function injectThemeToggle() {
  // observe nav-actions appearing (since site.js injects it)
  const observer = new MutationObserver(() => {
    document.querySelectorAll('.nav-actions').forEach(actions => {
      if (actions.dataset.themeBound) return;
      actions.dataset.themeBound = '1';
      const btn = document.createElement('button');
      btn.className = 'theme-toggle';
      btn.setAttribute('aria-label', 'Сменить тему');
      btn.innerHTML = `
        <svg class="icon-sun" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="8" cy="8" r="3"/>
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M3.5 12.5l1.5-1.5M11 5l1.5-1.5"/>
        </svg>
        <svg class="icon-moon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 9.5A6 6 0 0 1 6.5 3a6 6 0 1 0 6.5 6.5z"/>
        </svg>
      `;
      btn.addEventListener('click', toggleTheme);
      // Insert before logout button or at end
      const logout = actions.querySelector('#cabLogout, #adminLogout, .menu-btn');
      if (logout) actions.insertBefore(btn, logout);
      else actions.appendChild(btn);
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/* ─────────────────────────────────
   COMMAND PALETTE TRIGGER (in nav)
   ───────────────────────────────── */

function injectCmdKTrigger() {
  const observer = new MutationObserver(() => {
    document.querySelectorAll('.nav-actions').forEach(actions => {
      if (actions.dataset.cmdkBound) return;
      actions.dataset.cmdkBound = '1';
      const btn = document.createElement('button');
      btn.className = 'cmdk-trigger';
      btn.innerHTML = `
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="6.5" cy="6.5" r="4.5"/><path d="m12.5 12.5-2.7-2.7" stroke-linecap="round"/></svg>
        <span>Поиск</span>
        <kbd>⌘K</kbd>
      `;
      btn.addEventListener('click', openCmdK);
      // insert at start (before nav-phone if exists)
      const phone = actions.querySelector('.nav-phone');
      if (phone) actions.insertBefore(btn, phone);
      else actions.insertBefore(btn, actions.firstChild);
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/* ─────────────────────────────────
   SKELETON HELPERS
   ───────────────────────────────── */

function skeletonLines(n = 3) {
  let html = '';
  for (let i = 0; i < n; i++) {
    const cls = i === n - 1 ? 'skel skel-line short' : 'skel skel-line';
    html += `<div class="${cls}"></div>`;
  }
  return html;
}
function skeletonCards(n = 3) {
  let html = '';
  for (let i = 0; i < n; i++) {
    html += `<div class="skel-card">
      <div class="skel skel-line"></div>
      <div class="skel skel-line short"></div>
      <div class="skel skel-line short2"></div>
    </div>`;
  }
  return html;
}
window.skeletonLines = skeletonLines;
window.skeletonCards = skeletonCards;

/* ─────────────────────────────────
   PAGE ENTER ANIMATION
   ───────────────────────────────── */

function pageEnter() {
  const main = document.querySelector('main');
  if (main && !PREFERS_REDUCED) {
    main.classList.add('page-enter');
    setTimeout(() => main.classList.remove('page-enter'), 800);
  }
}

/* ─────────────────────────────────
   BOOTSTRAP
   ───────────────────────────────── */

function init() {
  ensureToastsRoot();
  initCmdK();
  injectCmdKTrigger();
  injectThemeToggle();
  initTopBarHandler();
  initScrollProgress();
  initBackToTop();
  initStaggers();
  initCountUp();
  initParallax();
  initMagnetic();
  initCursor();
  initCalcFab();
  pageEnter();
}

function initTopBarHandler() {
  interceptNav();
  endProgress();  // ensure clean state
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
