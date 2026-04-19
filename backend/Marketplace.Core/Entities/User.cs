namespace Marketplace.Core.Entities;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public bool IsAdmin { get; set; }
    public string Phone { get; set; } = "";
    public string City { get; set; } = "Москва";
    public string Avatar { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public double Rating { get; set; } = 5.0;
    public int TotalSales { get; set; }
    public long TotalEarnings { get; set; }

    public ICollection<Product> Products { get; set; } = new List<Product>();
    public ICollection<Order> BuyerOrders { get; set; } = new List<Order>();
    public ICollection<Order> SellerOrders { get; set; } = new List<Order>();
}
