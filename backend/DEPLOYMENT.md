# Запуск и сборка API

Нужен .NET SDK 8+.

## Локально

```bash
cd backend/Marketplace.Api
dotnet restore
dotnet run
```

API: http://localhost:3000, Swagger: `/swagger`. SQLite `marketplace.db` создаётся рядом с приложением; первый запуск — демо-данные из `DbSeeder`.

Строка подключения в `appsettings.json` → `ConnectionStrings:Default`. На сервере можно переопределить переменной `ConnectionStrings__Default`.

Загрузки лежат в папке `uploads`, раздаются как `/uploads/...`.

## Миграции

Сейчас при старте вызывается `EnsureCreated()`. Для нормального продакшена лучше сделать миграции:

```bash
cd backend
dotnet tool install -g dotnet-ef
dotnet ef migrations add Initial -p Marketplace.Infrastructure -s Marketplace.Api
dotnet ef database update -p Marketplace.Infrastructure -s Marketplace.Api
```

Потом в `Program.cs` вместо `EnsureCreatedAsync` использовать `MigrateAsync()`.

## Тесты и publish

```bash
cd backend
dotnet test
dotnet publish Marketplace.Api/Marketplace.Api.csproj -c Release -o ./publish
```

Запуск из `publish`: `dotnet Marketplace.Api.dll` (при необходимости `ASPNETCORE_URLS`).

## Фронт

Базовый URL API для Vite задаётся в `frontend/.env` — см. `frontend/.env.example` (`VITE_API_ORIGIN`).
