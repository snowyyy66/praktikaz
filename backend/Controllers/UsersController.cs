using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IWebHostEnvironment _env;

    public UsersController(IUserService userService, IWebHostEnvironment env)
    {
        _userService = userService;
        _env = env;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(long id)
    {
        var user = await _userService.GetUserAsync(id);
        if (user == null) return NotFound(new { error = "Not found" });
        return Ok(user);
    }

    [HttpPost("{id}/avatar")]
    public async Task<IActionResult> UploadAvatar(long id, [FromForm] IFormFile avatar)
    {
        if (avatar == null) return BadRequest(new { error = "Файл не загружен" });
        var url = await _userService.UploadAvatarAsync(id, avatar, _env.ContentRootPath);
        return Ok(new { success = true, avatar = url });
    }

    public class UpdateUserRequest
    {
        public string username { get; set; } = "";
        public string? phone { get; set; }
        public string? city { get; set; }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(long id, [FromBody] UpdateUserRequest req)
    {
        await _userService.UpdateUserAsync(id, req.username, req.phone, req.city);
        return Ok(new { success = true });
    }

    [HttpGet("{id}/products")]
    public async Task<IActionResult> GetUserProducts(long id, [FromQuery] int page = 1, [FromQuery] int limit = 24)
    {
        var result = await _userService.GetProductsAsync(id, page, limit);
        return Ok(result);
    }

    [HttpGet("{id}/stats")]
    public async Task<IActionResult> GetUserStats(long id)
    {
        var stats = await _userService.GetStatsAsync(id);
        return Ok(stats);
    }

    [HttpGet("{id}/favorites")]
    public async Task<IActionResult> GetUserFavorites(long id)
    {
        var favs = await _userService.GetFavoritesAsync(id);
        return Ok(favs);
    }

    [HttpGet("{id}/orders")]
    public async Task<IActionResult> GetUserOrders(long id)
    {
        var orders = await _userService.GetOrdersAsync(id);
        return Ok(orders);
    }

    [HttpGet("{id}/notifications")]
    public async Task<IActionResult> GetNotifications(long id)
    {
        var notifs = await _userService.GetNotificationsAsync(id);
        return Ok(notifs);
    }

    [HttpPut("{id}/notifications/read-all")]
    public async Task<IActionResult> MarkAllNotificationsRead(long id)
    {
        await _userService.MarkAllNotificationsReadAsync(id);
        return Ok(new { success = true });
    }
}
