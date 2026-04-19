using Backend.Models.Entities;
using Backend.Repositories;

namespace Backend.Services;

public interface IAuthService
{
    Task<(long userId, bool isAdmin)> RegisterAsync(string username, string email, string password);
    Task<(long userId, bool isAdmin)> LoginAsync(string email, string password);
}

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;

    public AuthService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<(long userId, bool isAdmin)> RegisterAsync(string username, string email, string password)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("Все поля обязательны");

        if (await _userRepository.ExistsAsync(email, username))
            throw new ArgumentException("Пользователь с такой почтой или именем уже существует");

        var hash = BCrypt.Net.BCrypt.HashPassword(password);
        var user = new User
        {
            username = username,
            email = email,
            password = hash,
            is_admin = 0
        };

        await _userRepository.AddAsync(user);
        return (user.id, false);
    }

    public async Task<(long userId, bool isAdmin)> LoginAsync(string email, string password)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("Введите почту и пароль");

        var user = await _userRepository.FindByEmailAsync(email)
            ?? throw new UnauthorizedAccessException("Неверная почта или пароль");

        var pwd = user.password ?? "";
        bool isValid = pwd.StartsWith("$2")
            ? BCrypt.Net.BCrypt.Verify(password, pwd)
            : pwd == password;

        if (!isValid)
            throw new UnauthorizedAccessException("Неверная почта или пароль");

        return (user.id, user.is_admin == 1);
    }
}
