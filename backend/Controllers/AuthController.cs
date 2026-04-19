using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    public class AuthRequest
    {
        public string username { get; set; } = "";
        public string email { get; set; } = "";
        public string password { get; set; } = "";
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] AuthRequest req)
    {
        var (userId, isAdmin) = await _authService.RegisterAsync(req.username, req.email, req.password);
        return Ok(new { success = true, user_id = userId, is_admin = isAdmin });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AuthRequest req)
    {
        var (userId, isAdmin) = await _authService.LoginAsync(req.email, req.password);
        return Ok(new { success = true, user_id = userId, is_admin = isAdmin });
    }
}
