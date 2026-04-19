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
    private readonly IProductRepository _productRepository;

    public OrderService(IOrderRepository orderRepository, IProductRepository productRepository)
    {
        _orderRepository = orderRepository;
        _productRepository = productRepository;
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
        if (order.seller_id <= 0)
        {
            var product = await _productRepository.GetByIdAsync(order.product_id);
            if (product != null) order.seller_id = product.seller_id;
        }
        if (string.IsNullOrEmpty(order.status)) order.status = "completed";
        if (string.IsNullOrEmpty(order.created_at)) order.created_at = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
        await _orderRepository.AddAsync(order);
    }
}
