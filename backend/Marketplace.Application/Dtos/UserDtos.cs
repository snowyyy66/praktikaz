namespace Marketplace.Application.Dtos;

public class UserProfileDto
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string Email { get; set; } = "";
    public bool IsAdmin { get; set; }
    public string Phone { get; set; } = "";
    public string City { get; set; } = "";
    public string Avatar { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public double Rating { get; set; }
    public int TotalSales { get; set; }
    public long TotalEarnings { get; set; }
}

public class UpdateUserDto
{
    public string Username { get; set; } = "";
    public string Phone { get; set; } = "";
    public string City { get; set; } = "";
}

public class SellerStatsQueryDto
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    /// <summary>Id товаров через запятую.</summary>
    public int[]? ProductIds { get; set; }
}

public class SellerStatsDto
{
    public int TotalProducts { get; set; }
    public int ActiveProducts { get; set; }
    public long TotalViews { get; set; }
    public long TotalLikes { get; set; }
    public SalesBucketDto Sales { get; set; } = new();
    public PurchasesBucketDto Purchases { get; set; } = new();
    /// <summary>Детализация по товарам (ТЗ п. 10), только завершённые заказы.</summary>
    public IReadOnlyList<ProductSalesStatDto> PerProduct { get; set; } = Array.Empty<ProductSalesStatDto>();
}

public class SalesBucketDto
{
    public int Count { get; set; }
    public long Revenue { get; set; }
}

public class PurchasesBucketDto
{
    public int Count { get; set; }
    public long Spent { get; set; }
}

public class ProductSalesStatDto
{
    public int ProductId { get; set; }
    public string Title { get; set; } = "";
    public int UnitsSold { get; set; }
    public long Revenue { get; set; }
}
