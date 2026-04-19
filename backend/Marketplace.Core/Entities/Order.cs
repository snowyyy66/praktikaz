using Marketplace.Core.Enums;

namespace Marketplace.Core.Entities;

/// <summary>Заказ (корзина): несколько позиций, один продавец (ТЗ п. 4).</summary>
public class Order
{
    public int Id { get; set; }
    public int BuyerId { get; set; }
    public User Buyer { get; set; } = null!;
    public int SellerId { get; set; }
    public User Seller { get; set; } = null!;

    /// <summary>Создан → Завершён (ТЗ п. 6).</summary>
    public OrderStatus Status { get; set; } = OrderStatus.Created;

    public long Total { get; set; }
    public DateTime CreatedAt { get; set; }

    public int? RentHours { get; set; }
    public string? AppointmentDate { get; set; }
    public string? AppointmentTime { get; set; }
    public string AddressStreet { get; set; } = "";
    public string AddressHouse { get; set; } = "";
    public string HouseType { get; set; } = "apartment";
    public string AddressEntrance { get; set; } = "";
    public string AddressFloor { get; set; } = "";
    public string AddressApartment { get; set; } = "";

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
