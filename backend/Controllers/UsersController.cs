using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly DbService _db;
    private readonly IWebHostEnvironment _env;

    public UsersController(DbService db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(int id)
    {
        var user = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT id, username, email, is_admin, phone, city, avatar, created_at, rating, total_sales, total_earnings FROM users WHERE id = @id", new { id });
        if (user == null) return NotFound(new { error = "Not found" });
        return Ok(user);
    }

    [HttpPost("{id}/avatar")]
    public async Task<IActionResult> UploadAvatar(int id, [FromForm] IFormFile avatar)
    {
        if (avatar == null) return BadRequest(new { error = "Файл не загружен" });

        var allowedExt = new[] { ".jpg", ".jpeg", ".png", ".gif" };
        var ext = Path.GetExtension(avatar.FileName).ToLower();
        if (!allowedExt.Contains(ext))
            return BadRequest(new { error = $"Формат {ext} не поддерживается. Разрешены только: jpg, jpeg, png, gif" });

        var uploadsDir = Path.Combine(_env.ContentRootPath, "uploads");
        if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);

        var fileName = $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{System.Text.RegularExpressions.Regex.Replace(avatar.FileName, "[^a-zA-Z0-9.]", "_")}";
        var path = Path.Combine(uploadsDir, fileName);
        using (var stream = new FileStream(path, FileMode.Create))
        {
            await avatar.CopyToAsync(stream);
        }

        var url = $"/uploads/{fileName}";
        await _db.ExecuteAsync("UPDATE users SET avatar = @url WHERE id = @id", new { url, id });
        return Ok(new { success = true, avatar = url });
    }

    public class UpdateUserRequest
    {
        public string username { get; set; } = "";
        public string? phone { get; set; }
        public string? city { get; set; }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest req)
    {
        if (id <= 0) return BadRequest(new { error = "Некорректный id пользователя" });
        if (string.IsNullOrWhiteSpace(req.username)) return BadRequest(new { error = "Имя не может быть пустым" });

        await _db.ExecuteAsync("UPDATE users SET username = @username, phone = @phone, city = @city WHERE id = @id", 
            new { username = req.username.Trim(), phone = (req.phone ?? "").Trim(), city = (req.city ?? "").Trim(), id });
        return Ok(new { success = true });
    }

    [HttpGet("{id}/products")]
    public async Task<IActionResult> GetUserProducts(int id)
    {
        var products = await _db.QueryAsync<dynamic>(@"
            SELECT p.*, c.name as category_name FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE p.seller_id = @id AND p.is_active = 1 ORDER BY p.created_at DESC", new { id });
            
        var items = products.Select(p => 
        {
            var dict = (IDictionary<string, object>)p;
            try { dict["details"] = System.Text.Json.JsonSerializer.Deserialize<object>((string)dict["details"]!); } catch { dict["details"] = new object(); }
            try { dict["images"] = System.Text.Json.JsonSerializer.Deserialize<object>((string)dict["images"]!); } catch { dict["images"] = new object[] { }; }
            return dict;
        });

        return Ok(items);
    }

    [HttpGet("{id}/stats")]
    public async Task<IActionResult> GetUserStats(int id)
    {
        var totalProducts = await _db.QueryFirstOrDefaultAsync<int>("SELECT COUNT(*) FROM products WHERE seller_id = @id", new { id });
        var activeProducts = await _db.QueryFirstOrDefaultAsync<int>("SELECT COUNT(*) FROM products WHERE seller_id = @id AND is_active = 1", new { id });
        var totalViews = await _db.QueryFirstOrDefaultAsync<int>("SELECT COALESCE(SUM(views), 0) FROM products WHERE seller_id = @id", new { id });
        var totalLikes = await _db.QueryFirstOrDefaultAsync<int>("SELECT COALESCE(SUM(likes), 0) FROM products WHERE seller_id = @id", new { id });

        var sales = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM orders WHERE seller_id = @id AND status = 'completed'", new { id });
        var purchases = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as spent FROM orders WHERE buyer_id = @id AND status = 'completed'", new { id });

        int salesCount = (int)(sales?.count ?? 0);
        int catalogCount = totalProducts;

        var badges = new List<object>();
        
        // Sales Badge Logic
        if (salesCount >= 50) badges.Add(new { title = "Император продаж", hint = $"Продаж: {salesCount}", tone = "gold" });
        else if (salesCount >= 20) badges.Add(new { title = "Гуру сделок", hint = $"Продаж: {salesCount}", tone = "purple" });
        else if (salesCount >= 10) badges.Add(new { title = "Мастер торга", hint = $"Продаж: {salesCount}", tone = "blue" });
        else if (salesCount >= 5) badges.Add(new { title = "Уверенный продавец", hint = $"Продаж: {salesCount}", tone = "green" });
        else if (salesCount >= 2) badges.Add(new { title = "Первый опыт", hint = $"Продаж: {salesCount}", tone = "teal" });
        else if (salesCount >= 1) badges.Add(new { title = "Новичок в продажах", hint = $"Продаж: {salesCount}", tone = "gray" });
        else badges.Add(new { title = "Без сделок", hint = "Сделай первую продажу", tone = "gray" });

        // Catalog Badge Logic
        if (catalogCount >= 120) badges.Add(new { title = "Король витрины", hint = $"Объявлений: {catalogCount}", tone = "gold" });
        else if (catalogCount >= 70) badges.Add(new { title = "Магнат каталога", hint = $"Объявлений: {catalogCount}", tone = "purple" });
        else if (catalogCount >= 40) badges.Add(new { title = "Коллекционер лотов", hint = $"Объявлений: {catalogCount}", tone = "blue" });
        else if (catalogCount >= 20) badges.Add(new { title = "Активный продавец", hint = $"Объявлений: {catalogCount}", tone = "green" });
        else if (catalogCount >= 10) badges.Add(new { title = "Разгон витрины", hint = $"Объявлений: {catalogCount}", tone = "teal" });
        else if (catalogCount >= 3) badges.Add(new { title = "Первые лоты", hint = $"Объявлений: {catalogCount}", tone = "gray" });
        else badges.Add(new { title = "Пустая витрина", hint = "Добавь первое объявление", tone = "gray" });

        return Ok(new {
            totalProducts, activeProducts, totalViews, totalLikes,
            sales = new { count = salesCount, revenue = sales?.revenue ?? 0 },
            purchases = new { count = purchases?.count ?? 0, spent = purchases?.spent ?? 0 },
            badges
        });
    }

    [HttpGet("{id}/favorites")]
    public async Task<IActionResult> GetUserFavorites(int id)
    {
        var favs = await _db.QueryAsync<dynamic>(@"
            SELECT p.*, c.name as category_name, u.username as seller_name
            FROM favorites f JOIN products p ON f.product_id = p.id
            JOIN categories c ON p.category_id = c.id JOIN users u ON p.seller_id = u.id
            WHERE f.user_id = @id ORDER BY f.created_at DESC LIMIT 20", new { id });

        var items = favs.Select(p => 
        {
            var dict = (IDictionary<string, object>)p;
            try { dict["details"] = System.Text.Json.JsonSerializer.Deserialize<object>((string)dict["details"]!); } catch { dict["details"] = new object(); }
            try { dict["images"] = System.Text.Json.JsonSerializer.Deserialize<object>((string)dict["images"]!); } catch { dict["images"] = new object[] { }; }
            dict["is_favorite"] = true;
            return dict;
        });

        return Ok(items);
    }

    [HttpGet("{id}/orders")]
    public async Task<IActionResult> GetUserOrders(int id)
    {
        var orders = await _db.QueryAsync<dynamic>(@"
            SELECT o.*, p.title as product_title, p.price as product_price, p.category_id as product_category_id,
                   buyer.username as buyer_name, seller.username as seller_name
            FROM orders o JOIN products p ON o.product_id = p.id
            JOIN users buyer ON o.buyer_id = buyer.id
            JOIN users seller ON o.seller_id = seller.id
            WHERE o.buyer_id = @id OR o.seller_id = @id
            ORDER BY o.created_at DESC", new { id });
        return Ok(orders);
    }

    [HttpGet("{id}/notifications")]
    public async Task<IActionResult> GetNotifications(int id)
    {
        var notifications = await _db.QueryAsync<dynamic>("SELECT * FROM notifications WHERE user_id = @id ORDER BY created_at DESC LIMIT 50", new { id });
        return Ok(notifications);
    }

    [HttpPut("{id}/notifications/read-all")]
    public async Task<IActionResult> MarkAllNotificationsRead(int id)
    {
        await _db.ExecuteAsync("UPDATE notifications SET is_read = 1 WHERE user_id = @id", new { id });
        return Ok(new { success = true });
    }
}
