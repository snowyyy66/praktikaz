namespace Marketplace.Application.Dtos;

public class OrderLineRequestDto
{
    public int ProductId { get; set; }
    public int Quantity { get; set; } = 1;
}

public class CreateOrderRequestDto
{
    public int BuyerId { get; set; }
    /// <summary>Один товар (совместимость с текущим фронтом).</summary>
    public int? ProductId { get; set; }
    /// <summary>Новый формат корзины.</summary>
    public List<OrderLineRequestDto>? Items { get; set; }
    public int? Quantity { get; set; }
    public int? RentHours { get; set; }
    public string? AppointmentDate { get; set; }
    public string? AppointmentTime { get; set; }
    public string? AddressStreet { get; set; }
    public string? AddressHouse { get; set; }
    public string? HouseType { get; set; }
    public string? AddressEntrance { get; set; }
    public string? AddressFloor { get; set; }
    public string? AddressApartment { get; set; }
}

public class OrderItemResponseDto
{
    public int ProductId { get; set; }
    public string ProductTitle { get; set; } = "";
    public int Quantity { get; set; }
    public int UnitPrice { get; set; }
    public long LineTotal { get; set; }
    public string ProductCategoryId { get; set; } = "";
}

public class OrderListItemDto
{
    public int Id { get; set; }
    public int BuyerId { get; set; }
    public int SellerId { get; set; }
    /// <summary>created | completed</summary>
    public string Status { get; set; } = "";
    public long Total { get; set; }
    public DateTime CreatedAt { get; set; }
    public string BuyerName { get; set; } = "";
    public string SellerName { get; set; } = "";
    public int? RentHours { get; set; }
    /// <summary>Первый товар для старых экранов.</summary>
    public string ProductTitle { get; set; } = "";
    public string ProductCategoryId { get; set; } = "";
    public IReadOnlyList<OrderItemResponseDto> Lines { get; set; } = Array.Empty<OrderItemResponseDto>();
}
