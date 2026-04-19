using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api")]
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

    [HttpPost("favorites")]
    public async Task<IActionResult> ToggleFavorite([FromBody] FavoriteRequest req)
    {
        if (req.user_id <= 0 || req.product_id <= 0) return BadRequest(new { error = "Некорректные данные" });

        var existing = await _db.QueryFirstOrDefaultAsync<int>("SELECT id FROM favorites WHERE user_id = @u AND product_id = @p", new { u = req.user_id, p = req.product_id });

        if (existing > 0)
        {
            await _db.ExecuteAsync("DELETE FROM favorites WHERE id = @id", new { id = existing });
            return Ok(new { added = false });
        }
        else
        {
            await _db.ExecuteAsync("INSERT INTO favorites (user_id, product_id) VALUES (@u, @p)", new { u = req.user_id, p = req.product_id });
            return Ok(new { added = true });
        }
    }

    [HttpPut("notifications/{id}/read")]
    public async Task<IActionResult> MarkNotificationRead(int id)
    {
        await _db.ExecuteAsync("UPDATE notifications SET is_read = 1 WHERE id = @id", new { id });
        return Ok(new { success = true });
    }

    [HttpGet("admin/products")]
    public async Task<IActionResult> GetAdminProducts([FromQuery] int? user_id)
    {
        if (user_id == null) return StatusCode(403, new { error = "Доступ только для администратора" });
        
        var user = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT * FROM users WHERE id = @id", new { id = user_id });
        if (user == null || (string)user.role != "admin") return StatusCode(403, new { error = "Доступ только для администратора" });

        var products = await _db.QueryAsync<dynamic>(@"
            SELECT p.*, u.name as seller_name 
            FROM products p 
            JOIN users u ON p.seller_id = u.id 
            ORDER BY p.created_at DESC");

        var items = new List<dynamic>();
        foreach (var p in products)
        {
            var dict = (IDictionary<string, object>)p;
            if (dict.ContainsKey("images") && dict["images"] is string json)
            {
                try { dict["images"] = System.Text.Json.JsonSerializer.Deserialize<string[]>(json); } catch { dict["images"] = new string[0]; }
            }
            items.Add(dict);
        }
        return Ok(items);
    }
}
