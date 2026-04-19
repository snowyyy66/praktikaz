using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly IProductService _productService;

    public AdminController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpGet("products")]
    public async Task<IActionResult> GetAdminProducts(
        [FromQuery] long user_id,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 24)
    {
        var result = await _productService.GetProductsAsync(null, null, null, null, page, limit, null);
        return Ok(result);
    }
}
