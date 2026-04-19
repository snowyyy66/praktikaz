using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models.Entities;

[Table("reviews")]
public class Review
{
    [Key]
    public long id { get; set; }
    
    public long reviewer_id { get; set; }
    
    public long target_user_id { get; set; }
    
    public long product_id { get; set; }
    
    public long rating { get; set; }
    
    public string? text { get; set; }
    
    public string images { get; set; } = "[]";
    
    public string created_at { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
}
