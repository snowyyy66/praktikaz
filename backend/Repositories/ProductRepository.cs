using Backend.Data;
using Backend.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Repositories;

public class ProductRepository : IProductRepository
{
    private readonly AppDbContext _context;

    public ProductRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Product>> GetProductsAsync(string? category, string? search, string? city, string? sort, int page, int limit, long? sellerId = null)
    {
        var query = _context.Products.AsQueryable();

        // Фильтрация
        if (!string.IsNullOrEmpty(category))
        {
            // Try to match by ID direct first
            if (long.TryParse(category, out _))
            {
                query = query.Where(p => p.category_id == category);
            }
            else
            {
                // Try to find category by name
                var cat = await _context.Categories.FirstOrDefaultAsync(c => c.name != null && c.name.ToLower() == category.ToLower());
                if (cat != null)
                {
                    var catIdStr = cat.id.ToString();
                    query = query.Where(p => p.category_id == catIdStr);
                }
                else
                {
                    // Fallback to searching by name in category_id just in case name was stored there
                    query = query.Where(p => p.category_id != null && p.category_id.ToLower() == category.ToLower());
                }
            }
        }
        
        if (!string.IsNullOrEmpty(search))
        {
            var ls = search.ToLower();
            query = query.Where(p => (p.title != null && p.title.ToLower().Contains(ls)) || (p.description != null && p.description.ToLower().Contains(ls)));
        }
            
        if (!string.IsNullOrEmpty(city))
        {
            var lc = city.ToLower();
            query = query.Where(p => p.city != null && p.city.ToLower().Contains(lc));
        }

        query = query.Where(p => p.is_active > 0);

        if (sellerId.HasValue)
            query = query.Where(p => p.seller_id == sellerId.Value);

        // Сортировка
        query = sort switch
        {
            "price_asc" => query.OrderBy(p => p.price),
            "price_desc" => query.OrderByDescending(p => p.price),
            "popular" => query.OrderByDescending(p => p.views),
            _ => query.OrderByDescending(p => p.created_at)
        };

        // Пагинация
        return await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<Product?> GetByIdAsync(long id)
    {
        return await _context.Products.FindAsync(id);
    }

    public async Task AddAsync(Product product)
    {
        await _context.Products.AddAsync(product);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Product product)
    {
        _context.Products.Update(product);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(long id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product != null)
        {
            _context.Products.Remove(product);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<int> GetTotalCountAsync(string? category, string? search, string? city, long? sellerId = null)
    {
        var query = _context.Products.AsQueryable();
        
        if (!string.IsNullOrEmpty(category))
        {
            if (long.TryParse(category, out _))
            {
                query = query.Where(p => p.category_id == category);
            }
            else
            {
                var cat = await _context.Categories.FirstOrDefaultAsync(c => c.name != null && c.name.ToLower() == category.ToLower());
                if (cat != null)
                {
                    var catIdStr = cat.id.ToString();
                    query = query.Where(p => p.category_id == catIdStr);
                }
                else
                {
                    query = query.Where(p => p.category_id != null && p.category_id.ToLower() == category.ToLower());
                }
            }
        }
        
        if (!string.IsNullOrEmpty(search))
        {
            var ls = search.ToLower();
            query = query.Where(p => (p.title != null && p.title.ToLower().Contains(ls)) || (p.description != null && p.description.ToLower().Contains(ls)));
        }
            
        if (!string.IsNullOrEmpty(city))
        {
            var lc = city.ToLower();
            query = query.Where(p => p.city != null && p.city.ToLower().Contains(lc));
        }

        if (sellerId.HasValue)
            query = query.Where(p => p.seller_id == sellerId.Value);

        return await query.CountAsync(p => p.is_active > 0);
    }
}
