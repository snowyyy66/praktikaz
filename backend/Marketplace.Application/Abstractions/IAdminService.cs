using Marketplace.Application.Dtos;

namespace Marketplace.Application.Abstractions;

// Операции только для пользователя с флагом администратора.
public interface IAdminService
{
    Task<IReadOnlyList<ProductListItemDto>> GetAllProductsAsync(int adminUserId, CancellationToken ct = default);
}
