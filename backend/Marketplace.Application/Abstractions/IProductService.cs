using Marketplace.Application.Common;
using Marketplace.Application.Dtos;

namespace Marketplace.Application.Abstractions;

// Доменный контракт: каталог, карточка, CRUD, ставки, изображения, доступность.
public interface IProductService
{
    Task<PagedResult<ProductListItemDto>> GetProductsAsync(ProductListParameters p, CancellationToken ct = default);
    Task<ProductDetailDto?> GetByIdAsync(int id, int? userIdForFavorite, CancellationToken ct = default);
    Task IncrementViewsAsync(int id, CancellationToken ct = default);
    Task<CreateEntityResult> CreateAsync(CreateProductDto dto, CancellationToken ct = default);
    Task UpdateAsync(int id, PatchProductDto dto, CancellationToken ct = default);
    Task DeleteAsync(int id, int sellerId, int actorId, CancellationToken ct = default);
    Task<IReadOnlyList<BidDto>> GetBidsAsync(int productId, CancellationToken ct = default);
    Task<PlaceBidResultDto> PlaceBidAsync(int productId, PlaceBidDto dto, CancellationToken ct = default);
    Task IncrementLikesAsync(int id, CancellationToken ct = default);
    Task<AvailabilityDto> GetAvailabilityAsync(int productId, string date, CancellationToken ct = default);
    Task AddImagesAsync(int productId, int sellerId, int actorId, IReadOnlyList<string> fileUrls, CancellationToken ct = default);
    Task<IReadOnlyList<string>> RemoveImageAsync(int productId, int sellerId, int actorId, string imageUrl, CancellationToken ct = default);
}
