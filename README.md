# AutoGIS - Платформа для автомастеров

## Структура проекта

```
/
├── backend/          # Go backend (API, БД, WebSocket)
├── src/             # React frontend
├── public/          # Статические файлы
└── server.ts        # Dev mock-сервер (только для разработки фронта)
```

## Быстрый запуск всего проекта в Docker

Единый Compose поднимает PostgreSQL/PostGIS, RustFS (S3-хранилище), Go API и React/Nginx. RustFS публикуется на порту `9000`, потому что браузер загружает фотографии напрямую по presigned URL.

```bash
cp .env.example .env
# Обязательно замените секреты в .env
docker compose up -d --build
```

После запуска приложение доступно на `http://localhost` (или на значении `PUBLIC_URL`).
Проверка состояния API: `http://localhost/healthz`.

## Обновление на сервере

Проект находится в корне репозитория. Для обновления сервера:

```bash
cd /opt/AutoGis1
git pull origin main
docker compose up -d --build
docker compose ps
```

На сервере укажите в `.env` внешний адрес приложения и RustFS, например `PUBLIC_URL=http://31.57.158.55` и `PUBLIC_MEDIA_URL=http://31.57.158.55:9000`.

Остановить контейнеры без удаления данных:

```bash
docker compose down
```

Чтобы удалить также локальные данные PostgreSQL и MinIO, используйте `docker compose down -v`.

## Запуск проекта вручную

### Backend (Go)

```bash
cd backend

# Установить зависимости
go mod download

# Запустить PostgreSQL и S3-хранилище (Docker)
docker compose -f backend/docker-compose.yml up -d

# Запустить backend
make dev
# или
go run ./cmd/server
```

Backend будет на **http://localhost:3001**

### Frontend (React + Vite)

```bash
# Установить зависимости
npm install

# Запустить dev сервер
npm run dev
```

Frontend будет на **http://localhost:5173**

## Переменные окружения

### Backend (`backend/.env`)
```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=auto_masters
JWT_SECRET=your-secret-key
```

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:3001
```

## Production

Для продакшена используется:
- Go backend с PostgreSQL + PostGIS
- React frontend (build через `npm run build`)
- Nginx для статики

**Mock сервер (`server.ts`) НЕ используется в продакшене!**
