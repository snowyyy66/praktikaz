using Backend.Data;
using Backend.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Backend.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(long id);
    Task<User?> FindByEmailAsync(string email);
    Task<bool> ExistsAsync(string email, string username);
    Task AddAsync(User user);
    Task UpdateAsync(User user);
    Task UpdateAvatarAsync(long id, string url);
    Task<IEnumerable<object>> GetProductsPagedAsync(long userId, int page, int limit);
    Task<int> GetProductsCountAsync(long userId);
    Task<UserStatsRaw> GetStatsRawAsync(long userId);
    Task<IEnumerable<object>> GetFavoritesAsync(long userId);
    Task<IEnumerable<object>> GetOrdersAsync(long userId);
    Task<IEnumerable<Notification>> GetNotificationsAsync(long userId);
    Task MarkAllNotificationsReadAsync(long userId);
    Task MarkNotificationReadAsync(long id);
    Task<bool> IsAdminAsync(long userId);
}

public record UserStatsRaw(
    int TotalProducts, int ActiveProducts, int TotalViews, int TotalLikes,
    int SalesCount, long Revenue, int PurchasesCount, long Spent);

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;
    public UserRepository(AppDbContext context) => _context = context;

    public async Task<User?> GetByIdAsync(long id) => await _context.Users.FindAsync(id);

    public async Task<User?> FindByEmailAsync(string email)
        => await _context.Users.FirstOrDefaultAsync(u => u.email == email);

    public async Task<bool> ExistsAsync(string email, string username)
        => await _context.Users.AnyAsync(u => u.email == email || u.username == username);

    public async Task AddAsync(User user)
    {
        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(User user)
    {
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAvatarAsync(long id, string url)
    {
        var user = await _context.Users.FindAsync(id);
        if (user != null)
        {
            user.avatar = url;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<bool> IsAdminAsync(long userId)
    {
        var user = await _context.Users.FindAsync(userId);
        return user?.is_admin == 1;
    }

    public async Task<IEnumerable<object>> GetProductsPagedAsync(long userId, int page, int limit)
    {
        var items = await (from p in _context.Products
                           join c in _context.Categories on p.category_id equals c.id
                           where p.seller_id == userId && p.is_active == 1
                           orderby p.created_at descending
                           select new
                           {
                               p.id, p.title, p.description, p.category_id,
                               category_name = c.name, p.price, p.city, p.condition,
                               p.views, p.likes, p.seller_id, p.created_at,
                               p.is_active, p.details, p.images, p.sale_type,
                               p.auction_ends_at, p.auction_step
                           })
                           .Skip((page - 1) * limit)
                           .Take(limit)
                           .ToListAsync();

        return items.Select(p => (object)new
        {
            p.id, p.title, p.description, p.category_id,
            p.category_name, p.price, p.city, p.condition,
            p.views, p.likes, p.seller_id, p.created_at,
            p.is_active, p.sale_type, p.auction_ends_at, p.auction_step,
            details = TryDeserialize(p.details, (object)new { }),
            images = TryDeserialize(p.images, (object)Array.Empty<string>())
        });
    }

    public async Task<int> GetProductsCountAsync(long userId)
        => await _context.Products.CountAsync(p => p.seller_id == userId && p.is_active == 1);

    public async Task<UserStatsRaw> GetStatsRawAsync(long userId)
    {
        var totalProducts = await _context.Products.CountAsync(p => p.seller_id == userId);
        var activeProducts = await _context.Products.CountAsync(p => p.seller_id == userId && p.is_active == 1);
        var totalViews = await _context.Products
            .Where(p => p.seller_id == userId)
            .SumAsync(p => (long?)p.views) ?? 0;
        var totalLikes = await _context.Products
            .Where(p => p.seller_id == userId)
            .SumAsync(p => (long?)p.likes) ?? 0;

        var salesOrders = await _context.Orders
            .Where(o => o.seller_id == userId && o.status == "completed")
            .ToListAsync();
        var purchaseOrders = await _context.Orders
            .Where(o => o.buyer_id == userId && o.status == "completed")
            .ToListAsync();

        return new UserStatsRaw(
            totalProducts, activeProducts, (int)totalViews, (int)totalLikes,
            salesOrders.Count, salesOrders.Sum(o => o.total),
            purchaseOrders.Count, purchaseOrders.Sum(o => o.total));
    }

    public async Task<IEnumerable<object>> GetFavoritesAsync(long userId)
    {
        var items = await (from f in _context.Favorites
                           join p in _context.Products on f.product_id equals p.id
                           join c in _context.Categories on p.category_id equals c.id
                           join u in _context.Users on p.seller_id equals u.id
                           where f.user_id == userId
                           orderby f.created_at descending
                           select new
                           {
                               p.id, p.title, p.description, p.category_id,
                               category_name = c.name, seller_name = u.username,
                               p.price, p.city, p.condition, p.views, p.likes,
                               p.seller_id, p.created_at, p.is_active,
                               p.details, p.images, p.sale_type
                           })
                           .Take(20)
                           .ToListAsync();

        return items.Select(p => (object)new
        {
            p.id, p.title, p.description, p.category_id,
            p.category_name, p.seller_name, p.price, p.city, p.condition,
            p.views, p.likes, p.seller_id, p.created_at, p.is_active, p.sale_type,
            is_favorite = true,
            details = TryDeserialize(p.details, (object)new { }),
            images = TryDeserialize(p.images, (object)Array.Empty<string>())
        });
    }

    public async Task<IEnumerable<object>> GetOrdersAsync(long userId)
    {
        var orders = await (from o in _context.Orders
                      join p in _context.Products on o.product_id equals p.id
                      join buyer in _context.Users on o.buyer_id equals buyer.id
                      join seller in _context.Users on o.seller_id equals seller.id into sellerJoin
                      from seller in sellerJoin.DefaultIfEmpty()
                      where o.buyer_id == userId || o.seller_id == userId
                      orderby o.created_at descending
                      select new
                      {
                          o.id, o.buyer_id, o.seller_id, o.product_id,
                          o.status, o.total, o.created_at, o.rent_hours,
                          o.appointment_date, o.appointment_time,
                          product_title = p.title, product_price = p.price,
                          product_category_id = p.category_id,
                          buyer_name = buyer.username,
                          seller_name = seller != null ? seller.username : "Неизвестно"
                      })
                      .ToListAsync();
        return orders.Cast<object>();
    }

    public async Task<IEnumerable<Notification>> GetNotificationsAsync(long userId)
        => await _context.Notifications
            .Where(n => n.user_id == userId)
            .OrderByDescending(n => n.created_at)
            .Take(50)
            .ToListAsync();

    public async Task MarkAllNotificationsReadAsync(long userId)
    {
        var notifs = await _context.Notifications
            .Where(n => n.user_id == userId)
            .ToListAsync();
        foreach (var n in notifs) n.is_read = 1;
        await _context.SaveChangesAsync();
    }

    public async Task MarkNotificationReadAsync(long id)
    {
        var notif = await _context.Notifications.FindAsync(id);
        if (notif != null)
        {
            notif.is_read = 1;
            await _context.SaveChangesAsync();
        }
    }

    private static object TryDeserialize(string? json, object fallback)
    {
        if (string.IsNullOrEmpty(json)) return fallback;
        try { return JsonSerializer.Deserialize<object>(json) ?? fallback; }
        catch { return fallback; }
    }
}
