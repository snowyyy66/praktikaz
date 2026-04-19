using Marketplace.Application.Dtos;

namespace Marketplace.Application.Abstractions;

// Поиск по строке запроса.
public interface ISearchService
{
    Task<IReadOnlyList<ProductListItemDto>> SearchAsync(string? q, CancellationToken ct = default);
}
