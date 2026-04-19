using Marketplace.Application.Dtos;

namespace Marketplace.Application.Abstractions;

// Профиль, публичная витрина продавца, отзывы и статистика.
public interface IUserService
{
    Task<UserProfileDto?> GetProfileAsync(int id, CancellationToken ct = default);
    Task UpdateProfileAsync(int id, UpdateUserDto dto, CancellationToken ct = default);
    Task<string> SetAvatarUrlAsync(int userId, string url, CancellationToken ct = default);
    Task<SellerStatsDto> GetStatsAsync(int userId, SellerStatsQueryDto query, CancellationToken ct = default);
}
