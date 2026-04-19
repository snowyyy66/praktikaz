using Marketplace.Application.Abstractions;
using Marketplace.Application.Dtos;
using Marketplace.Core.Enums;
using Marketplace.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Marketplace.Infrastructure.Services;

// Профиль, публичные данные продавца, заказы и отзывы на пользователя.
public class UserService : IUserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db) => _db = db;

    public async Task<UserProfileDto?> GetProfileAsync(int id, CancellationToken ct = default)
    {
        var u = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (u == null) return null;
        return new UserProfileDto
        {
            Id = u.Id,
            Username = u.Username,
            Email = u.Email,
            IsAdmin = u.IsAdmin,
            Phone = u.Phone,
            City = u.City,
            Avatar = u.Avatar,
            CreatedAt = u.CreatedAt,
            Rating = u.Rating,
            TotalSales = u.TotalSales,
            TotalEarnings = u.TotalEarnings,
        };
    }

    public async Task UpdateProfileAsync(int id, UpdateUserDto dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Username))
            throw new InvalidOperationException("Имя не может быть пустым");
        var u = await _db.Users.FirstAsync(x => x.Id == id, ct);
        u.Username = dto.Username.Trim();
        u.Phone = (dto.Phone ?? "").Trim();
        u.City = (dto.City ?? "").Trim();
        await _db.SaveChangesAsync(ct);
    }

    public async Task<string> SetAvatarUrlAsync(int userId, string url, CancellationToken ct = default)
    {
        var u = await _db.Users.FirstAsync(x => x.Id == userId, ct);
        u.Avatar = url;
        await _db.SaveChangesAsync(ct);
        return url;
    }

    public async Task<SellerStatsDto> GetStatsAsync(int userId, SellerStatsQueryDto query, CancellationToken ct = default)
    {
        var totalProducts = await _db.Products.CountAsync(p => p.SellerId == userId, ct);
        var activeProducts = await _db.Products.CountAsync(p => p.SellerId == userId && p.IsActive, ct);
        var totalViews = await _db.Products.Where(p => p.SellerId == userId).SumAsync(p => (long)p.Views, ct);
        var totalLikes = await _db.Products.Where(p => p.SellerId == userId).SumAsync(p => (long)p.Likes, ct);

        var salesQuery = _db.Orders
            .AsNoTracking()
            .Include(o => o.Items)
            .Where(o => o.SellerId == userId && o.Status == OrderStatus.Completed);

        var purchasesQuery = _db.Orders
            .AsNoTracking()
            .Where(o => o.BuyerId == userId && o.Status == OrderStatus.Completed);

        if (query.From.HasValue)
        {
            var from = DateTime.SpecifyKind(query.From.Value, DateTimeKind.Utc);
            salesQuery = salesQuery.Where(o => o.CreatedAt >= from);
            purchasesQuery = purchasesQuery.Where(o => o.CreatedAt >= from);
        }

        if (query.To.HasValue)
        {
            var to = DateTime.SpecifyKind(query.To.Value, DateTimeKind.Utc);
            salesQuery = salesQuery.Where(o => o.CreatedAt <= to);
            purchasesQuery = purchasesQuery.Where(o => o.CreatedAt <= to);
        }

        var salesOrders = await salesQuery.ToListAsync(ct);
        var purchaseOrders = await purchasesQuery.ToListAsync(ct);

        if (query.ProductIds is { Length: > 0 } filterIds)
            salesOrders = salesOrders.Where(o => o.Items.Any(i => filterIds.Contains(i.ProductId))).ToList();

        long salesRevenue;
        int salesCount;
        if (query.ProductIds is { Length: > 0 } pids && pids.Length > 0)
        {
            salesCount = salesOrders.Count;
            salesRevenue = salesOrders
                .SelectMany(o => o.Items.Where(i => pids.Contains(i.ProductId)))
                .Sum(i => i.LineTotal);
        }
        else
        {
            salesCount = salesOrders.Count;
            salesRevenue = salesOrders.Sum(o => o.Total);
        }

        var perProduct = new List<ProductSalesStatDto>();
        if (query.ProductIds is { Length: > 0 } listIds)
        {
            foreach (var pid in listIds)
            {
                var pr = await _db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == pid && p.SellerId == userId, ct);
                if (pr == null) continue;
                var relevant = salesOrders.Where(o => o.Items.Any(i => i.ProductId == pid)).ToList();
                var lines = relevant.SelectMany(o => o.Items.Where(i => i.ProductId == pid)).ToList();
                perProduct.Add(new ProductSalesStatDto
                {
                    ProductId = pid,
                    Title = pr.Title,
                    UnitsSold = lines.Sum(i => i.Quantity),
                    Revenue = lines.Sum(i => i.LineTotal),
                });
            }
        }

        return new SellerStatsDto
        {
            TotalProducts = totalProducts,
            ActiveProducts = activeProducts,
            TotalViews = totalViews,
            TotalLikes = totalLikes,
            Sales = new SalesBucketDto { Count = salesCount, Revenue = salesRevenue },
            Purchases = new PurchasesBucketDto { Count = purchaseOrders.Count, Spent = purchaseOrders.Sum(o => o.Total) },
            PerProduct = perProduct,
        };
    }
}
