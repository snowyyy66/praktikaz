using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models.Entities;

[Table("notifications")]
public class Notification
{
    [Key]
    public long id { get; set; }
    
    public long user_id { get; set; }
    
    public string? type { get; set; }
    
    public string? text { get; set; }
    
    public long is_read { get; set; }
    
    public string created_at { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
    
    public long? related_user_id { get; set; }
    
    public long? related_product_id { get; set; }
}
