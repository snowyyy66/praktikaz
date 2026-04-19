using Backend.Models.Entities;

namespace Backend.Repositories;

public interface IOrderRepository
{
    Task<IEnumerable<Order>> GetOrdersAsync(long? userId, string? status, int page, int limit);
    Task<Order?> GetByIdAsync(long id);
    Task AddAsync(Order order);
    Task<int> GetTotalCountAsync(long? userId, string? status);
}
