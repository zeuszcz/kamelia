/* ════════════════════════════════════════════════════════════════
   КАМЕЛIЯ · МЕД — site logic
   - shared header/footer injection
   - pricing data + filtering + search
   - branches data + map sync
   - FAQ accordion, form mask, scroll reveal, counters, mobile menu
   ════════════════════════════════════════════════════════════════ */

(function () {

/* ─────────────────────────────────
   AUTO-LOAD ENHANCE LAYER
   (idempotent — safe to call from multiple scripts)
   ───────────────────────────────── */
(function loadEnhance() {
  if (!document.querySelector('link[data-enhance-css]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/kamelia/assets/enhance.css';
    link.dataset.enhanceCss = '1';
    document.head.appendChild(link);
  }
  if (!document.querySelector('script[data-enhance-js]')) {
    const script = document.createElement('script');
    script.src = '/kamelia/assets/enhance.js';
    script.defer = true;
    script.dataset.enhanceJs = '1';
    document.head.appendChild(script);
  }
})();

/* ─────────────────────────────────
   DATA: services + price catalog
   ───────────────────────────────── */
const ROOT = '/kamelia';

const CATEGORIES = [
  {
    slug: 'consult',     roman: 'I',    n: '01',
    title: 'Консультация и диагностика',
    blurb: 'Первичный осмотр, цифровая рентгенография, КТ челюстей, ИИ-разбор Diagnocat и подбор анестезии.',
    priceFrom: 400,
    href: ROOT + '/services/consult.html',
  },
  {
    slug: 'therapy',     roman: 'II',   n: '02',
    title: 'Терапевтическая стоматология',
    blurb: 'Лечение кариеса премиальными композитами, обработка каналов под микроскопом, сохранение живого зуба.',
    priceFrom: 4900,
    href: ROOT + '/services/therapy.html',
  },
  {
    slug: 'surgery',     roman: 'III',  n: '03',
    title: 'Хирургия и имплантация',
    blurb: 'Атравматичное удаление, синус-лифтинг, импланты Osstem · Medentika · Neodent с пожизненной гарантией.',
    priceFrom: 3900,
    href: ROOT + '/services/surgery.html',
  },
  {
    slug: 'orthodontics', roman: 'IV',  n: '04',
    title: 'Ортодонтия',
    blurb: 'Брекет-системы Damon, керамика Damon Clear, элайнеры Flexiligner и NANATECH с 3D-моделированием.',
    priceFrom: 7500,
    href: ROOT + '/services/orthodontics.html',
  },
  {
    slug: 'prosthetics', roman: 'V',    n: '05',
    title: 'Протезирование',
    blurb: 'Цельнокерамические коронки, виниры из E.max, бюгельные и нейлоновые протезы. Цвет под ваши зубы.',
    priceFrom: 16000,
    href: ROOT + '/services/prosthetics.html',
  },
  {
    slug: 'hygiene',     roman: 'VI',   n: '06',
    title: 'Пародонтология и гигиена',
    blurb: 'Профессиональная чистка, аппарат Vector, плазмотерапия, фторирование. Здоровые дёсны — основа всего.',
    priceFrom: 1200,
    href: ROOT + '/services/hygiene.html',
  },
  {
    slug: 'aesthetics',  roman: 'VII',  n: '07',
    title: 'Эстетика и отбеливание',
    blurb: 'Профессиональное отбеливание Amazing White, художественная реставрация фронтальных зубов.',
    priceFrom: 9900,
    href: ROOT + '/services/aesthetics.html',
  },
  {
    slug: 'kids',        roman: 'VIII', n: '08',
    title: 'Детская стоматология',
    blurb: 'Кислородная седация (закись азота), лечение в игровой форме, отдельная зона ожидания для детей.',
    priceFrom: 700,
    href: ROOT + '/services/kids.html',
  },
];

/* full price data — keyed by category slug. Each entry: [name, price, note?, sub?] */
const PRICES = {
  consult: {
    subs: [
      { id: 'consult', name: 'Приёмы врачей' },
      { id: 'rontgen', name: 'Рентгенография' },
      { id: 'anesthesia', name: 'Анестезия' },
    ],
    items: [
      ['Приём терапевта · хирурга · ортопеда · имплантолога', 1000, 'первичный', 'consult'],
      ['Приём терапевта', 500, 'повторный', 'consult'],
      ['Приём ортодонта', 1000, 'первичный', 'consult'],
      ['Приём ортодонта', 500, 'повторный', 'consult'],
      ['Приём детского стоматолога', 700, 'первичный', 'consult'],
      ['Приём детского стоматолога', 500, 'повторный', 'consult'],
      ['Прицельная рентгенография зуба', 600, 'первичная', 'rontgen'],
      ['Прицельная рентгенография зуба', 400, 'повторная', 'rontgen'],
      ['Ортопантомография (ОПТГ) — взрослым', 1000, null, 'rontgen'],
      ['Ортопантомография (ОПТГ) — детям до 14 лет', 500, null, 'rontgen'],
      ['Компьютерная томография одной челюсти', 2500, null, 'rontgen'],
      ['Компьютерная томография верхней и нижней челюсти', 3900, null, 'rontgen'],
      ['ИИ-диагностика Diagnocat', 700, null, 'rontgen'],
      ['Аппликационная и инфильтрационная анестезия', 950, null, 'anesthesia'],
      ['Проводниковая анестезия', 1100, null, 'anesthesia'],
    ],
  },
  therapy: {
    subs: [
      { id: 'caries',  name: 'Кариес' },
      { id: 'pulpit',  name: 'Пульпит' },
      { id: 'period',  name: 'Периодонтит' },
    ],
    items: [
      ['Лечение кариеса · пломба премиум-класса', 6500, 'от', 'caries'],
      ['Лечение пульпита · пломба премиум-класса', 8700, null, 'pulpit'],
      ['Восстановление со стекловолоконным штифтом', 9950, null, 'pulpit'],
      ['Лечение пульпита · 1-канальный зуб', 8500, null, 'pulpit'],
      ['Лечение пульпита · 2-канальный зуб', 12500, null, 'pulpit'],
      ['Лечение пульпита · 3-канальный зуб', 15550, null, 'pulpit'],
      ['Лечение пульпита · 4-канальный зуб', 18500, null, 'pulpit'],
      ['Лечение периодонтита · 1-канальный (1 этап)', 7900, null, 'period'],
      ['Лечение периодонтита · 1-канальный (2 этап)', 4900, null, 'period'],
      ['Лечение периодонтита · 2-канальный (1 этап)', 10000, null, 'period'],
      ['Лечение периодонтита · 2-канальный (2 этап)', 6500, null, 'period'],
    ],
  },
  surgery: {
    subs: [
      { id: 'extract', name: 'Удаление зубов' },
      { id: 'plastic', name: 'Пластика' },
      { id: 'sinus',   name: 'Синус-лифтинг' },
      { id: 'implant', name: 'Импланты' },
    ],
    items: [
      ['Удаление зуба 3 степени подвижности', 3900, null, 'extract'],
      ['Удаление зуба простое', 6500, null, 'extract'],
      ['Удаление зуба мудрости', 8900, null, 'extract'],
      ['Сложное удаление с разъединением корней', 9500, null, 'extract'],
      ['Пластика уздечки языка или губы', 5900, null, 'plastic'],
      ['Пластика уздечки верхней губы', 6500, null, 'plastic'],
      ['Пластика уздечки нижней губы', 6500, null, 'plastic'],
      ['Закрытый синус-лифтинг', 25000, null, 'sinus'],
      ['Открытый синус-лифтинг', 55000, null, 'sinus'],
      ['Имплант Osstem (Корея) · с формирователем', 26000, 'от', 'implant'],
      ['Имплант Medentika (Германия) · с формирователем', 29000, 'от', 'implant'],
      ['Имплант Neodent (Бразилия)', 43000, null, 'implant'],
    ],
  },
  orthodontics: {
    subs: [
      { id: 'ortho-diag',     name: 'Диагностика' },
      { id: 'ortho-removable', name: 'Съёмные аппараты' },
      { id: 'ortho-brackets', name: 'Брекет-системы' },
      { id: 'ortho-aligners', name: 'Элайнеры' },
      { id: 'ortho-retain',   name: 'Ретенция' },
    ],
    items: [
      ['3D-снятие оттиска одной челюсти', 2300, null, 'ortho-diag'],
      ['Диагностические слепки одной челюсти', 1800, null, 'ortho-diag'],
      ['3D-сканирование одной челюсти', 2300, null, 'ortho-diag'],
      ['3D-диагностика и моделирование результата', 45000, null, 'ortho-diag'],
      ['3D-диагностика S-Line', 20000, null, 'ortho-diag'],
      ['Аппарат Френкеля', 55000, null, 'ortho-removable'],
      ['Аппарат Башаровой', 35000, null, 'ortho-removable'],
      ['Несъёмный аппарат Марко Росса', 59000, null, 'ortho-removable'],
      ['Одночелюстная пластинка', 32000, null, 'ortho-removable'],
      ['Лигатурные металлические брекеты', 35000, 'от', 'ortho-brackets'],
      ['Самолигирующие брекеты H4', 90000, null, 'ortho-brackets'],
      ['Самолигирующие Damon Q', 69000, 'от', 'ortho-brackets'],
      ['Damon Clear · керамические', 125000, 'от', 'ortho-brackets'],
      ['Самолигирующие системы базовые', 47000, 'от', 'ortho-brackets'],
      ['Flexiligner Esthetic · 1–12 шагов', 250000, null, 'ortho-aligners'],
      ['Flexiligner Simple · 13–26 шагов', 385000, null, 'ortho-aligners'],
      ['Flexiligner Pro-ONE · 27+ шагов', 350000, null, 'ortho-aligners'],
      ['NANATECH-12', 270000, null, 'ortho-aligners'],
      ['NANATECH-32', 430000, null, 'ortho-aligners'],
      ['S-Line · до 10 шагов', 135000, null, 'ortho-aligners'],
      ['S-Line · до 20 шагов', 250000, null, 'ortho-aligners'],
      ['S-Line · до 30 шагов', 290000, null, 'ortho-aligners'],
      ['S-Line · от 31 шага', 370000, null, 'ortho-aligners'],
      ['Съёмный ретейнер · одна челюсть', 12500, null, 'ortho-retain'],
      ['Ретенционная пластинка или капа · одна челюсть', 12500, null, 'ortho-retain'],
      ['Съёмный пластиночный ретейнер', 21000, null, 'ortho-retain'],
      ['Съёмный ретенционный аппарат · капа', 7500, null, 'ortho-retain'],
    ],
  },
  prosthetics: {
    subs: [
      { id: 'pros-removable', name: 'Съёмные протезы' },
      { id: 'pros-crowns',    name: 'Коронки' },
      { id: 'pros-veneers',   name: 'Виниры' },
    ],
    items: [
      ['Частичный пластиночный съёмный протез', 32000, 'от', 'pros-removable'],
      ['Нейлоновый протез до 3 зубов', 25000, 'от', 'pros-removable'],
      ['Бюгельный протез одной челюсти', 65000, 'от', 'pros-removable'],
      ['Металлокерамическая коронка', 16000, 'от', 'pros-crowns'],
      ['Цельнокерамическая коронка', 29000, null, 'pros-crowns'],
      ['Коронка из диоксида циркония', 25000, 'от', 'pros-crowns'],
      ['Винир из цельной керамики E.max', 31500, null, 'pros-veneers'],
    ],
  },
  hygiene: {
    subs: [
      { id: 'paro',    name: 'Пародонтология' },
      { id: 'hygiene', name: 'Профессиональная гигиена' },
    ],
    items: [
      ['Плазмотерапия · 1 сеанс', 8500, null, 'paro'],
      ['Пародонтологическая чистка · комплекс', 8500, null, 'paro'],
      ['Лечение аппаратом Vector · 1 челюсть', 14500, null, 'paro'],
      ['Комплекс гигиены с фторированием', 3900, 'от', 'hygiene'],
      ['Комплекс гигиены без фторирования', 5000, null, 'hygiene'],
      ['Комплекс гигиены для ортодонтических пациентов', 4200, null, 'hygiene'],
      ['Ультразвуковая чистка одной челюсти', 2500, null, 'hygiene'],
      ['Фторирование с помощью каппы', 1200, null, 'hygiene'],
    ],
  },
  aesthetics: {
    subs: [
      { id: 'restore',  name: 'Реставрация' },
      { id: 'whitening', name: 'Отбеливание' },
    ],
    items: [
      ['Эстетико-функциональное восстановление зуба', 9900, 'от', 'restore'],
      ['Профессиональное отбеливание Amazing White', 16500, null, 'whitening'],
    ],
  },
  kids: {
    subs: [
      { id: 'kids-prevent', name: 'Профилактика' },
      { id: 'kids-treat',   name: 'Лечение' },
      { id: 'kids-extract', name: 'Удаление' },
    ],
    items: [
      ['Герметизация фиссур · один зуб', 2900, 'от', 'kids-prevent'],
      ['Гигиена полости рта во временном прикусе', 3500, null, 'kids-prevent'],
      ['Детская гигиена с фторированием', 3900, null, 'kids-prevent'],
      ['Кислородная седация · закись азота', 3900, null, 'kids-prevent'],
      ['Лечение кариеса временного зуба', 4900, 'от', 'kids-treat'],
      ['Лечение пульпита временного зуба · 1 посещение', 8500, null, 'kids-treat'],
      ['Лечение периодонтита временного зуба · 1 этап', 6000, null, 'kids-treat'],
      ['Лечение периодонтита временного зуба · 2 этап', 7000, null, 'kids-treat'],
      ['Металлическая коронка на временный зуб', 5500, null, 'kids-treat'],
      ['Помощь при периодонтите · создание оттока', 3900, null, 'kids-treat'],
      ['Помощь при пульпите · девитализирующая паста', 4500, null, 'kids-treat'],
      ['Удаление подвижного временного зуба', 2900, null, 'kids-extract'],
      ['Удаление неподвижного временного зуба', 3500, null, 'kids-extract'],
    ],
  },
};

const BRANCHES = [
  { id: 0, tag: 'Главный',         addr: 'ул. Чистопольская, 77/2',   district: 'Ново-Савиновский', hours: '9:00 — 21:00', phone: '210-09-09', map: { x: 380, y: 200 } },
  { id: 1, tag: 'Северный',        addr: 'ул. Сибгата Хакима, 51',    district: 'Ново-Савиновский', hours: '9:00 — 21:00', phone: '210-09-09', map: { x: 432, y: 264 } },
  { id: 2, tag: 'Заречный',        addr: 'ул. Ташаяк, 2а',            district: 'Кировский',        hours: '8:30 — 21:00', phone: '210-09-09', map: { x: 178, y: 340 } },
  { id: 3, tag: 'Южный',           addr: 'пр. Победы, 78',            district: 'Приволжский',      hours: '9:00 — 20:00', phone: '210-09-09', map: { x: 460, y: 540 } },
  { id: 4, tag: 'Восточный',       addr: 'ул. Кул Гали, 27',          district: 'Советский',        hours: '9:00 — 21:00', phone: '210-09-09', map: { x: 286, y: 470 } },
];

/* ─────────────────────────────────
   STAR ORNAMENT (8-point Tatar)
   ───────────────────────────────── */

const STAR = `<svg class="ornament" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" opacity=".25"/>
  <path d="M12 3 L13.5 10.5 L21 12 L13.5 13.5 L12 21 L10.5 13.5 L3 12 L10.5 10.5 Z"/>
</svg>`;

const ROSETTE = `<svg class="rosette" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">
  <circle cx="12" cy="12" r="10"/>
  <circle cx="12" cy="12" r="6"/>
  <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/>
</svg>`;

const STAMP_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 2 L13 8 L19 7 L15 12 L19 17 L13 16 L12 22 L11 16 L5 17 L9 12 L5 7 L11 8 Z"/>
</svg>`;

const ARROW = `<svg class="arrow" viewBox="0 0 16 9" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
  <path d="M0 4.5h14M10 1l4 3.5L10 8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const PHONE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
</svg>`;

/* ─────────────────────────────────
   HEADER injection
   ───────────────────────────────── */

const NAV_ITEMS = [
  { num: '01', label: 'О клинике',    href: ROOT + '/about.html',     id: 'about' },
  { num: '02', label: 'Услуги',       href: ROOT + '/services/',      id: 'services' },
  { num: '03', label: 'Врачи',        href: ROOT + '/doctors.html',   id: 'doctors' },
  { num: '04', label: 'Филиалы',      href: ROOT + '/branches.html',  id: 'branches' },
  { num: '05', label: 'Запись',       href: ROOT + '/booking.html',   id: 'booking' },
  { num: '06', label: 'Кабинет',      href: ROOT + '/cabinet/',       id: 'cabinet' },
];

function buildMasthead(currentId) {
  const navHtml = NAV_ITEMS.map(it =>
    `<li><a href="${it.href}" class="${currentId === it.id ? 'active' : ''}">${it.label}</a></li>`
  ).join('');

  const mobileNavHtml = NAV_ITEMS.map(it =>
    `<a href="${it.href}" class="${currentId === it.id ? 'active' : ''}"><span>${it.label}</span><span class="muted">${it.num}</span></a>`
  ).join('');

  const brandHtml = `
    <a href="${ROOT}/" class="brand">
      <span class="brand-mark">${STAMP_ICON}</span>
      <span class="brand-name">
        <b>Камелия·Мед</b>
        <small>Сеть стоматологий, Казань</small>
      </span>
    </a>`;

  return `
  <header class="nav-wrap" id="navWrap">
    <div class="container nav">
      ${brandHtml}
      <nav>
        <ul class="nav-links">${navHtml}</ul>
      </nav>
      <div class="nav-actions">
        <a href="tel:+78432100909" class="nav-phone">${PHONE_ICON}210·09·09</a>
        <a href="${ROOT}/booking.html" class="btn btn--brand btn--sm"><span>Записаться</span></a>
        <button class="menu-btn" id="menuBtn" aria-label="Меню"><span></span><span></span><span></span></button>
      </div>
    </div>
  </header>

  <aside class="mobile-nav" id="mobileToc">
    <nav>${mobileNavHtml}</nav>
    <div class="mobile-nav-foot">
      <a href="tel:+78432100909" class="btn btn--ghost">${PHONE_ICON}<span>210·09·09</span></a>
      <a href="${ROOT}/booking.html" class="btn btn--brand"><span>Записаться на приём</span></a>
    </div>
  </aside>`;
}

function buildColophon() {
  return `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-mark">
          <a href="${ROOT}/" class="brand">
            <span class="brand-mark">${STAMP_ICON}</span>
            <span class="brand-name">
              <b>Камелия·Мед</b>
              <small>Сеть стоматологий, Казань</small>
            </span>
          </a>
          <p class="footer-tagline">Семейная стоматология, в&nbsp;которую возвращаются <span class="em-italic">десятилетиями</span>.</p>
        </div>

        <div>
          <h6>Услуги</h6>
          <ul>
            ${CATEGORIES.slice(0, 6).map(c => `<li><a href="${c.href}">${c.title}</a></li>`).join('')}
          </ul>
        </div>

        <div>
          <h6>Филиалы</h6>
          <ul>
            ${BRANCHES.map(b => `<li><a href="${ROOT}/branches.html#b${b.id}">${b.addr}</a></li>`).join('')}
          </ul>
        </div>

        <div>
          <h6>Связаться</h6>
          <ul>
            <li><a href="tel:+78432100909" class="footer-phone">210·09·09</a></li>
            <li>пн—вс · 9:00 — 21:00</li>
            <li><a href="mailto:hello@kamelia-med.ru">hello@kamelia-med.ru</a></li>
            <li><a href="#">Telegram @Kamelia_med</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <div>© 2010 — 2026 «Камелия-Мед» · ЛО-16-01-007890 · ИНН 1659182447</div>
        <div class="footer-social">
          <a href="#" aria-label="Telegram"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 1 0 12 12A12 12 0 0 0 12 0Zm5.94 8.31-1.97 9.28c-.15.66-.54.82-1.09.51l-3-2.21-1.45 1.39c-.16.16-.3.3-.6.3l.21-3.05 5.55-5c.24-.21-.05-.33-.37-.12L8.36 13.32 4.5 12.1c-.84-.27-.86-.84.18-1.24l11.6-4.47c.7-.27 1.31.17 1.08 1.21Z"/></svg></a>
          <a href="#" aria-label="VK"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.3 2C5.5 2 2 5.5 2 12.3v.4C2 19.5 5.5 23 12.3 23h.4c6.8 0 10.3-3.5 10.3-10.3v-.4C23 5.5 19.5 2 12.7 2zm5.7 14.7h-1.5c-.6 0-.7-.4-1.7-1.4-.9-.9-1.3-1-1.5-1-.3 0-.4.1-.4.5v1.4c0 .3-.1.5-1 .5-1.5 0-3.1-.9-4.3-2.5C5.9 12 5.4 9.7 5.4 9.2c0-.2.1-.3.4-.3h1.5c.4 0 .5.2.7.6 1 2.7 2.5 5 3.2 5 .2 0 .3-.1.3-.7v-2.2c0-.9-.5-1-.5-1.3 0-.2.1-.3.4-.3h2.3c.3 0 .4.1.4.5v3c0 .3.1.4.2.4.2 0 .4-.1.8-.5.9-1 1.6-2.6 1.6-2.6.1-.2.3-.4.6-.4h1.5c.5 0 .6.2.5.5-.2.9-2.1 3.6-2.1 3.6-.2.3-.2.4 0 .7.1.2.7.7 1 1 .7.8 1.3 1.4 1.5 1.9.2.5-.1.7-.6.7z"/></svg></a>
          <a href="#" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.3 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.3-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3 4.7 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2z"/></svg></a>
        </div>
      </div>
    </div>
  </footer>`;
}

function buildPageFolio(pageNum, sectionName) {
  return `<div class="page-folio">
    <span>${sectionName}</span>
    <span class="pn">${pageNum}</span>
  </div>`;
}

/* ─────────────────────────────────
   INJECT shared chrome
   ───────────────────────────────── */

function injectChrome() {
  // Cabinet pages manage their own chrome via cabinet.js
  if (document.body.dataset.page === 'cabinet') return;

  const headMount = document.getElementById('chrome-head');
  const footMount = document.getElementById('chrome-foot');
  const folioMount = document.getElementById('chrome-folio');
  const currentId = document.body.dataset.page || '';

  if (headMount) headMount.innerHTML = buildMasthead(currentId);
  if (footMount) footMount.innerHTML = buildColophon();
  if (folioMount) {
    const pageNum = folioMount.dataset.num || '01';
    const section = folioMount.dataset.section || 'KAMELIA·MED';
    folioMount.outerHTML = buildPageFolio(pageNum, section);
  }
}

/* ─────────────────────────────────
   MOBILE MENU
   ───────────────────────────────── */

function bindMobileMenu() {
  const btn = document.getElementById('menuBtn');
  const drawer = document.getElementById('mobileToc');
  if (!btn || !drawer) return;

  const open = () => { drawer.classList.add('open'); btn.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const closeFn = () => { drawer.classList.remove('open'); btn.classList.remove('open'); document.body.style.overflow = ''; };

  btn.addEventListener('click', () => drawer.classList.contains('open') ? closeFn() : open());
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeFn));
}

function bindNavScroll() {
  const nav = document.getElementById('navWrap');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ─────────────────────────────────
   FORMAT helpers
   ───────────────────────────────── */

const fmt = n => n.toLocaleString('ru-RU').replace(/,/g, '\u00A0');
const fmtPriceNoSep = n => String(n);

/* ─────────────────────────────────
   PRICE LIST RENDERING (per-category page)
   ───────────────────────────────── */

function renderPriceCategory(rootEl, categorySlug) {
  const cat = PRICES[categorySlug];
  if (!cat || !rootEl) return;

  const searchHtml = `
    <div class="price-tools">
      <div class="price-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input id="priceSearch" type="search" placeholder="поиск по услугам — например, «винир»..." />
      </div>
      <div class="price-meta"><strong id="priceVis">${cat.items.length}</strong> из ${cat.items.length} услуг</div>
    </div>`;

  const tabsHtml = `
    <div class="price-tabs">
      <button class="price-tab active" data-sub="all">Все<span class="ct">${cat.items.length}</span></button>
      ${cat.subs.map(s => {
        const count = cat.items.filter(i => i[3] === s.id).length;
        return `<button class="price-tab" data-sub="${s.id}">${s.name}<span class="ct">${count}</span></button>`;
      }).join('')}
    </div>`;

  const sectionsHtml = cat.subs.map((s) => {
    const items = cat.items.filter(i => i[3] === s.id);
    if (!items.length) return '';
    return `
      <div class="price-section" data-sub-block="${s.id}">
        <div class="price-section-head">
          <h3>${s.name}</h3>
          <span class="ct">${items.length} ${items.length === 1 ? 'услуга' : items.length < 5 ? 'услуги' : 'услуг'}</span>
        </div>
        ${items.map(([name, price, note]) => `
          <div class="price-row" data-search="${(name + ' ' + (note || '')).toLowerCase()}">
            <span class="item-name">${name}${note && note !== 'от' ? `<span class="nt">${note}</span>` : ''}</span>
            <span class="price-amt">${note === 'от' ? '<span class="from">от</span>' : ''}${fmt(price)}<span class="cur"> ₽</span></span>
            <a href="${ROOT}/booking.html" class="price-book">Записаться</a>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');

  rootEl.innerHTML = `
    ${searchHtml}
    ${tabsHtml}
    <div id="priceListInner">${sectionsHtml}</div>
    <div class="price-empty" id="priceEmpty">
      <p>Ничего не найдено</p>
      <span>Попробуйте другую формулировку или сбросьте фильтр.</span>
    </div>
    <div class="disclaimer">
      <span class="star">i</span>
      <span>Цены на сайте носят ознакомительный характер и не являются публичной офертой. Окончательная стоимость лечения определяется лечащим врачом после осмотра, КТ или панорамного снимка и фиксируется в договоре до начала работ.</span>
    </div>
  `;

  let activeSub = 'all';
  let query = '';

  const apply = () => {
    let visible = 0;
    rootEl.querySelectorAll('[data-sub-block]').forEach(block => {
      const sId = block.dataset.subBlock;
      const subMatch = activeSub === 'all' || sId === activeSub;
      let blockVis = false;
      block.querySelectorAll('.price-row').forEach(row => {
        const q = !query || row.dataset.search.includes(query);
        const show = subMatch && q;
        row.classList.toggle('hidden', !show);
        if (show) { visible++; blockVis = true; }
      });
      block.style.display = blockVis ? '' : 'none';
    });
    const visEl = document.getElementById('priceVis');
    if (visEl) visEl.textContent = visible;
    const empty = document.getElementById('priceEmpty');
    if (empty) empty.classList.toggle('visible', visible === 0);
  };

  rootEl.querySelectorAll('.price-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      rootEl.querySelectorAll('.price-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSub = btn.dataset.sub;
      apply();
    });
  });

  const search = document.getElementById('priceSearch');
  if (search) {
    let t;
    search.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        query = search.value.trim().toLowerCase();
        apply();
      }, 100);
    });
  }
}

/* ─────────────────────────────────
   FAQ
   ───────────────────────────────── */

function bindFAQ() {
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.parentElement;
      const wasOpen = item.classList.contains('open');
      const list = item.parentElement;
      list.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

/* ─────────────────────────────────
   SCROLL REVEAL
   ───────────────────────────────── */

function bindReveal() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.r').forEach(el => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.r').forEach(el => io.observe(el));
}

/* ─────────────────────────────────
   COUNTERS
   ───────────────────────────────── */

function bindCounters() {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.count;
      const start = performance.now();
      const dur = 1400;
      const tick = now => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.floor(target * eased).toLocaleString('ru-RU');
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = target.toLocaleString('ru-RU');
      };
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: .5 });
  document.querySelectorAll('[data-count]').forEach(el => io.observe(el));
}

/* ─────────────────────────────────
   KSELECT — custom dropdown wrapper
   ───────────────────────────────── */

const CHECK_ICON = `<svg class="check" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l3 3 7-7"/></svg>`;
const CHEVRON_ICON = `<svg class="kselect-arrow" viewBox="0 0 14 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l6 6 6-6"/></svg>`;

function initKSelect(wrap) {
  const sel = wrap.querySelector('select');
  if (!sel || wrap.dataset.kselectInit) return;
  wrap.dataset.kselectInit = '1';

  const placeholderOpt = sel.querySelector('option[hidden], option[value=""]');
  const placeholder = placeholderOpt ? placeholderOpt.textContent.trim() : (wrap.dataset.placeholder || 'Выберите');

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'kselect-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.tabIndex = 0;

  const panel = document.createElement('div');
  panel.className = 'kselect-panel';
  panel.setAttribute('role', 'listbox');

  const updateTrigger = () => {
    const opt = sel.value ? Array.from(sel.options).find(o => o.value === sel.value && !o.hidden) : null;
    let text;
    if (opt) {
      text = opt.textContent.trim();
    } else {
      // re-read current placeholder option (may change if options are rebuilt dynamically)
      const ph = sel.querySelector('option[hidden]') || sel.querySelector('option[value=""]');
      text = ph ? ph.textContent.trim() : placeholder;
    }
    trigger.innerHTML = `
      <span class="kselect-value ${opt ? '' : 'placeholder'}">${text}</span>
      ${CHEVRON_ICON}
    `;
    // reflect disabled state
    trigger.disabled = sel.disabled;
    wrap.classList.toggle('disabled', sel.disabled);
  };

  const renderPanel = () => {
    const options = Array.from(sel.options).filter(o => !o.hidden && o.value !== '');
    panel.innerHTML = options.map(o => {
      const isSelected = o.value === sel.value;
      const meta = o.dataset.meta || '';
      return `
        <button type="button" class="kselect-option ${isSelected ? 'selected' : ''}" data-value="${o.value.replace(/"/g, '&quot;')}" role="option" aria-selected="${isSelected}">
          <span class="opt-label">${o.textContent.trim()}</span>
          ${meta ? `<span class="opt-meta">${meta}</span>` : ''}
          ${CHECK_ICON}
        </button>
      `;
    }).join('');
  };

  updateTrigger();
  renderPanel();

  wrap.appendChild(trigger);
  wrap.appendChild(panel);

  const close = () => {
    wrap.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    document.querySelectorAll('.kselect.open').forEach(el => {
      if (el !== wrap) el.classList.remove('open');
    });
    wrap.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    // scroll selected into view
    const selected = panel.querySelector('.kselect-option.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  };

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    if (sel.disabled) return;
    if (wrap.classList.contains('open')) close();
    else open();
  });

  panel.addEventListener('click', e => {
    const opt = e.target.closest('.kselect-option');
    if (!opt) return;
    sel.value = opt.dataset.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    updateTrigger();
    renderPanel();
    // remove invalid state
    wrap.parentElement && wrap.parentElement.classList.remove('invalid');
    close();
    trigger.focus();
  });

  // observe disabled state changes
  new MutationObserver(updateTrigger).observe(sel, { attributes: true, attributeFilter: ['disabled'] });

  // close on outside click
  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) close();
  });

  // keyboard
  trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      open();
      panel.querySelector('.kselect-option.selected, .kselect-option')?.classList.add('kbd-active');
      panel.querySelector('.kselect-option.kbd-active')?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Escape') {
      close();
    }
  });

  panel.addEventListener('keydown', e => {
    const opts = Array.from(panel.querySelectorAll('.kselect-option'));
    let idx = opts.findIndex(o => o.classList.contains('kbd-active'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      opts.forEach(o => o.classList.remove('kbd-active'));
      const next = opts[Math.min(idx + 1, opts.length - 1)];
      next.classList.add('kbd-active');
      next.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      opts.forEach(o => o.classList.remove('kbd-active'));
      const prev = opts[Math.max(idx - 1, 0)];
      prev.classList.add('kbd-active');
      prev.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && idx >= 0) {
      e.preventDefault();
      opts[idx].click();
    } else if (e.key === 'Escape') {
      close();
      trigger.focus();
    }
  });

  // make panel focusable for keyboard
  panel.tabIndex = -1;

  // expose update on hidden select change (for programmatic value setting)
  sel.addEventListener('change', () => {
    updateTrigger();
    renderPanel();
  });

  return { update: () => { updateTrigger(); renderPanel(); } };
}

