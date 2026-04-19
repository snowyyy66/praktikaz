using Marketplace.Application.Dtos;

namespace Marketplace.Application.Abstractions;

// Список категорий для UI.
public interface ICategoryService
{
    Task<IReadOnlyList<CategoryDto>> GetAllAsync(CancellationToken ct = default);
}
