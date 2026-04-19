using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models.Entities;

[Table("favorites")]
public class Favorite
{
    [Key]
    public long id { get; set; }
    
    public long user_id { get; set; }
    
    public long product_id { get; set; }
    
    public string created_at { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
}
