using Backend.Data;
using Backend.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Repositories;

public class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _context;

    public OrderRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Order>> GetOrdersAsync(long? userId, string? status, int page, int limit)
    {
        var query = _context.Orders.AsQueryable();

        if (userId.HasValue)
            query = query.Where(o => o.buyer_id == userId.Value || o.seller_id == userId.Value);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(o => o.status == status);

        return await query
            .OrderByDescending(o => o.created_at)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<Order?> GetByIdAsync(long id)
    {
        return await _context.Orders.FindAsync(id);
    }

    public async Task AddAsync(Order order)
    {
        await _context.Orders.AddAsync(order);
        await _context.SaveChangesAsync();
    }

    public async Task<int> GetTotalCountAsync(long? userId, string? status)
    {
        var query = _context.Orders.AsQueryable();

        if (userId.HasValue)
            query = query.Where(o => o.buyer_id == userId.Value || o.seller_id == userId.Value);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(o => o.status == status);

        return await query.CountAsync();
    }
}