function initAllKSelects(root = document) {
  root.querySelectorAll('.kselect').forEach(initKSelect);
}

/* ─────────────────────────────────
   KDATE — custom date picker
   ───────────────────────────────── */

const RU_MONTHS_FULL = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const RU_MONTHS_GEN  = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const RU_WEEKDAYS    = ['пн','вт','ср','чт','пт','сб','вс'];

const CAL_ICON_HTML = `<svg class="cal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`;
const CLEAR_X_HTML = `<button type="button" class="kdate-clear-x" aria-label="Очистить"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg></button>`;

function pad2(n) { return String(n).padStart(2, '0'); }
function isoDate(y, m, d) { return `${y}-${pad2(m+1)}-${pad2(d)}`; }
function fmtRu(y, m, d) { return `${d} ${RU_MONTHS_GEN[m]} ${y}`; }
function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function initKDate(wrap) {
  const input = wrap.querySelector('input[type="date"]');
  if (!input || wrap.dataset.kdateInit) return;
  wrap.dataset.kdateInit = '1';

  const placeholder = wrap.dataset.placeholder || 'Выберите дату';
  const allowPast = wrap.dataset.allowPast === '1';
  const monthsAhead = parseInt(wrap.dataset.monthsAhead || '6', 10);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let selected = null;
  if (input.value) {
    const [y, m, d] = input.value.split('-').map(Number);
    selected = new Date(y, m - 1, d);
  }

  let viewYear  = (selected || today).getFullYear();
  let viewMonth = (selected || today).getMonth();

  const minDate = allowPast ? null : new Date(today);
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + monthsAhead);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'kdate-trigger';
  trigger.tabIndex = 0;

  const panel = document.createElement('div');
  panel.className = 'kdate-panel';

  function updateTrigger() {
    if (selected) {
      wrap.classList.add('has-value');
      trigger.innerHTML = `${CAL_ICON_HTML}<span class="kdate-value">${fmtRu(selected.getFullYear(), selected.getMonth(), selected.getDate())}</span>${CLEAR_X_HTML}`;
    } else {
      wrap.classList.remove('has-value');
      trigger.innerHTML = `${CAL_ICON_HTML}<span class="kdate-value placeholder">${placeholder}</span>`;
    }
  }

  function buildPanel() {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const lastOfMonth  = new Date(viewYear, viewMonth + 1, 0);

    let firstWeekday = firstOfMonth.getDay() - 1;
    if (firstWeekday === -1) firstWeekday = 6;

    const prevMonthLastDate = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];

    for (let i = firstWeekday - 1; i >= 0; i--) {
      const d = prevMonthLastDate - i;
      const date = new Date(viewYear, viewMonth - 1, d);
      cells.push({ date, day: d, adjacent: true });
    }

    for (let d = 1; d <= lastOfMonth.getDate(); d++) {
      cells.push({ date: new Date(viewYear, viewMonth, d), day: d, adjacent: false });
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(viewYear, viewMonth + 1, d), day: d, adjacent: true });
    }

    const monthLabel = `${RU_MONTHS_FULL[viewMonth]} ${viewYear}`;

    const canPrev = !minDate || (viewYear > minDate.getFullYear()) || (viewYear === minDate.getFullYear() && viewMonth > minDate.getMonth());
    const canNext = (viewYear < maxDate.getFullYear()) || (viewYear === maxDate.getFullYear() && viewMonth < maxDate.getMonth());

    panel.innerHTML = `
      <div class="kdate-head">
        <span class="month-label">${monthLabel}</span>
        <div class="month-nav">
          <button type="button" class="kdate-prev" aria-label="Предыдущий месяц" ${canPrev ? '' : 'disabled'}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3l-4 4 4 4"/></svg>
          </button>
          <button type="button" class="kdate-next" aria-label="Следующий месяц" ${canNext ? '' : 'disabled'}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l4 4-4 4"/></svg>
          </button>
        </div>
      </div>
      <div class="kdate-weekdays">
        ${RU_WEEKDAYS.map((d, i) => `<div class="${i >= 5 ? 'weekend' : ''}">${d}</div>`).join('')}
      </div>
      <div class="kdate-grid">
        ${cells.map((c, idx) => {
          const isWeekend = (idx % 7) >= 5;
          const isToday = sameDay(c.date, today);
          const isSelected = sameDay(c.date, selected);
          const isDisabled = (minDate && c.date < minDate) || (maxDate && c.date > maxDate);
          const cls = [
            c.adjacent ? 'adjacent' : '',
            isWeekend ? 'weekend' : '',
            isToday ? 'today' : '',
            isSelected ? 'selected' : '',
          ].filter(Boolean).join(' ');
          return `<button type="button" class="kdate-cell ${cls}" data-iso="${isoDate(c.date.getFullYear(), c.date.getMonth(), c.date.getDate())}" ${isDisabled ? 'disabled' : ''}>${c.day}</button>`;
        }).join('')}
      </div>
      <div class="kdate-foot">
        <button type="button" class="kdate-clear">Очистить</button>
        <button type="button" class="kdate-today brand">Сегодня</button>
      </div>
    `;
  }

  function open() {
    document.querySelectorAll('.kselect.open, .kdate.open').forEach(el => {
      if (el !== wrap) el.classList.remove('open');
    });
    // re-build to refresh "today" highlight if needed
    buildPanel();
    // align right if would overflow viewport
    panel.classList.remove('align-right');
    requestAnimationFrame(() => {
      const rect = panel.getBoundingClientRect();
      if (rect.right > window.innerWidth - 8) {
        panel.classList.add('align-right');
      }
    });
    wrap.classList.add('open');
  }
  function close() { wrap.classList.remove('open'); }

  function selectDate(date) {
    selected = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : null;
    if (selected) {
      input.value = isoDate(selected.getFullYear(), selected.getMonth(), selected.getDate());
    } else {
      input.value = '';
    }
    input.dispatchEvent(new Event('change', { bubbles: true }));
    updateTrigger();
    buildPanel();
  }

  updateTrigger();
  buildPanel();
  wrap.appendChild(trigger);
  wrap.appendChild(panel);

  trigger.addEventListener('click', e => {
    // clear-x click handled separately
    if (e.target.closest('.kdate-clear-x')) {
      e.stopPropagation();
      selectDate(null);
      return;
    }
    e.stopPropagation();
    if (wrap.classList.contains('open')) close();
    else open();
  });

  panel.addEventListener('click', e => {
    e.stopPropagation();
    if (e.target.closest('.kdate-cell:not(:disabled)')) {
      const cell = e.target.closest('.kdate-cell');
      const [y, m, d] = cell.dataset.iso.split('-').map(Number);
      selectDate(new Date(y, m - 1, d));
      close();
      return;
    }
    if (e.target.closest('.kdate-prev:not(:disabled)')) {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      buildPanel();
      return;
    }
    if (e.target.closest('.kdate-next:not(:disabled)')) {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      buildPanel();
      return;
    }
    if (e.target.closest('.kdate-today')) {
      viewYear = today.getFullYear();
      viewMonth = today.getMonth();
      selectDate(today);
      close();
      return;
    }
    if (e.target.closest('.kdate-clear')) {
      selectDate(null);
      close();
      return;
    }
  });

  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) close();
  });

  trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      open();
    } else if (e.key === 'Escape') {
      close();
    }
  });

  input.addEventListener('change', () => {
    // external value change
    if (input.value) {
      const [y, m, d] = input.value.split('-').map(Number);
      const newDate = new Date(y, m - 1, d);
      if (!sameDay(newDate, selected)) {
        selected = newDate;
        viewYear = newDate.getFullYear();
        viewMonth = newDate.getMonth();
        updateTrigger();
        buildPanel();
      }
    }
  });
}

