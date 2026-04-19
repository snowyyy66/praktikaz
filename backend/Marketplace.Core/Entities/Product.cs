namespace Marketplace.Core.Entities;

/// <summary>Товар. StockQuantity — остаток для учётных категорий (ТЗ п. 3.3); для услуг/аренды не уменьшается.</summary>
public class Product
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string CategoryId { get; set; } = "";
    public int Price { get; set; }
    public string City { get; set; } = "Москва";
    public string Condition { get; set; } = "Б/У";
    public int Views { get; set; }
    public int Likes { get; set; }
    public int SellerId { get; set; }
    public User Seller { get; set; } = null!;
    public Category Category { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public string Details { get; set; } = "{}";
    public string Images { get; set; } = "[]";
    public string SaleType { get; set; } = "fixed";
    public DateTime? AuctionEndsAt { get; set; }
    public int AuctionStep { get; set; } = 500;

    /// <summary>Остаток на складе (≥ 0). Услуги/аренда игнорируют уменьшение.</summary>
    public int StockQuantity { get; set; } = 1;

    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    public ICollection<AuctionBid> AuctionBids { get; set; } = new List<AuctionBid>();
}
