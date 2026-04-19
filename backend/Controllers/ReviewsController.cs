using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/reviews")]
public class ReviewsController : ControllerBase
{
    private readonly DbService _db;
    private readonly IWebHostEnvironment _env;

    private const int MAX_FILES = 10;
    private const long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    public ReviewsController(DbService db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    public class ReviewRequest
    {
        public int reviewer_id { get; set; }
        public int product_id { get; set; }
        public int rating { get; set; }
        public string? text { get; set; }
        public string[]? images { get; set; }
    }

    [HttpGet("check")]
    public async Task<IActionResult> CheckReview([FromQuery] int user_id, [FromQuery] int product_id)
    {
        if (user_id <= 0 || product_id <= 0) return BadRequest(new { error = "Некорректные параметры" });

        var hasPurchased = await _db.QueryFirstOrDefaultAsync<int>("SELECT id FROM orders WHERE buyer_id = @user_id AND product_id = @product_id", new { user_id, product_id });
        var existingReview = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT * FROM reviews WHERE reviewer_id = @user_id AND product_id = @product_id", new { user_id, product_id });

        if (existingReview != null)
        {
            var dict = (IDictionary<string, object>)existingReview;
            if (dict.ContainsKey("images") && dict["images"] is string json)
            {
                try { dict["images"] = System.Text.Json.JsonSerializer.Deserialize<string[]>(json); } catch { dict["images"] = new string[0]; }
            }
        }

        return Ok(new { 
            can_review = hasPurchased > 0, 
            user_review = existingReview 
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateReview([FromBody] ReviewRequest req)
    {
        try {
            if (req.rating < 1 || req.rating > 5) return BadRequest(new { error = "Рейтинг от 1 до 5" });

            // Получаем seller_id для заполнения обязательного поля target_user_id
            var sellerId = await _db.QueryFirstOrDefaultAsync<int>("SELECT seller_id FROM products WHERE id = @pid", new { pid = req.product_id });
            if (sellerId <= 0) return BadRequest(new { error = "Товар не найден или у него нет продавца" });

            string imagesJson = System.Text.Json.JsonSerializer.Serialize(req.images ?? new string[0]);

            await _db.ExecuteAsync(@"
                INSERT INTO reviews (reviewer_id, target_user_id, product_id, rating, text, images) 
                VALUES (@reviewer_id, @sellerId, @product_id, @rating, @text, @images)", 
                new { req.reviewer_id, sellerId, req.product_id, req.rating, text = req.text ?? "", images = imagesJson });

            return Ok(new { success = true });
        } catch (Exception ex) {
            Console.WriteLine($"[Reviews] CreateReview Error: {ex}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateReview(int id, [FromBody] ReviewRequest req)
    {
        var existing = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT * FROM reviews WHERE id = @id", new { id });
        if (existing == null) return NotFound();

        string imagesJson = System.Text.Json.JsonSerializer.Serialize(req.images ?? new string[0]);

        await _db.ExecuteAsync(@"
            UPDATE reviews 
            SET rating = @rating, text = @text, images = @images 
            WHERE id = @id", 
            new { req.rating, text = req.text ?? "", images = imagesJson, id });

        return Ok(new { success = true });
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadReviewMedia([FromForm] IFormFileCollection images)
    {
        try {
            if (images == null || images.Count == 0) return BadRequest(new { error = "Файлы не загружены" });
            if (images.Count > MAX_FILES) return BadRequest(new { error = $"Максимум {MAX_FILES} файлов" });

            foreach (var file in images)
            {
                if (file.Length > MAX_FILE_SIZE) return BadRequest(new { error = $"Файл {file.FileName} превышает 50MB" });
            }
            
            var uploadDir = Path.Combine(_env.ContentRootPath, "uploads", "reviews");
            if (!Directory.Exists(uploadDir)) Directory.CreateDirectory(uploadDir);

            var savedPaths = new List<string>();
            foreach (var file in images)
            {
                var ext = Path.GetExtension(file.FileName);
                var fileName = $"{Guid.NewGuid()}{ext}";
                var filePath = Path.Combine(uploadDir, fileName);
                
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }
                savedPaths.Add($"/uploads/reviews/{fileName}");
            }

            return Ok(new { images = savedPaths });
        } catch (Exception ex) {
            Console.WriteLine($"[Reviews] Upload Error: {ex}");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetProductReviews([FromQuery] int product_id)
    {
        var reviews = await _db.QueryAsync<dynamic>(@"
            SELECT r.*, u.username as reviewer_name 
            FROM reviews r
            JOIN users u ON r.reviewer_id = u.id
            WHERE r.product_id = @id
            ORDER BY r.created_at DESC", new { id = product_id });

        var items = new List<dynamic>();
        foreach (var r in reviews)
        {
            var dict = (IDictionary<string, object>)r;
            if (dict.ContainsKey("images") && dict["images"] is string json)
            {
                try { dict["images"] = System.Text.Json.JsonSerializer.Deserialize<string[]>(json); } catch { dict["images"] = new string[0]; }
            }
            else dict["images"] = new string[0];
            items.Add(dict);
        }
        return Ok(items);
    }

    [HttpGet("seller/{id}")]
    public async Task<IActionResult> GetUserReviews(int id)
    {
        var reviews = await _db.QueryAsync<dynamic>(@"
            SELECT r.*, u.username as reviewer_name, p.title as product_title, p.price as product_price, p.images as product_images
            FROM reviews r
            JOIN users u ON r.reviewer_id = u.id
            JOIN products p ON r.product_id = p.id
            WHERE p.seller_id = @id
            ORDER BY r.created_at DESC", new { id });

        var items = new List<dynamic>();
        foreach (var r in reviews)
        {
            var dict = (IDictionary<string, object>)r;
            
            // Reviews images
            if (dict.ContainsKey("images") && dict["images"] is string json)
            {
                try { dict["images"] = System.Text.Json.JsonSerializer.Deserialize<string[]>(json); } catch { dict["images"] = new string[0]; }
            }
            else dict["images"] = new string[0];

            // Product images
            if (dict.ContainsKey("product_images") && dict["product_images"] is string pJson)
            {
                try { 
                    var pImages = System.Text.Json.JsonSerializer.Deserialize<string[]>(pJson); 
                    dict["product_image"] = pImages?.Length > 0 ? pImages[0] : null;
                } catch { dict["product_image"] = null; }
            }
            else dict["product_image"] = null;

            items.Add(dict);
        }

        return Ok(items);
    }

    [HttpGet("reviewer/{id}")]
    public async Task<IActionResult> GetReviewsByReviewer(int id)
    {
        var reviews = await _db.QueryAsync<dynamic>(@"
            SELECT r.*, u.username as reviewer_name, p.title as product_title, p.price as product_price, p.images as product_images, p.category_id as product_category_id
            FROM reviews r
            JOIN users u ON r.reviewer_id = u.id
            JOIN products p ON r.product_id = p.id
            WHERE r.reviewer_id = @id
            ORDER BY r.created_at DESC", new { id });

        var items = new List<dynamic>();
        foreach (var r in reviews)
        {
            var dict = (IDictionary<string, object>)r;
            
            // Reviews images
            if (dict.ContainsKey("images") && dict["images"] is string json)
            {
                try { dict["images"] = System.Text.Json.JsonSerializer.Deserialize<string[]>(json); } catch { dict["images"] = new string[0]; }
            }
            else dict["images"] = new string[0];

            // Product images
            if (dict.ContainsKey("product_images") && dict["product_images"] is string pJson)
            {
                try { 
                    var pImages = System.Text.Json.JsonSerializer.Deserialize<string[]>(pJson); 
                    dict["product_images"] = pImages ?? new string[0];
                } catch { dict["product_images"] = new string[0]; }
            }
            else dict["product_images"] = new string[0];

            items.Add(dict);
        }

        return Ok(items);
    }
}
