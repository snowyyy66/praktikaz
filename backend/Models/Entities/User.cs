using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models.Entities;

[Table("users")]
public class User
{
    [Key]
    public long id { get; set; }
    
    public string? username { get; set; }
    
    public string? email { get; set; }
    
    public string? password { get; set; }
    
    public long is_admin { get; set; }
    
    public string? phone { get; set; }
    
    public string? city { get; set; }
    
    public string? avatar { get; set; }
    
    public string? created_at { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
    
    public double rating { get; set; }
    
    public long total_sales { get; set; }
    
    public long total_earnings { get; set; }
}
