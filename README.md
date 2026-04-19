# WIWANG Marketplace

Прототип маркетплейса б/у вещей. Тёмная тема, без тяжёлых UI-библиотек.

## Стек

- Frontend: React 18, Vite
- Backend: ASP.NET Core, EF Core, SQLite (`backend/`)

## Запуск

Нужны **Node.js 18+** и **.NET SDK** (проект собран под актуальную целевую версию; см. `global.json`).

Из корня репозитория (поднимает API и Vite):

```bash
npm install
npm run dev
```

Скрипт `npm run dev` перед запуском подставляет в `PATH` каталог настоящего SDK (на Windows это обычно `C:\Program Files\dotnet`, а не «урезанный» `Program Files (x86)`). Если API всё равно не стартует, проверьте в PowerShell: `where dotnet` и `dotnet --list-sdks` — должны быть установленные SDK, не только runtime.

Если нужен запуск без обёртки: `npm run dev:raw` (требует корректный `dotnet` в системном PATH).

Отдельно: `cd backend/Marketplace.Api` → `dotnet run`; второй терминал: `cd frontend` → `npm run dev`.

Фронт обычно http://localhost:5173, API http://localhost:3000.

Только фронт: `npm run dev:front`.

Подробнее по деплою API — `backend/DEPLOYMENT.md`.

## Папки

- `frontend/` — клиент
- `backend/` — решение Visual Studio / `dotnet`, точка входа `Marketplace.Api`
