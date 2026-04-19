using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models.Entities;

[Table("orders")]
public class Order
{
    [Key]
    public long id { get; set; }
    
    public long buyer_id { get; set; }
    
    public long seller_id { get; set; }
    
    public long product_id { get; set; }
    
    public string? status { get; set; } = "completed";
    
    public long total { get; set; }
    
    public string? created_at { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
    
    public long? rent_hours { get; set; }
    
    public string? appointment_date { get; set; }
    
    public string? appointment_time { get; set; }
    
    public string? address_street { get; set; }
    
    public string? address_house { get; set; }
    
    public string? house_type { get; set; }
    
    public string? address_entrance { get; set; }
    
    public string? address_floor { get; set; }
    
    public string? address_apartment { get; set; }
}
