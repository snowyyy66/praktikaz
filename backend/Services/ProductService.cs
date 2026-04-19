using Backend.Models.DTOs;
using Backend.Models.Entities;
using Backend.Repositories;
using System.Text.Json;

namespace Backend.Services;

public class ProductService : IProductService
{
    private readonly IProductRepository _productRepository;
    private readonly IUserRepository _userRepository;
    private readonly IFavoriteRepository _favoriteRepository;
    private readonly IAuctionRepository _auctionRepository;
    private readonly IReviewRepository _reviewRepository;

    public ProductService(
        IProductRepository productRepository,
        IUserRepository userRepository,
        IFavoriteRepository favoriteRepository,
        IAuctionRepository auctionRepository,
        IReviewRepository reviewRepository)
    {
        _productRepository = productRepository;
        _userRepository = userRepository;
        _favoriteRepository = favoriteRepository;
        _auctionRepository = auctionRepository;
        _reviewRepository = reviewRepository;
    }

    public async Task<PagedResult<ProductResponseDto>> GetProductsAsync(string? category, string? search, string? city, string? sort, int page, int limit, long? userId, bool sellerOnly = false)
    {
        long? sellerId = sellerOnly ? userId : null;
        var products = await _productRepository.GetProductsAsync(category, search, city, sort, page, limit, sellerId);
        var totalCount = await _productRepository.GetTotalCountAsync(category, search, city, sellerId);

        var dtos = new List<ProductResponseDto>();
        foreach (var p in products)
        {
            var seller = await _userRepository.GetByIdAsync(p.seller_id);
            var isFavorite = userId.HasValue && await _favoriteRepository.IsFavoriteAsync(userId.Value, p.id);
            dtos.Add(MapToDto(p, seller?.username ?? "Unknown", isFavorite));
        }

        return new PagedResult<ProductResponseDto>
        {
            items = dtos,
            total_count = totalCount,
            page = page,
            limit = limit,
            has_more = totalCount > page * limit
        };
    }

    public async Task<ProductResponseDto?> GetProductByIdAsync(long id, long? userId)
    {
        var product = await _productRepository.GetByIdAsync(id);
        if (product == null) return null;

        var seller = await _userRepository.GetByIdAsync(product.seller_id);
        var isFavorite = userId.HasValue && await _favoriteRepository.IsFavoriteAsync(userId.Value, product.id);
        var dto = MapToDto(product, seller?.username ?? "Unknown", isFavorite);

        if (userId.HasValue && userId.Value != product.seller_id)
        {
            dto.can_review = await _reviewRepository.HasPurchasedAsync(userId.Value, product.id);
            var existing = await _reviewRepository.GetByUserAndProductAsync(userId.Value, product.id);
            if (existing != null)
            {
                var imgs = JsonSerializer.Deserialize<List<string>>(existing.images) ?? [];
                dto.user_review = new { existing.id, existing.rating, existing.text, images = imgs };
                dto.can_review = true;
            }
        }

        return dto;
    }

    public async Task<long> CreateProductAsync(CreateProductDto dto)
    {
        var product = new Product
        {
            title = dto.title,
            description = dto.description,
            category_id = dto.category_id,
            price = dto.price,
            city = dto.city,
            condition = dto.condition,
            seller_id = dto.seller_id,
            details = dto.details?.ValueKind != JsonValueKind.Undefined ? dto.details?.GetRawText() ?? "{}" : "{}",
            images = dto.images?.ValueKind != JsonValueKind.Undefined ? dto.images?.GetRawText() ?? "[]" : "[]",
            sale_type = dto.sale_type,
            auction_ends_at = dto.auction_ends_at ?? "",
            auction_step = dto.auction_step ?? 0,
            is_active = 1,
            created_at = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")
        };

        await _productRepository.AddAsync(product);
        return product.id;
    }

    public async Task UpdateProductAsync(long id, CreateProductDto dto)
    {
        var product = await _productRepository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Товар не найден");

        product.title = dto.title;
        product.description = dto.description;
        product.category_id = dto.category_id;
        product.price = dto.price;
        product.city = dto.city;
        product.condition = dto.condition;
        if (dto.details?.ValueKind != JsonValueKind.Undefined)
            product.details = dto.details?.GetRawText() ?? product.details;
        if (dto.images?.ValueKind != JsonValueKind.Undefined)
            product.images = dto.images?.GetRawText() ?? product.images;

        await _productRepository.UpdateAsync(product);
    }

    public async Task DeleteProductAsync(long id)
    {
        await _productRepository.DeleteAsync(id);
    }

    public async Task AppendImagesAsync(long id, List<string> urls)
    {
        var product = await _productRepository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Товар не найден");

        var existing = JsonSerializer.Deserialize<List<string>>(product.images ?? "[]") ?? [];
        existing.AddRange(urls);
        product.images = JsonSerializer.Serialize(existing);
        await _productRepository.UpdateAsync(product);
    }

    public async Task RemoveImageAsync(long id, string url)
    {
        var product = await _productRepository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Товар не найден");

        var existing = JsonSerializer.Deserialize<List<string>>(product.images ?? "[]") ?? [];
        existing.Remove(url);
        product.images = JsonSerializer.Serialize(existing);
        await _productRepository.UpdateAsync(product);
    }

    public async Task IncrementViewsAsync(long id, long? userId)
    {
        var product = await _productRepository.GetByIdAsync(id);
        if (product != null)
        {
            product.views++;
            await _productRepository.UpdateAsync(product);
        }
    }

    public async Task LikeProductAsync(long id)
    {
        var product = await _productRepository.GetByIdAsync(id);
        if (product != null)
        {
            product.likes++;
            await _productRepository.UpdateAsync(product);
        }
    }

    public async Task<IEnumerable<dynamic>> GetBidsAsync(long id)
    {
        return await _auctionRepository.GetBidsAsync(id);
    }

    public async Task PlaceBidAsync(long id, long bidderId, long amount)
    {
        var bid = new AuctionBid
        {
            product_id = id,
            bidder_id = bidderId,
            amount = amount,
            created_at = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")
        };
        await _auctionRepository.AddBidAsync(bid);
    }

    private ProductResponseDto MapToDto(Product p, string sellerName, bool isFavorite)
    {
        object detailsObj = new { };
        object imagesObj = new string[] { };

        try 
        { 
            if (!string.IsNullOrEmpty(p.details))
                detailsObj = JsonSerializer.Deserialize<object>(p.details) ?? new { }; 
        } catch { }
        
        try 
        { 
            if (!string.IsNullOrEmpty(p.images))
                imagesObj = JsonSerializer.Deserialize<object>(p.images) ?? new string[] { }; 
        } catch { }

        return new ProductResponseDto
        {
            id = p.id,
            title = p.title,
            description = p.description,
            category_id = p.category_id,
            price = p.price,
            city = p.city,
            condition = p.condition,
            views = p.views,
            likes = p.likes,
            seller_id = p.seller_id,
            seller_name = sellerName,
            created_at = p.created_at,
            is_favorite = isFavorite,
            details = detailsObj,
            images = imagesObj,
            sale_type = p.sale_type
        };
    }
}
