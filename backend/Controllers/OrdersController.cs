using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly DbService _db;

    public OrdersController(DbService db)
    {
        _db = db;
    }

    public class CreateOrderRequest
    {
        public int buyer_id { get; set; }
        public int product_id { get; set; }
        public int? rent_hours { get; set; }
        public string? appointment_date { get; set; }
        public string? appointment_time { get; set; }
        public string? address_street { get; set; }
        public string? address_house { get; set; }
        public string? house_type { get; set; }
        public string? address_entrance { get; set; }
        public string? address_floor { get; set; }
        public string? address_apartment { get; set; }
    }

    private long SqlDateToMs(string? dateStr)
    {
        if (string.IsNullOrEmpty(dateStr)) return 0;
        if (!dateStr.Contains("T")) dateStr = dateStr.Replace(" ", "T");
        if (DateTime.TryParse(dateStr, out var result))
            return new DateTimeOffset(result).ToUnixTimeMilliseconds();
        return 0;
    }

    private async Task<long> GetAuctionHigh(long productId)
    {
        return await _db.QueryFirstOrDefaultAsync<long>("SELECT COALESCE(MAX(amount), 0) FROM auction_bids WHERE product_id = @productId", new { productId });
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest req)
    {
        if (req.buyer_id <= 0 || req.product_id <= 0) return BadRequest(new { error = "Некорректные параметры заказа" });

        var product = await _db.QueryFirstOrDefaultAsync<Product>("SELECT * FROM products WHERE id = @id AND is_active = 1", new { id = req.product_id });
        if (product == null) return NotFound(new { error = "Товар не найден" });
        if (product.seller_id == req.buyer_id) return BadRequest(new { error = "Нельзя купить собственный товар" });

        if (product.category_id == "services" && !string.IsNullOrEmpty(req.appointment_date) && !string.IsNullOrEmpty(req.appointment_time))
        {
            var existing = await _db.QueryFirstOrDefaultAsync<int>(@"
                SELECT COUNT(*) FROM orders 
                WHERE product_id = @pid AND appointment_date = @ad AND appointment_time = @at", 
                new { pid = req.product_id, ad = req.appointment_date, at = req.appointment_time });
            
            if (existing >= 3) return BadRequest(new { error = "Это время уже полностью забронировано (макс. 3 мастера)" });
        }

        long total = product.price;
        int? rentHoursSaved = null;

        if (product.category_id == "rent")
        {
            long minH = 1, maxH = 168;
            try {
                var d = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(product.details);
                if (d != null && d.ContainsKey("min_hours")) long.TryParse(d["min_hours"], out minH);
                if (d != null && d.ContainsKey("max_hours")) long.TryParse(d["max_hours"], out maxH);
            } catch {}
            
            minH = Math.Max(1, minH);
            maxH = Math.Max(minH, maxH);
            int hrs = req.rent_hours ?? 0;
            
            if (hrs <= 0) return BadRequest(new { error = "Укажите срок аренды" });
            if (hrs < minH || hrs > maxH) return BadRequest(new { error = $"Срок аренды: от {minH} до {maxH} ч." });
            
            total = product.price * hrs;
            rentHoursSaved = hrs;
        }

        if ((product.sale_type ?? "fixed") == "auction")
        {
            long high = await GetAuctionHigh(req.product_id);
            var leader = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT bidder_id FROM auction_bids WHERE product_id = @pid AND amount = @high ORDER BY created_at DESC, id DESC LIMIT 1", new { pid = req.product_id, high });
            if (leader == null || (int)leader.bidder_id != req.buyer_id) return StatusCode(403, new { error = "Только победитель может оформить заказ" });
            total = high;
        }

        try {
            await _db.ExecuteAsync(@"
              INSERT INTO orders (
                buyer_id, seller_id, product_id, total, status, rent_hours,
                appointment_date, appointment_time, address_street, address_house, 
                house_type, address_entrance, address_floor, address_apartment
              ) VALUES (
                @buyer_id, @seller_id, @product_id, @total, 'completed', @rent_hours,
                @appointment_date, @appointment_time, @address_street, @address_house, 
                @house_type, @address_entrance, @address_floor, @address_apartment
              )", new {
                  req.buyer_id, seller_id = product.seller_id, req.product_id, total, rent_hours = rentHoursSaved,
                  req.appointment_date, req.appointment_time, 
                  address_street = req.address_street ?? "", address_house = req.address_house ?? "",
                  house_type = req.house_type ?? "apartment", address_entrance = req.address_entrance ?? "",
                  address_floor = req.address_floor ?? "", address_apartment = req.address_apartment ?? ""
              });

            var catId = product.category_id?.ToLower() ?? "";
            if (catId != "rent" && catId != "services")
            {
                await _db.ExecuteAsync("UPDATE products SET is_active = 0 WHERE id = @id", new { id = req.product_id });
            }

            await _db.ExecuteAsync("UPDATE users SET total_sales = total_sales + 1, total_earnings = total_earnings + @total WHERE id = @id", new { total, id = product.seller_id });

            string saleText = product.category_id == "rent"
                ? $"Аренда «{product.title}»: {rentHoursSaved} ч. — {total.ToString("N0", new System.Globalization.CultureInfo("ru-RU"))} ₽"
                : $"Новый заказ на \"{product.title}\" ({total.ToString("N0", new System.Globalization.CultureInfo("ru-RU"))} ₽)";

            await _db.ExecuteAsync("INSERT INTO notifications (user_id, type, text, related_user_id, related_product_id) VALUES (@id, 'sale', @txt, @buyer_id, @pid)", new { id = product.seller_id, txt = saleText, buyer_id = req.buyer_id, pid = req.product_id });

            return Ok(new { success = true });
        } catch (Exception ex) {
            return StatusCode(500, new { error = "Ошибка базы данных при оформлении: " + ex.Message });
        }
    }
}
