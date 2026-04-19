using System.Text.Json;
using Backend.Models.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;
    private readonly IWebHostEnvironment _env;

    public ProductsController(IProductService productService, IWebHostEnvironment env)
    {
        _productService = productService;
        _env = env;
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts(
        [FromQuery] string? category, 
        [FromQuery] string? sort, 
        [FromQuery] string? search, 
        [FromQuery] string? city, 
        [FromQuery] string? auction,
        [FromQuery] long? user_id,
        [FromQuery] int page = 1, 
        [FromQuery] int limit = 24)
    {
        var result = await _productService.GetProductsAsync(category, search, city, sort, page, limit, user_id, false, auction == "1");
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProduct(long id, [FromQuery] long? user_id)
    {
        var product = await _productService.GetProductByIdAsync(id, user_id);
        if (product == null) return NotFound(new { error = "Not found" });
        return Ok(product);
    }

    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.title))
            return BadRequest(new { error = "Title is required" });

        var id = await _productService.CreateProductAsync(dto);
        return StatusCode(201, new { success = true, id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProduct(long id, [FromBody] CreateProductDto dto)
    {
        await _productService.UpdateProductAsync(id, dto);
        return Ok(new { success = true });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProduct(long id)
    {
        await _productService.DeleteProductAsync(id);
        return Ok(new { success = true });
    }

    [HttpPost("{id}/images")]
    public async Task<IActionResult> UploadImages(long id, [FromForm] IFormFileCollection images)
    {
        var uploadsDir = Path.Combine(_env.ContentRootPath, "uploads", "products");
        Directory.CreateDirectory(uploadsDir);

        var saved = new List<string>();
        foreach (var file in images)
        {
            if (file.Length == 0) continue;
            var ext = Path.GetExtension(file.FileName);
            var name = $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}{ext}";
            var path = Path.Combine(uploadsDir, name);
            await using var stream = System.IO.File.Create(path);
            await file.CopyToAsync(stream);
            saved.Add($"/uploads/products/{name}");
        }

        await _productService.AppendImagesAsync(id, saved);
        return Ok(new { images = saved });
    }

    [HttpDelete("{id}/images")]
    public async Task<IActionResult> DeleteImage(long id, [FromBody] JsonElement req)
    {
        var imageUrl = req.GetProperty("image_url").GetString() ?? "";
        await _productService.RemoveImageAsync(id, imageUrl);

        var filePath = Path.Combine(_env.ContentRootPath, imageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (System.IO.File.Exists(filePath))
            System.IO.File.Delete(filePath);

        return Ok(new { success = true });
    }

    [HttpPost("{id}/views")]
    public async Task<IActionResult> IncrementViews(long id, [FromQuery] long? user_id)
    {
        await _productService.IncrementViewsAsync(id, user_id);
        return Ok(new { success = true });
    }

    [HttpPost("{id}/like")]
    public async Task<IActionResult> LikeProduct(long id)
    {
        await _productService.LikeProductAsync(id);
        return Ok(new { success = true });
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyProducts(
        [FromQuery] long user_id,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 24)
    {
        if (user_id <= 0) return BadRequest(new { error = "Укажите user_id" });
        var result = await _productService.GetProductsAsync(null, null, null, null, page, limit, user_id,  sellerOnly: true);
        return Ok(result);
    }

    [HttpGet("{id}/bids")]
    public async Task<IActionResult> GetBids(long id)
    {
        var bids = await _productService.GetBidsAsync(id);
        return Ok(bids);
    }

    [HttpPost("{id}/bids")]
    public async Task<IActionResult> PlaceBid(long id, [FromBody] JsonElement req)
    {
        long bidderId = req.GetProperty("bidder_id").GetInt64();
        long amount = req.GetProperty("amount").GetInt64();
        await _productService.PlaceBidAsync(id, bidderId, amount);
        return Ok(new { success = true });
    }
}
