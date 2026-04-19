using Backend.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public static class SeedData
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (await context.Users.AnyAsync()) return;

        var adminHash = BCrypt.Net.BCrypt.HashPassword("admin123");
        var userHash = BCrypt.Net.BCrypt.HashPassword("user123");

        var users = new[]
        {
            new User { username = "admin", email = "admin@demo.com", password = adminHash, is_admin = 1, city = "Москва", phone = "+7 999 000-00-01", rating = 4.9, total_sales = 42 },
            new User { username = "seller_alex", email = "alex@demo.com", password = userHash, city = "Москва", phone = "+7 999 100-00-01", rating = 4.7, total_sales = 12 },
            new User { username = "seller_maria", email = "maria@demo.com", password = userHash, city = "Санкт-Петербург", phone = "+7 999 200-00-01", rating = 4.8, total_sales = 8 },
            new User { username = "buyer_ivan", email = "ivan@demo.com", password = userHash, city = "Казань", phone = "+7 999 300-00-01", rating = 4.5 },
            new User { username = "buyer_olga", email = "olga@demo.com", password = userHash, city = "Новосибирск", phone = "+7 999 400-00-01", rating = 4.6 },
        };
        await context.Users.AddRangeAsync(users);
        await context.SaveChangesAsync();

        var cats = new[]
        {
            new Category { id = "items",      name = "Товары" },
            new Category { id = "transport",  name = "Транспорт" },
            new Category { id = "realestate", name = "Недвижимость" },
            new Category { id = "services",   name = "Услуги" },
            new Category { id = "rent",       name = "Аренда" },
            new Category { id = "clothing",   name = "Одежда" },
        };
        await context.Categories.AddRangeAsync(cats);
        await context.SaveChangesAsync();

        var alex = users[1]; var maria = users[2];

        var products = new[]
        {
            new Product { title = "iPhone 15 Pro Max 256GB", description = "В идеальном состоянии, полный комплект.", category_id = "items", price = 89000, city = "Москва", condition = "Б/У", seller_id = alex.id, is_active = 1, details = "{\"brand\":\"Apple\",\"storage\":\"256GB\"}", images = "[]" },
            new Product { title = "MacBook Pro M3 14\"", description = "Мощный ноутбук для работы и творчества.", category_id = "items", price = 179000, city = "Москва", condition = "Новое", seller_id = alex.id, is_active = 1, details = "{\"brand\":\"Apple\",\"ram\":\"16GB\"}", images = "[]" },
            new Product { title = "Toyota Camry 2021", description = "Один владелец, без ДТП.", category_id = "transport", price = 2800000, city = "Москва", condition = "Б/У", seller_id = alex.id, is_active = 1, details = "{\"brand\":\"Toyota\",\"year\":2021,\"transmission\":\"Автомат\"}", images = "[]" },
            new Product { title = "Студия у метро Парнас", description = "Уютная студия, 5 мин. до метро.", category_id = "realestate", price = 25000, city = "Санкт-Петербург", condition = "Вторичка", seller_id = maria.id, is_active = 1, details = "{\"area\":28,\"rooms\":\"Студия\",\"floor\":7}", images = "[]" },
            new Product { title = "Ремонт iPhone и MacBook", description = "Профессиональный ремонт Apple-техники.", category_id = "services", price = 2500, city = "Санкт-Петербург", condition = "Услуга", seller_id = maria.id, is_active = 1, details = "{}", images = "[]" },
            new Product { title = "Электросамокат Xiaomi Pro 2", description = "Аренда самоката на день или неделю.", category_id = "rent", price = 500, city = "Москва", condition = "Аренда/сутки", seller_id = alex.id, is_active = 1, details = "{\"min_hours\":2,\"max_hours\":72}", images = "[]" },
            new Product { title = "Куртка Supreme FW23", description = "Оригинал, куплена в официальном магазине.", category_id = "clothing", price = 35000, city = "Москва", condition = "Новое", seller_id = maria.id, is_active = 1, details = "{\"brand\":\"Supreme\",\"size\":\"M\"}", images = "[]" },
            new Product { title = "AirPods Pro 2-го поколения", description = "Активное шумоподавление.", category_id = "items", price = 18500, city = "Санкт-Петербург", condition = "Новое", seller_id = maria.id, is_active = 1, details = "{\"brand\":\"Apple\"}", images = "[]", sale_type = "auction", auction_ends_at = DateTime.UtcNow.AddDays(3).ToString("yyyy-MM-dd HH:mm:ss"), auction_step = 500 },
        };
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();
    }
}
