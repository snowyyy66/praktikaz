# Скрипты демо-данных

Демо-пользователи, категории, товары и заказы заполняются автоматически при **первом** запуске API (пустая БД), см. `Marketplace.Infrastructure/Data/DbSeeder.cs`.

Чтобы заново получить чистую базу с тем же сидом:

**PowerShell (Windows)**

```powershell
Remove-Item -Force marketplace.db -ErrorAction SilentlyContinue
dotnet run --project ..\Marketplace.Api
```

Запускать из каталога `backend/Marketplace.Api` или указать полный путь к `marketplace.db` рядом с вашим рабочим каталогом.
