namespace Marketplace.Core.Entities;

public class AuctionBid
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int BidderId { get; set; }
    public User Bidder { get; set; } = null!;
    public int Amount { get; set; }
    public DateTime CreatedAt { get; set; }
}
