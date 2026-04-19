using Marketplace.Application.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace Marketplace.Api.Controllers;

// Переключение «в избранном» и список избранных товаров пользователя.
[ApiController]
[Route("api/[controller]")]
public class FavoritesController : ControllerBase
{
    private readonly IFavoriteService _f;

    public FavoritesController(IFavoriteService f) => _f = f;

    public class ToggleBody
    {
        public int UserId { get; set; }
        public int ProductId { get; set; }
    }

    [HttpPost]
    public async Task<IActionResult> Toggle([FromBody] ToggleBody body, CancellationToken ct)
    {
        var r = await _f.ToggleAsync(body.UserId, body.ProductId, ct);
        return Ok(new { success = r.Success, favorited = r.Favorited });
    }
}
