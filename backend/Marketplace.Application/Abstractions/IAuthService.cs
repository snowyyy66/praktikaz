using Marketplace.Application.Dtos;

namespace Marketplace.Application.Abstractions;

// Регистрация и аутентификация по email/паролю.
public interface IAuthService
{
    Task<AuthResultDto> RegisterAsync(RegisterDto dto, CancellationToken ct = default);
    Task<AuthResultDto> LoginAsync(LoginDto dto, CancellationToken ct = default);
}