function initAllKDates(root = document) {
  root.querySelectorAll('.kdate').forEach(initKDate);
}

/* ─────────────────────────────────
   KMODAL — modal that loads a page into a popup
   <a href="/page.html" data-modal>...</a>
   Fetches the page, extracts <main>, shows in modal
   ───────────────────────────────── */

function ensureKModal() {
  let m = document.getElementById('kmodal');
  if (m) return m;
  m = document.createElement('div');
  m.id = 'kmodal';
  m.className = 'kmodal';
  m.innerHTML = `
    <div class="kmodal-backdrop" data-close></div>
    <div class="kmodal-card">
      <div class="kmodal-head">
        <h2 id="kmodalTitle">—</h2>
        <button type="button" class="kmodal-close" data-close aria-label="Закрыть">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
        </button>
      </div>
      <div class="kmodal-body" id="kmodalBody">— загрузка —</div>
      <div class="kmodal-foot">
        <span class="meta" id="kmodalMeta">Камелия·Мед</span>
        <a href="#" id="kmodalFullLink" target="_blank" rel="noopener">Открыть в новой вкладке&nbsp;→</a>
      </div>
    </div>
  `;
  document.body.appendChild(m);
  m.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) closeKModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && m.classList.contains('open')) closeKModal();
  });
  return m;
}

