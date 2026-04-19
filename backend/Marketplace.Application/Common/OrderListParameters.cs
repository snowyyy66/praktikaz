using Marketplace.Core.Enums;

namespace Marketplace.Application.Common;

public class OrderListParameters
{
    public int UserId { get; set; }
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 20;
    public OrderStatus? Status { get; set; }
    /// <summary>created_at desc (default) или total</summary>
    public string? Sort { get; set; }
}
