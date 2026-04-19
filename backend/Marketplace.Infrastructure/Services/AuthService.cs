using Marketplace.Application.Abstractions;
using Marketplace.Application.Dtos;
using Marketplace.Core.Entities;
using Marketplace.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Marketplace.Infrastructure.Services;

// Регистрация и вход: проверка уникальности, хэш пароля BCrypt.
public class AuthService : IAuthService
{
    private readonly AppDbContext _db;

    public AuthService(AppDbContext db) => _db = db;

    public async Task<AuthResultDto> RegisterAsync(RegisterDto dto, CancellationToken ct = default)
    {
        if (dto == null)
            return new AuthResultDto { Success = false, Error = "Некорректные данные запроса" };

        var username = (dto.Username ?? "").Trim();
        var email = (dto.Email ?? "").Trim().ToLowerInvariant();
        var password = dto.Password ?? "";

        if (username.Length < 2 || email.Length == 0)
            return new AuthResultDto { Success = false, Error = "Укажите имя пользователя и почту" };

        if (password.Length < 8)
            return new AuthResultDto { Success = false, Error = "Пароль должен быть не короче 8 символов" };

        // Без ToLower() в SQL (на части связок SQLite/EF это падало с 500). Проверка по списку строк.
        var existing = await _db.Users.AsNoTracking()
            .Select(u => new { u.Email, u.Username })
            .ToListAsync(ct);

        if (existing.Any(x => string.Equals(x.Email, email, StringComparison.OrdinalIgnoreCase)))
            return new AuthResultDto { Success = false, Error = "Этот email уже зарегистрирован" };

        if (existing.Any(x => string.Equals(x.Username, username, StringComparison.Ordinal)))
            return new AuthResultDto { Success = false, Error = "Это имя пользователя уже занято" };

        var hash = BCrypt.Net.BCrypt.HashPassword(password, 10);
        var user = new User
        {
            Username = username,
            Email = email,
            Password = hash,
            IsAdmin = false,
            CreatedAt = DateTime.UtcNow,
        };
        _db.Users.Add(user);

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            return new AuthResultDto { Success = false, Error = "Этот email или имя пользователя уже заняты (конфликт в базе)" };
        }

        var created = await _db.Users.AsNoTracking().FirstAsync(u => u.Email == email, ct);
        return new AuthResultDto { Success = true, UserId = created.Id, IsAdmin = created.IsAdmin };
    }

    public async Task<AuthResultDto> LoginAsync(LoginDto dto, CancellationToken ct = default)
    {
        var email = (dto.Email ?? "").Trim().ToLowerInvariant();
        var plain = dto.Password ?? "";

        // Сначала точное совпадение (новые пользователи хранят email в нижнем регистре).
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (user == null)
        {
            var rows = await _db.Users.AsNoTracking().Select(u => new { u.Id, u.Email }).ToListAsync(ct);
            var hit = rows.FirstOrDefault(x => string.Equals(x.Email, email, StringComparison.OrdinalIgnoreCase));
            if (hit != null)
                user = await _db.Users.FirstOrDefaultAsync(u => u.Id == hit.Id, ct);
        }

        if (user == null)
            return new AuthResultDto { Success = false, Error = "Неверная почта или пароль" };

        bool ok = user.Password.StartsWith("$2")
            ? BCrypt.Net.BCrypt.Verify(plain, user.Password)
            : user.Password == plain;

        if (!ok)
            return new AuthResultDto { Success = false, Error = "Неверная почта или пароль" };

        return new AuthResultDto { Success = true, UserId = user.Id, IsAdmin = user.IsAdmin };
    }
}