function openKModal(url, title) {
  const m = ensureKModal();
  document.getElementById('kmodalTitle').textContent = title || '—';
  document.getElementById('kmodalBody').innerHTML = `<div style="padding: 40px 20px; text-align:center; color: var(--ink-3); font-size: 14px;">— загрузка —</div>`;
  document.getElementById('kmodalFullLink').href = url;
  m.classList.add('open');
  document.body.style.overflow = 'hidden';

  fetch(url)
    .then(r => r.text())
    .then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const article = doc.querySelector('article.legal-doc .legal-body') || doc.querySelector('main') || doc.body;
      const titleH1 = doc.querySelector('article.legal-doc h1');
      if (titleH1) {
        document.getElementById('kmodalTitle').innerHTML = titleH1.innerHTML;
      }
      const meta = doc.querySelector('.lede');
      if (meta) document.getElementById('kmodalMeta').textContent = meta.textContent;
      document.getElementById('kmodalBody').innerHTML = article ? article.innerHTML : '<p>Не удалось загрузить документ.</p>';
      document.getElementById('kmodalBody').scrollTop = 0;
    })
    .catch(() => {
      document.getElementById('kmodalBody').innerHTML = `<p style="color: var(--accent);">Не удалось загрузить документ. <a href="${url}" target="_blank" style="color: var(--brand); border-bottom: 1px solid currentColor;">Открыть в новой вкладке</a></p>`;
    });
}

