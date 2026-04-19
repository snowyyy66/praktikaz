using Backend.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Backend.Services;

public interface ISearchService
{
    Task<IEnumerable<object>> SearchAsync(string? query);
}

public class SearchService : ISearchService
{
    private readonly AppDbContext _context;

    public SearchService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<object>> SearchAsync(string? query)
    {
        if (string.IsNullOrWhiteSpace(query)) return Array.Empty<object>();

        var term = query.Trim().ToLower();

        var products = await (from p in _context.Products
                              join u in _context.Users on p.seller_id equals u.id
                              join c in _context.Categories on p.category_id equals c.id
                              where p.is_active == 1 &&
                                    ((p.title != null && p.title.ToLower().Contains(term)) ||
                                     (p.description != null && p.description.ToLower().Contains(term)))
                              orderby p.created_at descending
                              select new
                              {
                                  p.id, p.title, p.description, p.category_id,
                                  category_name = c.name, seller_name = u.username,
                                  p.price, p.city, p.condition, p.views, p.likes,
                                  p.seller_id, p.created_at, p.is_active, p.details, p.images, p.sale_type
                              })
                              .Take(20)
                              .ToListAsync();

        return products.Select(p => (object)new
        {
            p.id, p.title, p.description, p.category_id,
            p.category_name, p.seller_name, p.price, p.city, p.condition,
            p.views, p.likes, p.seller_id, p.created_at, p.is_active, p.sale_type,
            details = TryDeserialize(p.details)
        });
    }

    private static object TryDeserialize(string? json)
    {
        if (string.IsNullOrEmpty(json)) return new { };
        try { return JsonSerializer.Deserialize<object>(json) ?? new { }; }
        catch { return new { }; }
    }
}
