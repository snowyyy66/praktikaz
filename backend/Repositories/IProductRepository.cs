using Backend.Models.Entities;

namespace Backend.Repositories;

public interface IProductRepository
{
    Task<IEnumerable<Product>> GetProductsAsync(string? category, string? search, string? city, string? sort, int page, int limit, long? sellerId = null);
    Task<Product?> GetByIdAsync(long id);
    Task AddAsync(Product product);
    Task UpdateAsync(Product product);
    Task DeleteAsync(long id);
    Task<int> GetTotalCountAsync(string? category, string? search, string? city, long? sellerId = null);
}
