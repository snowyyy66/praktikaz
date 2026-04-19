using Marketplace.Application.Common;
using Marketplace.Application.Dtos;

namespace Marketplace.Application.Abstractions;

// Создание заказов из корзины, списки сделок, завершение продавцом.
public interface IOrderService
{
    Task CreateOrdersAsync(CreateOrderRequestDto dto, CancellationToken ct = default);
    Task<PagedResult<OrderListItemDto>> GetForUserAsync(OrderListParameters p, CancellationToken ct = default);
    Task CompleteOrderAsync(int orderId, int sellerId, int actorId, CancellationToken ct = default);
}