function closeKModal() {
  const m = document.getElementById('kmodal');
  if (!m) return;
  m.classList.remove('open');
  document.body.style.overflow = '';
}

function bindModalLinks(root = document) {
  root.addEventListener('click', e => {
    const link = e.target.closest('a[data-modal]');
    if (!link) return;
    e.preventDefault();
    openKModal(link.getAttribute('href'), link.dataset.modalTitle || link.textContent.trim());
  });
}

/* ─────────────────────────────────
   FORM (booking)
   ───────────────────────────────── */

function bindBookingForm() {
  const form = document.getElementById('bookingForm');
  if (!form) return;

  const phone = form.querySelector('input[type="tel"]');
  if (phone) {
    phone.addEventListener('input', () => {
      let v = phone.value.replace(/\D/g, '');
      if (v.startsWith('8')) v = '7' + v.slice(1);
      if (v && !v.startsWith('7')) v = '7' + v;
      v = v.slice(0, 11);
      let out = '+7';
      if (v.length > 1) out += ' (' + v.slice(1, 4);
      if (v.length >= 4) out += ') ' + v.slice(4, 7);
      if (v.length >= 7) out += '-' + v.slice(7, 9);
      if (v.length >= 9) out += '-' + v.slice(9, 11);
      phone.value = out;
    });
  }

  const success = document.getElementById('formSuccess');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const required = form.querySelectorAll('[required]');
    let ok = true;
    required.forEach(el => {
      if (!el.value || (el.type === 'checkbox' && !el.checked)) {
        el.style.borderColor = 'var(--blood)';
        ok = false;
      } else el.style.borderColor = '';
    });
    if (!ok) return;
    if (success) {
      success.classList.add('show');
      form.reset();
      setTimeout(() => success.classList.remove('show'), 6000);
    }
  });
}

