# Камелия·Мед

Демо-сайт сети семейных стоматологий «Камелия-Мед» (Казань) — современный лендинг, прайс по&nbsp;направлениям, личный кабинет пациента и&nbsp;онлайн-запись на&nbsp;приём.

> Live: **https://kamelia.innertalk.space**

---

## Стек

**Backend** — Python 3.12 / FastAPI / SQLite / JWT в&nbsp;httpOnly-куках / bcrypt
**Frontend** — статический HTML/CSS/JS (no build step) · Onest + Fraunces · custom kselect/kdate/kmodal компоненты
**Деплой** — uvicorn за&nbsp;nginx + Let's Encrypt SSL + systemd

---

## Структура

```
kamelia/
├── backend/
│   ├── main.py              FastAPI app: auth, appointments, catalog, статика
│   ├── requirements.txt
│   └── kamelia.db           SQLite (auto-создаётся при первом запуске)
├── frontend/
│   ├── index.html           главная — hero, 8 направлений, врачи, отзывы, филиалы, CTA
│   ├── about.html           о клинике + история + оборудование + FAQ
│   ├── doctors.html         12 врачей в трёх группах
│   ├── branches.html        5 филиалов + интерактивная SVG-карта Казани
│   ├── booking.html         форма записи (POST /api/appointments)
│   ├── services/
│   │   ├── index.html       обзор всех 8 направлений
│   │   └── [категория].html детальная страница с прайсом и описанием
│   ├── cabinet/             личный кабинет
│   │   ├── login.html
│   │   ├── register.html    с password confirm + strength + show/hide
│   │   ├── index.html       dashboard
│   │   ├── appointments.html  журнал визитов с фильтрами
│   │   ├── profile.html     редактирование данных пациента
│   │   ├── cabinet.css
│   │   └── cabinet.js
│   ├── legal/
│   │   ├── privacy.html     152-ФЗ совместимая политика
│   │   └── terms.html       условия обслуживания
│   └── assets/
│       ├── style.css        вся вёрстка: layout, components, kselect, kdate, kmodal
│       └── site.js          nav, кастомные dropdown/datepicker, modal, форма
└── README.md
```

---

## Endpoints

```
POST   /api/auth/register         { email, password, name, phone? }
POST   /api/auth/login            { email, password }
POST   /api/auth/logout
GET    /api/auth/me               (auth required)
PATCH  /api/auth/me               { name?, phone?, birth_date? }

GET    /api/services              каталог направлений
GET    /api/branches              список филиалов
GET    /api/doctors               команда

POST   /api/appointments          (auth optional — гости тоже могут записаться)
GET    /api/appointments          (auth required) — свои записи
PATCH  /api/appointments/{id}
DELETE /api/appointments/{id}     отмена
```

JWT в&nbsp;httpOnly-куке `kamelia_session`, TTL 14&nbsp;дней. Пароль — bcrypt 12&nbsp;раундов.

---

## Запуск локально

```bash
cd backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Открыть **http://127.0.0.1:8765/**

При запуске backend автоматически создаст `backend/kamelia.db` и&nbsp;будет раздавать статику из&nbsp;`../frontend/`.

> Если запускаете backend из&nbsp;другой директории — поправьте `FRONTEND_DIR` в&nbsp;`main.py`.

---

## Деплой на VPS

```bash
# на сервере
git clone https://github.com/zeuszcz/kamelia.git /opt/kamelia
cd /opt/kamelia/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# тест
.venv/bin/python main.py

# systemd unit (см. deploy/kamelia.service)
sudo cp deploy/kamelia.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kamelia

# nginx vhost (см. deploy/kamelia.nginx)
sudo cp deploy/kamelia.nginx /etc/nginx/sites-available/kamelia
sudo ln -s /etc/nginx/sites-available/kamelia /etc/nginx/sites-enabled/
sudo certbot --nginx -d kamelia.innertalk.space
sudo systemctl reload nginx
```

---

## Особенности

- **Multi-page** — НЕ&nbsp;single-page-app, реальные HTML-страницы для&nbsp;каждой секции
- **Custom компоненты** вместо&nbsp;нативных:
  - `.kselect` — стилизованный dropdown (метаданные, keyboard nav, click-outside)
  - `.kdate` — календарь с&nbsp;ограничением диапазона, сегодня/очистить, ru-локаль
  - `.kmodal` — модалка с&nbsp;fetch-загрузкой контента
- **Авто-заполнение формы** — booking.html определяет залогиненного пользователя через `/api/auth/me` и&nbsp;подставляет имя/телефон с&nbsp;индикацией «из кабинета»
- **Multi-step regulatory consent** — 2&nbsp;чекбокса (обработка данных + согласие на&nbsp;уведомления) с&nbsp;модальными окнами для&nbsp;legal-документов

---

## Лицензия

Учебный/демо-проект. Все&nbsp;медицинские данные, врачи, цены — взяты с&nbsp;публичного сайта kamelia-med.ru для&nbsp;демонстрации редизайна.
