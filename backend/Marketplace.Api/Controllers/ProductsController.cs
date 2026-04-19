using Marketplace.Api;
using Marketplace.Application.Abstractions;
using Marketplace.Application.Common;
using Marketplace.Application.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace Marketplace.Api.Controllers;

// Товары: список/карточка/CRUD, фото (multipart), ставки, отзывы вложены маршрутом GET .../reviews
[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _products;
    private readonly MarketplacePaths _paths;

    public ProductsController(IProductService products, MarketplacePaths paths)
    {
        _products = products;
        _paths = paths;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] ProductListQuery q, CancellationToken ct)
    {
        var p = new ProductListParameters
        {
            Page = q.Page ?? 1,
            Limit = q.Limit ?? 24,
            Category = q.Category,
            Sort = q.Sort,
            Search = q.Search,
            Auction = q.Auction,
            City = q.City,
            UserIdForFavorite = q.UserId,
            ActiveOnly = true,
        };
        return Ok(await _products.GetProductsAsync(p, ct));
    }

    /// <summary>Список объявлений текущего продавца (пагинация, сортировка).</summary>
    [HttpGet("my")]
    public async Task<IActionResult> My([FromQuery] ProductListQuery q, [FromQuery] int seller_id, CancellationToken ct)
    {
        var p = new ProductListParameters
        {
            Page = q.Page ?? 1,
            Limit = q.Limit ?? 24,
            Category = q.Category,
            Sort = q.Sort,
            Search = q.Search,
            Auction = q.Auction,
            City = q.City,
            UserIdForFavorite = q.UserId,
            SellerId = seller_id,
            ActiveOnly = false,
        };
        return Ok(await _products.GetProductsAsync(p, ct));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, [FromQuery] int? user_id, CancellationToken ct)
    {
        var x = await _products.GetByIdAsync(id, user_id, ct);
        if (x == null) return NotFound(new { error = "Not found" });
        return Ok(x);
    }

    [HttpPost("{id:int}/views")]
    public async Task<IActionResult> Views(int id, CancellationToken ct)
    {
        await _products.IncrementViewsAsync(id, ct);
        return Ok(new { success = true });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductDto dto, CancellationToken ct)
    {
        var r = await _products.CreateAsync(dto, ct);
        return Ok(new { success = true, id = r.Id });
    }

    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Patch(int id, [FromBody] PatchProductDto dto, CancellationToken ct)
    {
        await _products.UpdateAsync(id, dto, ct);
        return Ok(new { success = true });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, [FromQuery] int seller_id, [FromQuery] int? actor_id, CancellationToken ct)
    {
        await _products.DeleteAsync(id, seller_id, actor_id ?? seller_id, ct);
        return Ok(new { success = true, hard_deleted = true });
    }

    [HttpGet("{id:int}/bids")]
    public async Task<IActionResult> Bids(int id, CancellationToken ct) =>
        Ok(await _products.GetBidsAsync(id, ct));

    [HttpPost("{id:int}/bids")]
    public async Task<IActionResult> PlaceBid(int id, [FromBody] PlaceBidDto dto, CancellationToken ct)
    {
        var r = await _products.PlaceBidAsync(id, dto, ct);
        return Ok(new
        {
            success = true,
            auction_high_bid = r.AuctionHighBid,
            auction_min_next_bid = r.AuctionMinNextBid,
            auction_leader_id = r.AuctionLeaderId,
            auction_leader_name = r.AuctionLeaderName,
            auction_bids_count = r.AuctionBidsCount,
        });
    }

    [HttpPost("{id:int}/images")]
    public async Task<IActionResult> UploadImages(int id, CancellationToken ct)
    {
        var sellerId = int.Parse(Request.Form["seller_id"]);
        var actorId = Request.Form.ContainsKey("actor_id") ? int.Parse(Request.Form["actor_id"]) : sellerId;
        var files = Request.Form.Files.Where(f => f.Name == "images").ToList();
        if (files.Count == 0) return BadRequest(new { error = "Файлы не загружены" });

        var urls = new List<string>();
        var uploads = _paths.UploadsDirectory;
        Directory.CreateDirectory(uploads);
        foreach (var file in files)
        {
            var safe = $"{DateTime.UtcNow.Ticks}-{Path.GetFileName(file.FileName).Replace(Path.DirectorySeparatorChar, '_')}";
            var path = Path.Combine(uploads, safe);
            await using (var fs = System.IO.File.Create(path))
                await file.CopyToAsync(fs, ct);
            urls.Add($"/uploads/{safe}");
        }

        await _products.AddImagesAsync(id, sellerId, actorId, urls, ct);
        var product = await _products.GetByIdAsync(id, null, ct);
        return Ok(new { success = true, images = product?.Images });
    }

    [HttpDelete("{id:int}/images")]
    public async Task<IActionResult> DeleteImage(int id, [FromBody] DeleteImageBody body, CancellationToken ct)
    {
        var imgs = await _products.RemoveImageAsync(id, body.SellerId, body.ActorId ?? body.SellerId, body.ImageUrl, ct);
        return Ok(new { success = true, images = imgs });
    }

    [HttpPost("{id:int}/like")]
    public async Task<IActionResult> Like(int id, CancellationToken ct)
    {
        await _products.IncrementLikesAsync(id, ct);
        var p = await _products.GetByIdAsync(id, null, ct);
        return Ok(new { likes = p?.Likes ?? 0 });
    }

    [HttpGet("{id:int}/availability")]
    public async Task<IActionResult> Availability(int id, [FromQuery] string date, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(date)) return BadRequest(new { error = "Укажите дату" });
        var r = await _products.GetAvailabilityAsync(id, date, ct);
        return Ok(new { full_slots = r.FullSlots });
    }

    [HttpGet("{id:int}/reviews")]
    public async Task<IActionResult> Reviews(int id, [FromServices] IReviewService reviews, CancellationToken ct) =>
        Ok(await reviews.GetForProductAsync(id, ct));

    public class DeleteImageBody
    {
        public string ImageUrl { get; set; } = "";
        public int SellerId { get; set; }
        public int? ActorId { get; set; }
    }

    public class ProductListQuery
    {
        public int? Page { get; set; }
        public int? Limit { get; set; }
        public string? Category { get; set; }
        public string? Sort { get; set; }
        public string? Search { get; set; }
        public string? Auction { get; set; }
        public string? City { get; set; }
        public int? UserId { get; set; }
    }
}
