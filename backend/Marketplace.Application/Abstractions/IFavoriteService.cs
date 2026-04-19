using Marketplace.Application.Dtos;

namespace Marketplace.Application.Abstractions;

// Избранное: toggle и выборка товаров.
public interface IFavoriteService
{
    Task<ToggleFavoriteResultDto> ToggleAsync(int userId, int productId, CancellationToken ct = default);
    Task<IReadOnlyList<ProductListItemDto>> GetUserFavoritesAsync(int userId, CancellationToken ct = default);
}
