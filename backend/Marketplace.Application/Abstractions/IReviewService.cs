using Marketplace.Application.Dtos;

namespace Marketplace.Application.Abstractions;

// Отзывы на товар и продавца после покупки.
public interface IReviewService
{
    Task<IReadOnlyList<ReviewDto>> GetForProductAsync(int productId, CancellationToken ct = default);
    Task CreateAsync(CreateReviewDto dto, CancellationToken ct = default);
}