/* ─────────────────────────────────
   BRANCHES + map sync
   ───────────────────────────────── */

function bindBranches() {
  const rows = document.querySelectorAll('.branch-row');
  const pins = document.querySelectorAll('.map-pin');
  const nameOut = document.getElementById('mapBranchAddr');
  if (!rows.length) return;

  const setActive = i => {
    rows.forEach(r => r.classList.toggle('active', +r.dataset.id === i));
    pins.forEach(p => p.classList.toggle('active', +p.dataset.id === i));
    if (nameOut) nameOut.textContent = BRANCHES[i].addr;
  };
  rows.forEach(r => r.addEventListener('click', () => setActive(+r.dataset.id)));
  pins.forEach(p => p.addEventListener('click', () => setActive(+p.dataset.id)));
}

/* ─────────────────────────────────
   SMOOTH SCROLL for anchors
   ───────────────────────────────── */

function bindSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      const top = t.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ─────────────────────────────────
   EXPORTS
   ───────────────────────────────── */

window.KAMELIA = {
  CATEGORIES,
  PRICES,
  BRANCHES,
  STAR,
  ROSETTE,
  ARROW,
  fmt,
  renderPriceCategory,
  initAllKSelects,
  initKSelect,
  initAllKDates,
  initKDate,
  openKModal,
  closeKModal,
};

/* ─────────────────────────────────
   BOOTSTRAP
   ───────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  injectChrome();
  bindMobileMenu();
  bindNavScroll();
  bindReveal();
  bindCounters();
  bindFAQ();
  bindBookingForm();
  bindBranches();
  bindSmoothScroll();
  initAllKSelects();
  initAllKDates();
  bindModalLinks();

  // init category page if marker present
  const catMount = document.getElementById('priceCatMount');
  if (catMount) {
    const slug = catMount.dataset.slug;
    renderPriceCategory(catMount, slug);
  }
});

})();
