using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
public class MiscController : ControllerBase
{
    private readonly DbService _db;

    public MiscController(DbService db)
    {
        _db = db;
    }

    public class FavoriteRequest
    {
        public int user_id { get; set; }
        public int product_id { get; set; }
    }

    [HttpPost("api/favorites")]
    public async Task<IActionResult> ToggleFavorite([FromBody] FavoriteRequest req)
    {
        if (req.user_id <= 0 || req.product_id <= 0) return BadRequest(new { error = "Некорректные данные" });
        
        var existing = await _db.QueryFirstOrDefaultAsync<int>("SELECT id FROM favorites WHERE user_id = @user_id AND product_id = @product_id", new { req.user_id, req.product_id });
        if (existing > 0)
        {
            await _db.ExecuteAsync("DELETE FROM favorites WHERE user_id = @user_id AND product_id = @product_id", new { req.user_id, req.product_id });
            return Ok(new { success = true, favorited = false });
        }
        else
        {
            await _db.ExecuteAsync("INSERT INTO favorites (user_id, product_id) VALUES (@user_id, @product_id)", new { req.user_id, req.product_id });
            return Ok(new { success = true, favorited = true });
        }
    }

    public class ReviewRequest
    {
        public int reviewer_id { get; set; }
        public int product_id { get; set; }
        public int rating { get; set; }
        public string? text { get; set; }
    }

    [HttpPost("api/reviews")]
    public async Task<IActionResult> CreateReview([FromBody] ReviewRequest req)
    {
        if (req.rating < 1 || req.rating > 5) return BadRequest(new { error = "Рейтинг от 1 до 5" });

        var product = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT seller_id FROM products WHERE id = @id", new { id = req.product_id });
        if (product == null) return NotFound(new { error = "Товар не найден" });

        var hasPurchased = await _db.QueryFirstOrDefaultAsync<int>("SELECT id FROM orders WHERE buyer_id = @bid AND product_id = @pid", new { bid = req.reviewer_id, pid = req.product_id });
        if (hasPurchased == 0) return StatusCode(403, new { error = "Отзыв можно оставить только после покупки товара" });

        try {
            await _db.ExecuteAsync("INSERT INTO reviews (reviewer_id, target_user_id, product_id, rating, text) VALUES (@rid, @tid, @pid, @rating, @text)",
                new { rid = req.reviewer_id, tid = (int)product.seller_id, pid = req.product_id, rating = req.rating, text = req.text ?? "" });

            var avg = await _db.QueryFirstOrDefaultAsync<double>("SELECT AVG(rating) FROM reviews WHERE target_user_id = @tid", new { tid = (int)product.seller_id });
            var newRating = Math.Round(Math.Max(1.0, avg) * 10) / 10;
            await _db.ExecuteAsync("UPDATE users SET rating = @rating WHERE id = @tid", new { rating = newRating, tid = (int)product.seller_id });
            await _db.ExecuteAsync("INSERT INTO notifications (user_id, type, text) VALUES (@tid, 'review', @text)", new { tid = (int)product.seller_id, text = $"Новый отзыв на ваш товар — оценка {req.rating}/5" });

            return Ok(new { success = true });
        } catch (Exception ex) {
            if (ex.Message.Contains("UNIQUE") || ex.Message.Contains("Constraint")) return StatusCode(409, new { error = "Вы уже оставили отзыв на этот товар" });
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPut("api/notifications/{id}/read")]
    public async Task<IActionResult> MarkNotificationRead(int id)
    {
        await _db.ExecuteAsync("UPDATE notifications SET is_read = 1 WHERE id = @id", new { id });
        return Ok(new { success = true });
    }

    [HttpGet("api/admin/products")]
    public async Task<IActionResult> GetAdminProducts([FromQuery] int? user_id)
    {
        if (user_id == null) return StatusCode(403, new { error = "Доступ только для администратора" });
        var admin = await _db.QueryFirstOrDefaultAsync<int>("SELECT is_admin FROM users WHERE id = @uid", new { uid = user_id });
        if (admin != 1) return StatusCode(403, new { error = "Доступ только для администратора" });

        var products = await _db.QueryAsync<dynamic>(@"
            SELECT p.*, c.name as category_name, u.username as seller_name
            FROM products p
            JOIN categories c ON p.category_id = c.id
            JOIN users u ON p.seller_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 500");
            
        var items = products.Select(p => 
        {
            var dict = (IDictionary<string, object>)p;
            try { dict["details"] = System.Text.Json.JsonSerializer.Deserialize<object>((string)dict["details"]!); } catch { dict["details"] = new object(); }
            try { dict["images"] = System.Text.Json.JsonSerializer.Deserialize<object>((string)dict["images"]!); } catch { dict["images"] = new object[] { }; }
            return dict;
        });

        return Ok(items);
    }
}
