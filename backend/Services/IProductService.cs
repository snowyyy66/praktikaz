using Backend.Models.DTOs;
using Backend.Models.Entities;

namespace Backend.Services;

public interface IProductService
{
    Task<PagedResult<ProductResponseDto>> GetProductsAsync(string? category, string? search, string? city, string? sort, int page, int limit, long? userId);
    Task<ProductResponseDto?> GetProductByIdAsync(long id, long? userId);
    Task<long> CreateProductAsync(CreateProductDto dto);
    Task IncrementViewsAsync(long id, long? userId);
    Task LikeProductAsync(long id);
    Task<IEnumerable<dynamic>> GetBidsAsync(long id);
    Task PlaceBidAsync(long id, long bidderId, long amount);
}
