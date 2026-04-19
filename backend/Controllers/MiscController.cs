using Backend.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api")]
public class MiscController : ControllerBase
{
    private readonly IFavoriteRepository _favoriteRepository;
    private readonly IUserRepository _userRepository;

    public MiscController(IFavoriteRepository favoriteRepository, IUserRepository userRepository)
    {
        _favoriteRepository = favoriteRepository;
        _userRepository = userRepository;
    }

    public class FavoriteRequest
    {
        public long user_id { get; set; }
        public long product_id { get; set; }
    }

    [HttpPost("favorites")]
    [HttpPost("favorites/toggle")]
    public async Task<IActionResult> ToggleFavorite([FromBody] FavoriteRequest req)
    {
        if (req.user_id <= 0 || req.product_id <= 0)
            return BadRequest(new { error = "Некорректные данные" });

        var added = await _favoriteRepository.ToggleAsync(req.user_id, req.product_id);
        return Ok(new { favorited = added });
    }

    [HttpPut("notifications/{id}/read")]
    public async Task<IActionResult> MarkNotificationRead(long id)
    {
        await _userRepository.MarkNotificationReadAsync(id);
        return Ok(new { success = true });
    }
}
