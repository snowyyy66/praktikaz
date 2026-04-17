using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using Dapper;

namespace Backend.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private readonly DbService _db;
    private readonly IWebHostEnvironment _env;

    public ProductsController(DbService db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    private bool IsAdminUser(int? userId)
    {
        if (userId == null) return false;
        var admin = _db.QueryFirstOrDefaultAsync<int>("SELECT is_admin FROM users WHERE id = @uid", new { uid = userId }).Result;
        return admin == 1;
    }

    private long SqlDateToMs(string? dateStr)
    {
        if (string.IsNullOrEmpty(dateStr)) return 0;
        if (!dateStr.Contains("T")) dateStr = dateStr.Replace(" ", "T");
        if (DateTime.TryParse(dateStr, out var result))
        {
            return new DateTimeOffset(result).ToUnixTimeMilliseconds();
        }
        return 0;
    }

    private bool IsAuctionLive(Product p)
    {
        if ((p.sale_type ?? "fixed") != "auction") return false;
        if (string.IsNullOrEmpty(p.auction_ends_at)) return false;
        return SqlDateToMs(p.auction_ends_at) > DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    }

    private async Task<long> GetAuctionHigh(long productId)
    {
        var max = await _db.QueryFirstOrDefaultAsync<long>("SELECT COALESCE(MAX(amount), 0) FROM auction_bids WHERE product_id = @productId", new { productId });
        return max;
    }

    private async Task<long> GetAuctionMinBid(Product p)
    {
        long step = p.auction_step > 0 ? p.auction_step : 500;
        long high = await GetAuctionHigh(p.id);
        return high <= 0 ? p.price : high + step;
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts([FromQuery] string? category, [FromQuery] string? sort, [FromQuery] string? search, [FromQuery] string? auction, [FromQuery] string? city, [FromQuery] int? user_id, [FromQuery] int page = 1, [FromQuery] int limit = 24)
    {
        page = Math.Max(1, page);
        limit = Math.Min(100, Math.Max(1, limit));
        int offset = (page - 1) * limit;

        string favSql = user_id.HasValue 
            ? "(SELECT EXISTS(SELECT 1 FROM favorites f WHERE f.product_id = p.id AND f.user_id = @user_id))" 
            : "0";

        string sql = $@"
            SELECT p.*, u.username as seller_name, u.phone as seller_phone, u.rating as seller_rating, c.name as category_name,
              (SELECT COALESCE(MAX(amount), 0) FROM auction_bids ab WHERE ab.product_id = p.id) as auction_high_bid,
              {favSql} as is_favorite
            FROM products p
            JOIN users u ON p.seller_id = u.id
            JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = 1";

        var prm = new DynamicParameters();
        if (user_id.HasValue) prm.Add("user_id", user_id.Value);

        if (auction == "1") sql += " AND COALESCE(p.sale_type, 'fixed') = 'auction'";
        
        if (!string.IsNullOrEmpty(category))
        {
            sql += " AND p.category_id = @category";
            prm.Add("category", category);
        }
        if (!string.IsNullOrEmpty(search))
        {
            sql += " AND p.title LIKE @search";
            prm.Add("search", $"%{search}%");
        }
        if (!string.IsNullOrEmpty(city))
        {
            sql += " AND LOWER(p.city) LIKE LOWER(@city)";
            prm.Add("city", $"%{city.Trim()}%");
        }

        sql += sort switch
        {
            "price_asc" => " ORDER BY p.price ASC",
            "price_desc" => " ORDER BY p.price DESC",
            "popular" => " ORDER BY p.views DESC",
            _ => " ORDER BY p.created_at DESC"
        };

        sql += " LIMIT @limit OFFSET @offset";
        prm.Add("limit", limit);
        prm.Add("offset", offset);

        var products = await _db.QueryAsync<dynamic>(sql, prm);
        
        var items = products.Select(p => 
        {
            var dict = (IDictionary<string, object>)p;
            try { dict["details"] = JsonSerializer.Deserialize<object>((string)dict["details"]!); } catch { dict["details"] = new object(); }
            try { dict["images"] = JsonSerializer.Deserialize<object>((string)dict["images"]!); } catch { dict["images"] = new object[] { }; }
            dict["is_favorite"] = Convert.ToInt32(dict["is_favorite"]) == 1;
            return dict;
        }).ToList();

        return Ok(new { items, page, limit, has_more = items.Count == limit });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProduct(int id, [FromQuery] int? user_id)
    {
        var productDyn = await _db.QueryFirstOrDefaultAsync<dynamic>(@"
            SELECT p.*, u.username as seller_name, u.phone as seller_phone, u.rating as seller_rating, u.city as seller_city, u.total_sales as seller_total_sales, u.avatar as seller_avatar, c.name as category_name
            FROM products p
            JOIN users u ON p.seller_id = u.id
            JOIN categories c ON p.category_id = c.id
            WHERE p.id = @id", new { id });

        if (productDyn == null) return NotFound(new { error = "Not found" });

        var dict = (IDictionary<string, object>)productDyn;
        var p = new Product {
            id = Convert.ToInt32(dict["id"]), price = Convert.ToInt32(dict["price"]), sale_type = (string)dict["sale_type"],
            auction_ends_at = (string)dict["auction_ends_at"], auction_step = Convert.ToInt32(dict["auction_step"])
        };

        try { dict["details"] = JsonSerializer.Deserialize<object>((string)dict["details"]!); } catch { dict["details"] = new object(); }
        try { dict["images"] = JsonSerializer.Deserialize<object>((string)dict["images"]!); } catch { dict["images"] = new object[] { }; }

        var high = await GetAuctionHigh(p.id);
        var leader = await _db.QueryFirstOrDefaultAsync<dynamic>(@"
            SELECT b.bidder_id, u.username as leader_name
            FROM auction_bids b JOIN users u ON b.bidder_id = u.id
            WHERE b.product_id = @id AND b.amount = @high
            ORDER BY b.created_at DESC, b.id DESC LIMIT 1", new { id, high });
            
        var bidsCount = await _db.QueryFirstOrDefaultAsync<int>("SELECT COUNT(*) FROM auction_bids WHERE product_id = @id", new { id });
        
        dict["auction_high_bid"] = high > 0 ? high : null;
        dict["auction_min_next_bid"] = (p.sale_type ?? "fixed") == "auction" ? await GetAuctionMinBid(p) : null;
        dict["auction_leader_id"] = leader != null ? leader.bidder_id : null;
        dict["auction_leader_name"] = leader != null ? leader.leader_name : null;
        dict["auction_bids_count"] = bidsCount;
        dict["auction_live"] = IsAuctionLive(p);
        dict["auction_ended"] = (p.sale_type ?? "fixed") == "auction" && !string.IsNullOrEmpty(p.auction_ends_at) && !IsAuctionLive(p);

        dict["is_favorite"] = false;
        if (user_id.HasValue && user_id.Value > 0)
        {
            var fav = await _db.QueryFirstOrDefaultAsync<int>("SELECT 1 FROM favorites WHERE user_id = @user_id AND product_id = @id", new { user_id = user_id.Value, id });
            dict["is_favorite"] = fav == 1;
        }

        return Ok(dict);
    }

    [HttpPost("{id}/views")]
    public async Task<IActionResult> IncrementViews(int id, [FromQuery] int? user_id)
    {
        if (user_id.HasValue && user_id.Value > 0)
        {
            // Не считаем просмотр от самого продавца
            var sellerId = await _db.QueryFirstOrDefaultAsync<int>("SELECT seller_id FROM products WHERE id = @id", new { id });
            if (sellerId == user_id.Value)
                return Ok(new { success = true, skipped = true });

            // Уникальный просмотр — вставляем запись, если уже есть — игнорируем
            var inserted = await _db.ExecuteAsync(
                "INSERT OR IGNORE INTO product_views (product_id, user_id) VALUES (@id, @uid)",
                new { id, uid = user_id.Value });

            if (inserted > 0)
                await _db.ExecuteAsync("UPDATE products SET views = views + 1 WHERE id = @id", new { id });
        }
        else
        {
            // Анонимные пользователи — просто +1 (как раньше)
            await _db.ExecuteAsync("UPDATE products SET views = views + 1 WHERE id = @id", new { id });
        }
        return Ok(new { success = true });
    }

    // Вспомогательный класс для создания продукта
    public class CreateProductRequest
    {
        public string title { get; set; } = "";
        public string description { get; set; } = "";
        public string category_id { get; set; } = "";
        public int price { get; set; }
        public string city { get; set; } = "";
        public string condition { get; set; } = "";
        public int seller_id { get; set; }
        public object details { get; set; } = new { };
        public string? sale_type { get; set; }
        public string? auction_ends_at { get; set; }
        public int? auction_step { get; set; }
    }

    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.title) || string.IsNullOrWhiteSpace(req.category_id) || string.IsNullOrWhiteSpace(req.city) || string.IsNullOrWhiteSpace(req.condition))
            return BadRequest(new { error = "Заполните обязательные поля объявления" });
            
        if (req.seller_id <= 0) return BadRequest(new { error = "Некорректный seller_id" });
        if (req.price < 1) return BadRequest(new { error = "Некорректная цена" });

        var seller = await _db.QueryFirstOrDefaultAsync<int>("SELECT id FROM users WHERE id = @id", new { id = req.seller_id });
        if (seller == 0) return NotFound(new { error = "Продавец не найден" });

        var st = req.sale_type == "auction" ? "auction" : "fixed";
        string? ends = null;
        if (st == "auction" && !string.IsNullOrEmpty(req.auction_ends_at))
        {
            ends = req.auction_ends_at.Trim().Substring(0, Math.Min(19, req.auction_ends_at.Trim().Length)).Replace("T", " ");
        }
        int step = st == "auction" ? Math.Max(1, req.auction_step ?? 500) : 500;

        if (st == "auction")
        {
            if (string.IsNullOrEmpty(ends)) return BadRequest(new { error = "Укажите дату окончания торгов" });
            if (SqlDateToMs(ends) <= DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()) return BadRequest(new { error = "Окончание торгов должно быть в будущем" });
        }

        string detailsJson = JsonSerializer.Serialize(req.details);
        
        await _db.ExecuteAsync(@"
            INSERT INTO products (title, description, category_id, price, city, condition, seller_id, details, sale_type, auction_ends_at, auction_step)
            VALUES (@title, @description, @category_id, @price, @city, @condition, @seller_id, @details, @st, @ends, @step)",
            new { req.title, req.description, req.category_id, req.price, req.city, req.condition, req.seller_id, details = detailsJson, st, ends, step });

        var createdId = await _db.QueryFirstOrDefaultAsync<int>("SELECT id FROM products WHERE seller_id = @seller_id ORDER BY id DESC LIMIT 1", new { req.seller_id });
        return Ok(new { success = true, id = createdId });
    }

    [HttpGet("{id}/bids")]
    public async Task<IActionResult> GetBids(int id)
    {
        var rows = await _db.QueryAsync<dynamic>(@"
            SELECT b.id, b.amount, b.created_at, u.username as bidder_name
            FROM auction_bids b JOIN users u ON b.bidder_id = u.id
            WHERE b.product_id = @id
            ORDER BY b.created_at DESC, b.id DESC
            LIMIT 30", new { id });
        return Ok(rows);
    }

    [HttpPost("{id}/bids")]
    public async Task<IActionResult> PlaceBid(int id, [FromBody] JsonElement body)
    {
        int bidderId = body.TryGetProperty("bidder_id", out var bId) ? bId.GetInt32() : 0;
        int amount = body.TryGetProperty("amount", out var amt) ? amt.GetInt32() : 0;
        
        if (bidderId <= 0 || amount < 1) return BadRequest(new { error = "Некорректная ставка" });

        var product = await _db.QueryFirstOrDefaultAsync<Product>("SELECT * FROM products WHERE id = @id AND is_active = 1", new { id });
        if (product == null) return NotFound(new { error = "Лот не найден" });
        if ((product.sale_type ?? "fixed") != "auction") return BadRequest(new { error = "Это не аукцион" });
        if (product.seller_id == bidderId) return BadRequest(new { error = "Нельзя ставить на своё объявление" });
        if (!IsAuctionLive(product)) return BadRequest(new { error = "Приём ставок закончился" });

        long minNext = await GetAuctionMinBid(product);
        if (amount < minNext) return BadRequest(new { error = $"Минимальная ставка: {minNext.ToString("N0", new System.Globalization.CultureInfo("ru-RU"))} ₽" });

        await _db.ExecuteAsync("INSERT INTO auction_bids (product_id, bidder_id, amount) VALUES (@id, @bidderId, @amount)", new { id, bidderId, amount });
        
        long high = await GetAuctionHigh(id);
        var leader = await _db.QueryFirstOrDefaultAsync<dynamic>(@"
            SELECT b.bidder_id, u.username as leader_name
            FROM auction_bids b JOIN users u ON b.bidder_id = u.id
            WHERE b.product_id = @id AND b.amount = @high
            ORDER BY b.created_at DESC, b.id DESC LIMIT 1", new { id, high });
        int bidsCount = await _db.QueryFirstOrDefaultAsync<int>("SELECT COUNT(*) FROM auction_bids WHERE product_id = @id", new { id });

        await _db.ExecuteAsync("INSERT INTO notifications (user_id, type, text) VALUES (@seller_id, 'auction', @text)",
            new { seller_id = product.seller_id, text = $"Ставка {amount.ToString("N0", new System.Globalization.CultureInfo("ru-RU"))} ₽ по «{product.title}»" });

        return Ok(new {
            success = true,
            auction_high_bid = high,
            auction_min_next_bid = high + (product.auction_step > 0 ? product.auction_step : 500),
            auction_leader_id = leader?.bidder_id,
            auction_leader_name = leader?.leader_name,
            auction_bids_count = bidsCount
        });
    }

    [HttpPost("{id}/images")]
    public async Task<IActionResult> UploadImages(int id, [FromForm] IFormFileCollection images, [FromForm] int seller_id, [FromForm] int? actor_id)
    {
        actor_id ??= seller_id;
        if (id <= 0) return BadRequest(new { error = "Некорректный id объявления" });
        if (seller_id <= 0) return BadRequest(new { error = "Укажите seller_id" });
        if (images == null || images.Count == 0) return BadRequest(new { error = "Файлы не загружены" });

        var pUrl = await _db.QueryFirstOrDefaultAsync<string>("SELECT images FROM products WHERE id = @id", new { id });
        if (pUrl == null) return NotFound(new { error = "Not found" });
        
        var own = await _db.QueryFirstOrDefaultAsync<int>("SELECT id FROM products WHERE id = @id AND seller_id = @seller_id", new { id, seller_id });
        bool adminAllowed = IsAdminUser(actor_id);
        if (own == 0 && !adminAllowed) return StatusCode(403, new { error = "Нельзя добавлять фото в чужое объявление" });

        List<string> existing = new();
        try { existing = JsonSerializer.Deserialize<List<string>>(pUrl) ?? new(); } catch { }

        var uploadsDir = Path.Combine(_env.ContentRootPath, "uploads");
        if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);

        var newUrls = new List<string>();
        var allowedExt = new[] { ".jpg", ".jpeg", ".png", ".gif", ".mp4", ".mov" };
        
        foreach (var file in images)
        {
            var ext = Path.GetExtension(file.FileName).ToLower();
            if (!allowedExt.Contains(ext))
            {
                return BadRequest(new { error = $"Формат {ext} не поддерживается. Разрешены только: jpg, png, gif, mp4, mov" });
            }

            var fileName = $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{System.Text.RegularExpressions.Regex.Replace(file.FileName, "[^a-zA-Z0-9.]", "_")}";
            var path = Path.Combine(uploadsDir, fileName);
            using (var stream = new FileStream(path, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }
            newUrls.Add($"/uploads/{fileName}");
        }

        existing.AddRange(newUrls);
        await _db.ExecuteAsync("UPDATE products SET images = @imgs WHERE id = @id", new { imgs = JsonSerializer.Serialize(existing), id });
        
        return Ok(new { success = true, images = existing });
    }

    public class DeleteImageRequest
    {
        public int seller_id { get; set; }
        public int? actor_id { get; set; }
        public string image_url { get; set; } = "";
    }

    [HttpDelete("{id}/images")]
    public async Task<IActionResult> DeleteImage(int id, [FromBody] DeleteImageRequest req)
    {
        int sellerId = req.seller_id;
        int actorId = req.actor_id ?? sellerId;
        string imageUrl = (req.image_url ?? "").Trim();
        
        if (id <= 0) return BadRequest(new { error = "Некорректный id объявления" });
        if (sellerId <= 0) return BadRequest(new { error = "Укажите seller_id" });
        if (string.IsNullOrEmpty(imageUrl)) return BadRequest(new { error = "Укажите image_url" });

        var own = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT id, images FROM products WHERE id = @id AND seller_id = @sellerId", new { id, sellerId });
        bool adminAllowed = IsAdminUser(actorId);
        
        dynamic? product = own;
        if (product == null && adminAllowed)
            product = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT id, images FROM products WHERE id = @id", new { id });
            
        if (product == null) return StatusCode(403, new { error = "Нельзя удалять фото из чужого объявления" });

        List<string> images = new();
        try { images = JsonSerializer.Deserialize<List<string>>((string)product.images) ?? new(); } catch { }
        
        var updated = images.Where(img => img != imageUrl).ToList();
        if (updated.Count == images.Count) return NotFound(new { error = "Фото не найдено в объявлении" });
        
        await _db.ExecuteAsync("UPDATE products SET images = @imgs WHERE id = @id", new { imgs = JsonSerializer.Serialize(updated), id });

        if (imageUrl.StartsWith("/uploads/"))
        {
            var localName = imageUrl.Replace("/uploads/", "");
            var filePath = Path.Combine(_env.ContentRootPath, "uploads", localName);
            if (System.IO.File.Exists(filePath))
            {
                try { System.IO.File.Delete(filePath); } catch { }
            }
        }

        return Ok(new { success = true, images = updated });
    }

    [HttpPost("{id}/like")]
    public async Task<IActionResult> LikeProduct(int id)
    {
        await _db.ExecuteAsync("UPDATE products SET likes = likes + 1 WHERE id = @id", new { id });
        var likes = await _db.QueryFirstOrDefaultAsync<int>("SELECT likes FROM products WHERE id = @id", new { id });
        return Ok(new { likes });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProduct(int id, [FromQuery] int? seller_id, [FromQuery] int? actor_id, [FromBody] JsonElement? body)
    {
        int sellerId = seller_id ?? (body.HasValue && body.Value.TryGetProperty("seller_id", out var js) ? js.GetInt32() : 0);
        int actorId = actor_id ?? (body.HasValue && body.Value.TryGetProperty("actor_id", out var ja) ? ja.GetInt32() : sellerId);
        
        if (id <= 0) return BadRequest(new { error = "Некорректный id объявления" });
        if (sellerId <= 0) return BadRequest(new { error = "Укажите seller_id" });

        var own = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT id, seller_id, title, images FROM products WHERE id = @id AND seller_id = @sellerId", new { id, sellerId });
        bool adminAllowed = IsAdminUser(actorId);
        dynamic? product = own;
        if (product == null && adminAllowed)
            product = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT id, seller_id, title, images FROM products WHERE id = @id", new { id });
            
        if (product == null) return StatusCode(403, new { error = "Нельзя удалить чужое объявление" });

        List<string> images = new();
        try { images = JsonSerializer.Deserialize<List<string>>((string)product.images) ?? new(); } catch { }
        foreach (var img in images)
        {
            if (img.StartsWith("/uploads/"))
            {
                var filePath = Path.Combine(_env.ContentRootPath, "uploads", img.Replace("/uploads/", ""));
                if (System.IO.File.Exists(filePath))
                {
                    try { System.IO.File.Delete(filePath); } catch { }
                }
            }
        }

        var convs = await _db.QueryAsync<int>("SELECT id FROM conversations WHERE product_id = @id", new { id });
        foreach (var cid in convs)
        {
            await _db.ExecuteAsync("DELETE FROM messages WHERE conversation_id = @cid", new { cid });
        }
        await _db.ExecuteAsync("DELETE FROM conversations WHERE product_id = @id", new { id });
        await _db.ExecuteAsync("DELETE FROM favorites WHERE product_id = @id", new { id });
        await _db.ExecuteAsync("DELETE FROM auction_bids WHERE product_id = @id", new { id });
        await _db.ExecuteAsync("DELETE FROM reviews WHERE product_id = @id", new { id });
        await _db.ExecuteAsync("DELETE FROM orders WHERE product_id = @id", new { id });

        string titleLike = $"%{(string)product.title}%";
        await _db.ExecuteAsync("DELETE FROM notifications WHERE user_id = @seller_id AND type IN ('auction', 'sale', 'review') AND text LIKE @titleLike", new { seller_id = (int)product.seller_id, titleLike });

        await _db.ExecuteAsync("DELETE FROM products WHERE id = @id", new { id });
        return Ok(new { success = true, hard_deleted = true });
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> UpdateProduct(int id, [FromBody] JsonElement body)
    {
        int sellerId = 0;
        if (body.TryGetProperty("seller_id", out var sid))
            sellerId = sid.ValueKind == System.Text.Json.JsonValueKind.String ? int.Parse(sid.GetString()!) : sid.GetInt32();
        int actorId = sellerId;
        if (body.TryGetProperty("actor_id", out var aid))
            actorId = aid.ValueKind == System.Text.Json.JsonValueKind.String ? int.Parse(aid.GetString()!) : aid.GetInt32();

        if (id <= 0) return BadRequest(new { error = "Некорректный id объявления" });
        if (sellerId <= 0) return BadRequest(new { error = "Укажите seller_id" });

        var own = await _db.QueryFirstOrDefaultAsync<int>("SELECT id FROM products WHERE id = @id AND seller_id = @sellerId", new { id, sellerId });
        bool adminAllowed = IsAdminUser(actorId);
        if (own == 0 && !adminAllowed) return StatusCode(403, new { error = "Нельзя редактировать чужое объявление" });

        var updates = new List<string>();
        var prm = new DynamicParameters();
        prm.Add("id", id);

        if (body.TryGetProperty("title", out var title)) { updates.Add("title = @title"); prm.Add("title", title.GetString()?.Trim()); }
        if (body.TryGetProperty("description", out var desc)) { updates.Add("description = @desc"); prm.Add("desc", desc.GetString()?.Trim()); }
        if (body.TryGetProperty("category_id", out var c_id)) { updates.Add("category_id = @c_id"); prm.Add("c_id", c_id.GetString()); }
        if (body.TryGetProperty("price", out var price)) 
        { 
            int p = price.GetInt32();
            if (p < 1) return BadRequest(new { error = "Некорректная цена" });
            updates.Add("price = @price"); prm.Add("price", p); 
        }
        if (body.TryGetProperty("city", out var city)) { updates.Add("city = @city"); prm.Add("city", city.GetString()?.Trim()); }
        if (body.TryGetProperty("condition", out var cond)) { updates.Add("condition = @cond"); prm.Add("cond", cond.GetString()?.Trim()); }
        if (body.TryGetProperty("details", out var details)) { updates.Add("details = @details"); prm.Add("details", JsonSerializer.Serialize(details)); }

        if (updates.Count == 0) return BadRequest(new { error = "Нет данных для обновления" });

        string sql = $"UPDATE products SET {string.Join(", ", updates)} WHERE id = @id";
        await _db.ExecuteAsync(sql, prm);
        return Ok(new { success = true });
    }

    [HttpGet("{id}/availability")]
    public async Task<IActionResult> GetAvailability(int id, [FromQuery] string date)
    {
        if (string.IsNullOrEmpty(date)) return BadRequest(new { error = "Укажите дату" });
        var orders = await _db.QueryAsync<dynamic>("SELECT appointment_time, COUNT(*) as count FROM orders WHERE product_id = @id AND appointment_date = @date GROUP BY appointment_time", new { id, date });
        var fullSlots = orders.Where(o => (long)o.count >= 3).Select(o => (string)o.appointment_time).ToList();
        return Ok(new { full_slots = fullSlots });
    }

    [HttpGet("{id}/reviews")]
    public async Task<IActionResult> GetReviews(int id)
    {
        var reviews = await _db.QueryAsync<dynamic>(@"
            SELECT r.*, u.username as reviewer_name
            FROM reviews r JOIN users u ON r.reviewer_id = u.id
            WHERE r.product_id = @id ORDER BY r.created_at DESC", new { id });
        return Ok(reviews);
    }
}
