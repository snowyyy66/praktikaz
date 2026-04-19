namespace Marketplace.Core.Entities;

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int Quantity { get; set; }
    /// <summary>Цена за единицу на момент заказа.</summary>
    public int UnitPrice { get; set; }
    public long LineTotal { get; set; }
}
