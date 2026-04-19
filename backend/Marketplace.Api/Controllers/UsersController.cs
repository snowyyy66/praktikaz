using Marketplace.Api;
using Marketplace.Application.Abstractions;
using Marketplace.Application.Common;
using Marketplace.Application.Dtos;
using Marketplace.Core.Enums;
using Microsoft.AspNetCore.Mvc;

namespace Marketplace.Api.Controllers;

// Профиль, правки контактов, отзывы о пользователе, товары и заказы по user id.
[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserService _users;
    private readonly IProductService _products;
    private readonly IOrderService _orders;
    private readonly MarketplacePaths _paths;

    public UsersController(IUserService users, IProductService products, IOrderService orders, MarketplacePaths paths)
    {
        _users = users;
        _products = products;
        _orders = orders;
        _paths = paths;
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken ct)
    {
        var u = await _users.GetProfileAsync(id, ct);
        if (u == null) return NotFound(new { error = "Not found" });
        return Ok(u);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Put(int id, [FromBody] UpdateUserDto dto, CancellationToken ct)
    {
        await _users.UpdateProfileAsync(id, dto, ct);
        return Ok(new { success = true });
    }

    [HttpPost("{id:int}/avatar")]
    public async Task<IActionResult> Avatar(int id, CancellationToken ct)
    {
        var f = Request.Form.Files.GetFile("avatar");
        if (f == null || f.Length == 0) return BadRequest(new { error = "Файл не загружен" });

        var uploads = _paths.UploadsDirectory;
        Directory.CreateDirectory(uploads);
        var safe = $"{DateTime.UtcNow.Ticks}-{Path.GetFileName(f.FileName)}";
        var path = Path.Combine(uploads, safe);
        await using (var fs = System.IO.File.Create(path))
            await f.CopyToAsync(fs, ct);

        var url = $"/uploads/{safe}";
        await _users.SetAvatarUrlAsync(id, url, ct);
        return Ok(new { success = true, avatar = url });
    }

    /// <summary>Активные объявления продавца (пагинация).</summary>
    [HttpGet("{id:int}/products")]
    public async Task<IActionResult> SellerProducts(int id, [FromQuery] int page = 1, [FromQuery] int limit = 24, [FromQuery] string? sort = null, CancellationToken ct = default)
    {
        var p = new ProductListParameters
        {
            SellerId = id,
            Page = page,
            Limit = limit,
            Sort = sort,
            ActiveOnly = true,
        };
        return Ok(await _products.GetProductsAsync(p, ct));
    }

    /// <summary>Статистика с фильтром по датам и товарам (?from=&to=&product_ids=1,2).</summary>
    [HttpGet("{id:int}/stats")]
    public async Task<IActionResult> Stats(int id, [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string? product_ids, CancellationToken ct)
    {
        int[]? ids = null;
        if (!string.IsNullOrWhiteSpace(product_ids))
        {
            ids = product_ids.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.Parse(s)).ToArray();
        }

        var q = new SellerStatsQueryDto { From = from, To = to, ProductIds = ids };
        return Ok(await _users.GetStatsAsync(id, q, ct));
    }

    [HttpGet("{id:int}/favorites")]
    public async Task<IActionResult> Favorites(int id, [FromServices] IFavoriteService fav, CancellationToken ct) =>
        Ok(await fav.GetUserFavoritesAsync(id, ct));

    /// <summary>Заказы пользователя (совместимо с текущим фронтом: можно запросить все записи большим limit).</summary>
    [HttpGet("{id:int}/orders")]
    public async Task<IActionResult> UserOrders(int id, [FromQuery] int page = 1, [FromQuery] int limit = 500, [FromQuery] string? status = null, [FromQuery] string? sort = null, CancellationToken ct = default)
    {
        var p = new OrderListParameters
        {
            UserId = id,
            Page = page,
            Limit = limit,
            Sort = sort,
            Status = status?.ToLowerInvariant() switch
            {
                "created" => OrderStatus.Created,
                "completed" => OrderStatus.Completed,
                _ => null,
            },
        };
        return Ok(await _orders.GetForUserAsync(p, ct));
    }

    [HttpGet("{id:int}/notifications")]
    public async Task<IActionResult> Notifications(int id, [FromServices] INotificationService n, CancellationToken ct) =>
        Ok(await n.GetForUserAsync(id, ct));

    [HttpPut("{id:int}/notifications/read-all")]
    public async Task<IActionResult> NotificationsReadAll(int id, [FromServices] INotificationService n, CancellationToken ct)
    {
        await n.MarkAllReadAsync(id, ct);
        return Ok(new { success = true });
    }
}
