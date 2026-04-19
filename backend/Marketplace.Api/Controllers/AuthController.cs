using Marketplace.Application.Abstractions;
using Marketplace.Application.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace Marketplace.Api.Controllers;

// Регистрация и вход в систему (без JWT в этом проекте — id пользователя на клиенте).
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("register")]
    public async Task<ActionResult<object>> Register([FromBody] RegisterDto dto, CancellationToken ct)
    {
        var r = await _auth.RegisterAsync(dto, ct);
        if (!r.Success) return BadRequest(new { error = r.Error });
        return Ok(new { success = true, user_id = r.UserId, is_admin = r.IsAdmin });
    }

    [HttpPost("login")]
    public async Task<ActionResult<object>> Login([FromBody] LoginDto dto, CancellationToken ct)
    {
        var r = await _auth.LoginAsync(dto, ct);
        if (!r.Success) return Unauthorized(new { error = r.Error });
        return Ok(new { success = true, user_id = r.UserId, is_admin = r.IsAdmin });
    }
}
