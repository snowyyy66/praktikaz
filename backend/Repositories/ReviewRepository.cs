using Backend.Data;
using Backend.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Backend.Repositories;

public interface IReviewRepository
{
    Task<bool> HasPurchasedAsync(long userId, long productId);
    Task<Review?> GetByUserAndProductAsync(long userId, long productId);
    Task<Review?> GetByIdAsync(long id);
    Task<long> GetSellerIdForProductAsync(long productId);
    Task AddAsync(Review review);
    Task UpdateAsync(Review review);
    Task<IEnumerable<object>> GetByProductAsync(long productId);
    Task<IEnumerable<object>> GetBySellerAsync(long sellerId);
    Task<IEnumerable<object>> GetByReviewerAsync(long reviewerId);
}

public class ReviewRepository : IReviewRepository
{
    private readonly AppDbContext _context;
    public ReviewRepository(AppDbContext context) => _context = context;

    public async Task<bool> HasPurchasedAsync(long userId, long productId)
        => await _context.Orders.AnyAsync(o => o.buyer_id == userId && o.product_id == productId);

    public async Task<Review?> GetByUserAndProductAsync(long userId, long productId)
        => await _context.Reviews.FirstOrDefaultAsync(r => r.reviewer_id == userId && r.product_id == productId);

    public async Task<Review?> GetByIdAsync(long id)
        => await _context.Reviews.FindAsync(id);

    public async Task<long> GetSellerIdForProductAsync(long productId)
    {
        var product = await _context.Products.FindAsync(productId);
        return product?.seller_id ?? 0;
    }

    public async Task AddAsync(Review review)
    {
        await _context.Reviews.AddAsync(review);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Review review)
    {
        _context.Reviews.Update(review);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<object>> GetByProductAsync(long productId)
    {
        var items = await (from r in _context.Reviews
                           join u in _context.Users on r.reviewer_id equals u.id
                           where r.product_id == productId
                           orderby r.created_at descending
                           select new { r.id, r.reviewer_id, reviewer_name = u.username, r.product_id, r.rating, r.text, r.images, r.created_at })
                           .ToListAsync();

        return items.Select(r => (object)new
        {
            r.id, r.reviewer_id, r.reviewer_name, r.product_id, r.rating, r.text, r.created_at,
            images = TryDeserializeArray(r.images)
        });
    }

    public async Task<IEnumerable<object>> GetBySellerAsync(long sellerId)
    {
        var items = await (from r in _context.Reviews
                           join u in _context.Users on r.reviewer_id equals u.id
                           join p in _context.Products on r.product_id equals p.id
                           where p.seller_id == sellerId
                           orderby r.created_at descending
                           select new { r.id, r.reviewer_id, reviewer_name = u.username, r.product_id, r.rating, r.text, r.images, r.created_at, product_title = p.title, product_price = p.price, product_images = p.images })
                           .ToListAsync();

        return items.Select(r => (object)new
        {
            r.id, r.reviewer_id, r.reviewer_name, r.product_id, r.rating, r.text, r.created_at,
            r.product_title, r.product_price,
            images = TryDeserializeArray(r.images),
            product_image = TryDeserializeArray(r.product_images).FirstOrDefault()
        });
    }

    public async Task<IEnumerable<object>> GetByReviewerAsync(long reviewerId)
    {
        var items = await (from r in _context.Reviews
                           join u in _context.Users on r.reviewer_id equals u.id
                           join p in _context.Products on r.product_id equals p.id
                           where r.reviewer_id == reviewerId
                           orderby r.created_at descending
                           select new { r.id, r.reviewer_id, reviewer_name = u.username, r.product_id, r.rating, r.text, r.images, r.created_at, product_title = p.title, product_price = p.price, product_category_id = p.category_id, product_images = p.images })
                           .ToListAsync();

        return items.Select(r => (object)new
        {
            r.id, r.reviewer_id, r.reviewer_name, r.product_id, r.rating, r.text, r.created_at,
            r.product_title, r.product_price, r.product_category_id,
            images = TryDeserializeArray(r.images),
            product_images = TryDeserializeArray(r.product_images)
        });
    }

    private static string[] TryDeserializeArray(string? json)
    {
        if (string.IsNullOrEmpty(json)) return Array.Empty<string>();
        try { return JsonSerializer.Deserialize<string[]>(json) ?? Array.Empty<string>(); }
        catch { return Array.Empty<string>(); }
    }
}
