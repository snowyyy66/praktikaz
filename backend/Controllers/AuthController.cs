using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly DbService _db;

    public AuthController(DbService db)
    {
        _db = db;
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
        var check = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT id FROM users WHERE email = @email OR username = @username", new { req.email, req.username });
        if (check != null) return BadRequest(new { error = "Пользователь с такой почтой или именем уже существует" });

        var hash = BCrypt.Net.BCrypt.HashPassword(req.password);
        await _db.ExecuteAsync("INSERT INTO users (username, email, password, is_admin) VALUES (@username, @email, @hash, 0)", new { req.username, req.email, hash });
        
        var user = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT id, is_admin FROM users WHERE email = @email", new { req.email });
        return Ok(new { success = true, user_id = user?.id, is_admin = Convert.ToInt32(user?.is_admin) == 1 });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AuthRequest req)
    {
        var user = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT id, password, is_admin FROM users WHERE email = @email", new { req.email });
        if (user == null) return Unauthorized(new { error = "Неверная почта или пароль" });

        bool isValid = false;
        string pwd = (string)user.password;
        if (pwd.StartsWith("$2"))
        {
            isValid = BCrypt.Net.BCrypt.Verify(req.password, pwd);
        }
        else
        {
            isValid = pwd == req.password;
        }

        if (!isValid) return Unauthorized(new { error = "Неверная почта или пароль" });
        
        return Ok(new { success = true, user_id = user.id, is_admin = Convert.ToInt32(user.is_admin) == 1 });
    }
}
