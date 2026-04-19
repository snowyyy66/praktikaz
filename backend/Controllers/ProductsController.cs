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

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts(
        [FromQuery] string? category, 
        [FromQuery] string? sort, 
        [FromQuery] string? search, 
        [FromQuery] string? city, 
        [FromQuery] long? user_id,
        [FromQuery] int page = 1, 
        [FromQuery] int limit = 24)
    {
        var result = await _productService.GetProductsAsync(category, search, city, sort, page, limit, user_id);
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
        return Ok(new { success = true, id });
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
