namespace Marketplace.Application.Dtos;

public class RegisterDto
{
    public string Username { get; set; } = "";
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}

public class LoginDto
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}

public class AuthResultDto
{
    public bool Success { get; set; }
    public int UserId { get; set; }
    public bool IsAdmin { get; set; }
    public string? Error { get; set; }
}
