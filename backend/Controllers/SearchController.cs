using Backend.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Backend.Controllers;

[ApiController]
[Route("api/search")]
public class SearchController : ControllerBase
{
    private readonly DbService _db;

    public SearchController(DbService db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? q)
    {
        if (string.IsNullOrWhiteSpace(q)) return Ok(new object[] { });

        var term = $"%{q.Trim()}%";
        var sql = @"
            SELECT p.*, u.username as seller_name, c.name as category_name
            FROM products p
            JOIN users u ON p.seller_id = u.id
            JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = 1 AND (p.title LIKE @term OR p.description LIKE @term)
            ORDER BY p.created_at DESC
            LIMIT 20";

        var products = await _db.QueryAsync<dynamic>(sql, new { term });
        
        var result = products.Select(p => {
            var dict = (IDictionary<string, object>)p;
            try { dict["details"] = JsonSerializer.Deserialize<object>((string)dict["details"]!); } catch { dict["details"] = new object(); }
            return dict;
        });

        return Ok(result);
    }
}
