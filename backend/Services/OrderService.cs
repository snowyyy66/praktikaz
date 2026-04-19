using Backend.Models.DTOs;
using Backend.Models.Entities;
using Backend.Repositories;

namespace Backend.Services;

public interface IOrderService
{
    Task<PagedResult<Order>> GetOrdersAsync(long? userId, string? status, int page, int limit);
    Task<Order?> GetOrderByIdAsync(long id);
    Task CreateOrderAsync(Order order);
}

public class OrderService : IOrderService
{
    private readonly IOrderRepository _orderRepository;

    public OrderService(IOrderRepository orderRepository)
    {
        _orderRepository = orderRepository;
    }

    public async Task<PagedResult<Order>> GetOrdersAsync(long? userId, string? status, int page, int limit)
    {
        var orders = await _orderRepository.GetOrdersAsync(userId, status, page, limit);
        var totalCount = await _orderRepository.GetTotalCountAsync(userId, status);

        return new PagedResult<Order>
        {
            items = orders,
            total_count = totalCount,
            page = page,
            limit = limit,
            has_more = totalCount > page * limit
        };
    }

    public async Task<Order?> GetOrderByIdAsync(long id)
    {
        return await _orderRepository.GetByIdAsync(id);
    }

    public async Task CreateOrderAsync(Order order)
    {
        await _orderRepository.AddAsync(order);
    }
}
