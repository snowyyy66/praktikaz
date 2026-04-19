using Marketplace.Core.Entities;
using Marketplace.Core.Enums;
using Marketplace.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Marketplace.Infrastructure.Data;

// Если таблицы пустые — создаём демо-пользователей, категории и несколько объявлений для проверки UI.
public static class DbSeeder
{
    private static int Uid(AppDbContext db, string email) =>
        db.Users.AsNoTracking().First(u => u.Email == email).Id;

    private static int Pid(AppDbContext db, string titlePart) =>
        db.Products.AsNoTracking().First(p => p.Title.Contains(titlePart)).Id;

    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        if (await db.Users.AnyAsync(ct))
            return;

        var cats = new[]
        {
            ("transport", "Транспорт"),
            ("realestate", "Недвижимость"),
            ("items", "Предметы"),
            ("clothing", "Одежда и аксессуары"),
            ("services", "Услуги и прочее"),
            ("rent", "Аренда транспорта"),
        };
        foreach (var (id, name) in cats)
            db.Categories.Add(new Category { Id = id, Name = name });

        db.Users.AddRange(
            new User { Username = "vlad_msk", Email = "vlad99@bk.ru", Password = "123456", Phone = "+7 (916) 453-29-11", City = "Москва", Rating = 4.8, TotalSales = 12, TotalEarnings = 540000, CreatedAt = DateTime.UtcNow },
            new User { Username = "AutoDealer_Pro", Email = "dealer@mail.ru", Password = "123456", Phone = "+7 (999) 234-56-78", City = "Санкт-Петербург", Rating = 4.9, TotalSales = 45, TotalEarnings = 3400000, CreatedAt = DateTime.UtcNow },
            new User { Username = "dimon1995", Email = "dimon@inbox.ru", Password = "123456", Phone = "+7 (903) 112-68-98", City = "Казань", Rating = 4.2, TotalSales = 5, TotalEarnings = 80000, CreatedAt = DateTime.UtcNow },
            new User { Username = "elena_realtor", Email = "el_real@gmail.com", Password = "123456", Phone = "+7 (926) 888-21-44", City = "Новосибирск", Rating = 5.0, TotalSales = 17, TotalEarnings = 18900000, CreatedAt = DateTime.UtcNow },
            new User { Username = "artem_krop", Email = "krop@ya.ru", Password = "123456", Phone = "+7 (911) 567-89-01", City = "Москва", Rating = 4.7, TotalSales = 34, TotalEarnings = 4500000, CreatedAt = DateTime.UtcNow },
            new User { Username = "sneaker_head_spb", Email = "shoes@mail.ru", Password = "123456", Phone = "+7 (965) 678-90-12", City = "Екатеринбург", Rating = 4.5, TotalSales = 48, TotalEarnings = 620000, CreatedAt = DateTime.UtcNow },
            new User { Username = "admin_wiwang", Email = "admin45@gmail.com", Password = "admin12345", IsAdmin = true, Phone = "+7 (900) 000-00-00", City = "Москва", Rating = 5.0, CreatedAt = DateTime.UtcNow });

        await db.SaveChangesAsync(ct);

