using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models.Entities;

[Table("products")]
public class Product
{
    [Key]
    public long id { get; set; }
    
    public string? title { get; set; }
    
    public string? description { get; set; }
    
    public string? category_id { get; set; }
    
    public long price { get; set; }
    
    public string? city { get; set; }
    
    public string? condition { get; set; }
    
    public long views { get; set; }
    
    public long likes { get; set; }
    
    public long seller_id { get; set; }
    
    public string? created_at { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
    
    public long is_active { get; set; }
    
    public string? details { get; set; } = "{}";
    
    public string? images { get; set; } = "[]";
    
    public string? sale_type { get; set; } = "fixed";
    
    public string? auction_ends_at { get; set; } = "";
    
    public long auction_step { get; set; }
}
