using System.Text.Json.Nodes;

namespace Marketplace.Application.Dtos;

public class CategoryDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
}

public class CreateProductDto
{
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string CategoryId { get; set; } = "";
    public int Price { get; set; }
    public string City { get; set; } = "";
    public string Condition { get; set; } = "";
    public int SellerId { get; set; }
    public JsonNode? Details { get; set; }
    public string SaleType { get; set; } = "fixed";
    public DateTime? AuctionEndsAt { get; set; }
    public int? AuctionStep { get; set; }
    /// <summary>Остаток для обычных категорий (ТЗ).</summary>
    public int StockQuantity { get; set; } = 1;
}

public class PatchProductDto
{
    public int SellerId { get; set; }
    public int? ActorId { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? CategoryId { get; set; }
    public int? Price { get; set; }
    public string? City { get; set; }
    public string? Condition { get; set; }
    public JsonNode? Details { get; set; }
    public int? StockQuantity { get; set; }
}

public class CreateEntityResult
{
    public bool Success { get; set; }
    public int Id { get; set; }
}

public class ProductListItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string CategoryId { get; set; } = "";
    public string CategoryName { get; set; } = "";
    public int Price { get; set; }
    public string City { get; set; } = "";
    public string Condition { get; set; } = "";
    public int Views { get; set; }
    public int Likes { get; set; }
    public int SellerId { get; set; }
    public string SellerName { get; set; } = "";
    public string? SellerPhone { get; set; }
    public double SellerRating { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
    public JsonNode Details { get; set; } = new JsonObject();
    public JsonNode Images { get; set; } = new JsonArray();
    public string SaleType { get; set; } = "fixed";
    public DateTime? AuctionEndsAt { get; set; }
    public int AuctionStep { get; set; }
    public int? AuctionHighBid { get; set; }
    public bool IsFavorite { get; set; }
    public int StockQuantity { get; set; }
}

public class ProductDetailDto : ProductListItemDto
{
    public string? SellerCity { get; set; }
    public int? SellerTotalSales { get; set; }
    public string? SellerAvatar { get; set; }
    public int? AuctionMinNextBid { get; set; }
    public int? AuctionLeaderId { get; set; }
    public string? AuctionLeaderName { get; set; }
    public int AuctionBidsCount { get; set; }
    public bool AuctionLive { get; set; }
    public bool AuctionEnded { get; set; }
}

public class PlaceBidDto
{
    public int BidderId { get; set; }
    public int Amount { get; set; }
}

public class BidDto
{
    public int Id { get; set; }
    public int Amount { get; set; }
    public DateTime CreatedAt { get; set; }
    public string BidderName { get; set; } = "";
}

public class PlaceBidResultDto
{
    public bool Success { get; set; }
    public int? AuctionHighBid { get; set; }
    public int? AuctionMinNextBid { get; set; }
    public int? AuctionLeaderId { get; set; }
    public string? AuctionLeaderName { get; set; }
    public int AuctionBidsCount { get; set; }
}

public class AvailabilityDto
{
    public string[] FullSlots { get; set; } = Array.Empty<string>();
}