        db.Products.AddRange(
            new Product { Title = "BMW M5 F90", Description = "Продам свою ласточку, состояние идеал", CategoryId = "transport", Price = 8500000, City = "Москва", Condition = "Б/У", Views = 1240, Likes = 89, SellerId = Uid(db, "vlad99@bk.ru"), Details = """{"Двигатель":"4.4 V8 BiTurbo"}""", StockQuantity = 1, CreatedAt = DateTime.UtcNow },
            new Product { Title = "Mercedes W223 S", Description = "Пригонял из за границы", CategoryId = "transport", Price = 12000000, City = "Москва", Condition = "Б/У", Views = 890, Likes = 67, SellerId = Uid(db, "dealer@mail.ru"), Details = "{}", StockQuantity = 1, CreatedAt = DateTime.UtcNow },
            new Product { Title = "Toyota Camry 70", Description = "Машина отца", CategoryId = "transport", Price = 2800000, City = "Казань", Condition = "Б/У", Views = 2100, Likes = 156, SellerId = Uid(db, "dimon@inbox.ru"), Details = "{}", StockQuantity = 3, CreatedAt = DateTime.UtcNow },
            new Product { Title = "Квартира 2шка на Арбате", Description = "Срочная продажа", CategoryId = "realestate", Price = 18500000, City = "Москва", Condition = "Вторичка", Views = 3200, Likes = 89, SellerId = Uid(db, "el_real@gmail.com"), Details = "{}", StockQuantity = 1, CreatedAt = DateTime.UtcNow },
            new Product { Title = "Студия Комендантский", Description = "Переуступка", CategoryId = "realestate", Price = 5200000, City = "Санкт-Петербург", Condition = "Новостройка", Views = 1800, Likes = 56, SellerId = Uid(db, "el_real@gmail.com"), Details = "{}", StockQuantity = 1, CreatedAt = DateTime.UtcNow },
            new Product { Title = "iPhone 15 Pro Max", Description = "Телефону неделя", CategoryId = "items", Price = 120000, City = "Москва", Condition = "Б/У", Views = 4500, Likes = 234, SellerId = Uid(db, "vlad99@bk.ru"), Details = "{}", StockQuantity = 5, CreatedAt = DateTime.UtcNow },
            new Product { Title = "MacBook 16 m3", Description = "Подарили на др", CategoryId = "items", Price = 280000, City = "Москва", Condition = "Новое", Views = 2300, Likes = 156, SellerId = Uid(db, "krop@ya.ru"), Details = "{}", StockQuantity = 2, CreatedAt = DateTime.UtcNow },
            new Product { Title = "PS5 с дисководом", Description = "Играл раз 5", CategoryId = "items", Price = 45000, City = "Казань", Condition = "Б/У", Views = 1800, Likes = 89, SellerId = Uid(db, "dimon@inbox.ru"), Details = "{}", StockQuantity = 2, SaleType = "auction", AuctionEndsAt = DateTime.UtcNow.AddDays(14), AuctionStep = 500, CreatedAt = DateTime.UtcNow },
            new Product { Title = "Jordan 1 Chicago", Description = "Оригинал", CategoryId = "clothing", Price = 18000, City = "Москва", Condition = "Новое", Views = 3400, Likes = 210, SellerId = Uid(db, "shoes@mail.ru"), Details = "{}", StockQuantity = 4, CreatedAt = DateTime.UtcNow },
            new Product { Title = "Куртка TNF Nuptse", Description = "Зимний пухан", CategoryId = "clothing", Price = 22000, City = "Санкт-Петербург", Condition = "Б/У", Views = 1200, Likes = 67, SellerId = Uid(db, "shoes@mail.ru"), Details = "{}", StockQuantity = 1, CreatedAt = DateTime.UtcNow },
            new Product { Title = "Замена проводки", Description = "Электрик", CategoryId = "services", Price = 5000, City = "Москва", Condition = "Услуга", Views = 1800, Likes = 45, SellerId = Uid(db, "vlad99@bk.ru"), Details = "{}", StockQuantity = 0, CreatedAt = DateTime.UtcNow },
            new Product { Title = "Переезд с грузчиками", Description = "Газель", CategoryId = "services", Price = 2000, City = "Москва", Condition = "Услуга", Views = 3400, Likes = 210, SellerId = Uid(db, "krop@ya.ru"), Details = "{}", StockQuantity = 0, CreatedAt = DateTime.UtcNow },
            new Product { Title = "Аренда Model Y", Description = "Цена за час", CategoryId = "rent", Price = 1800, City = "Москва", Condition = "Аренда/сутки", Views = 1800, Likes = 67, SellerId = Uid(db, "dealer@mail.ru"), Details = """{"min_hours":"4","max_hours":"120"}""", StockQuantity = 0, CreatedAt = DateTime.UtcNow });

        await db.SaveChangesAsync(ct);

        void AddOrder(string buyerEmail, string sellerEmail, string productTitlePart, long total, DateTime created, OrderStatus status = OrderStatus.Completed)
        {
            var pr = db.Products.AsNoTracking().First(p => p.Title.Contains(productTitlePart));
            db.Orders.Add(new Order
            {
                BuyerId = Uid(db, buyerEmail),
                SellerId = Uid(db, sellerEmail),
                Status = status,
                Total = total,
                CreatedAt = created,
                Items = new List<OrderItem>
                {
                    new()
                    {
                        ProductId = pr.Id,
                        Quantity = 1,
                        UnitPrice = pr.Price,
                        LineTotal = total,
                    },
                },
            });
        }

        AddOrder("vlad99@bk.ru", "dealer@mail.ru", "Mercedes", 12000000, new DateTime(2026, 3, 15, 14, 30, 0, DateTimeKind.Utc));
        AddOrder("vlad99@bk.ru", "dimon@inbox.ru", "iPhone", 45000, new DateTime(2026, 3, 20, 10, 0, 0, DateTimeKind.Utc));
        AddOrder("dealer@mail.ru", "vlad99@bk.ru", "BMW", 8500000, new DateTime(2026, 3, 22, 16, 45, 0, DateTimeKind.Utc));
        AddOrder("dimon@inbox.ru", "el_real@gmail.com", "Квартира", 18500000, new DateTime(2026, 3, 25, 9, 30, 0, DateTimeKind.Utc));

        await db.SaveChangesAsync(ct);

        db.Favorites.AddRange(
            new Favorite { UserId = Uid(db, "vlad99@bk.ru"), ProductId = Pid(db, "BMW"), CreatedAt = DateTime.UtcNow },
            new Favorite { UserId = Uid(db, "vlad99@bk.ru"), ProductId = Pid(db, "Студия"), CreatedAt = DateTime.UtcNow },
            new Favorite { UserId = Uid(db, "dealer@mail.ru"), ProductId = Pid(db, "BMW"), CreatedAt = DateTime.UtcNow },
            new Favorite { UserId = Uid(db, "dealer@mail.ru"), ProductId = Pid(db, "MacBook"), CreatedAt = DateTime.UtcNow },
            new Favorite { UserId = Uid(db, "dimon@inbox.ru"), ProductId = Pid(db, "Mercedes"), CreatedAt = DateTime.UtcNow });

        await db.SaveChangesAsync(ct);
    }
}
