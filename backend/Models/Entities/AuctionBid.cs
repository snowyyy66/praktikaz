using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models.Entities;

[Table("auction_bids")]
public class AuctionBid
{
    [Key]
    public long id { get; set; }
    
    public long product_id { get; set; }
    
    public long bidder_id { get; set; }
    
    public long amount { get; set; }
    
    public string created_at { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
}
