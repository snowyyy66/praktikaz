namespace Marketplace.Application.Common;

public class ProductListParameters
{
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 24;
    public string? Category { get; set; }
    public string? Sort { get; set; }
    public string? Search { get; set; }
    public string? Auction { get; set; }
    public string? City { get; set; }
    public int? UserIdForFavorite { get; set; }
    /// <summary>Фильтр по продавцу (мои объявления).</summary>
    public int? SellerId { get; set; }
    /// <summary>Только активные (витрина).</summary>
    public bool ActiveOnly { get; set; } = true;
}
