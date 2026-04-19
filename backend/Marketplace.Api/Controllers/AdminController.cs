using Marketplace.Application.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace Marketplace.Api.Controllers;

// Действия администратора (например, полный список объявлений).
[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _admin;

    public AdminController(IAdminService admin) => _admin = admin;

    [HttpGet("products")]
    public async Task<IActionResult> Products([FromQuery] int user_id, CancellationToken ct) =>
        Ok(await _admin.GetAllProductsAsync(user_id, ct));
}
