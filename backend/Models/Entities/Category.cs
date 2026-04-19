using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models.Entities;

[Table("categories")]
public class Category
{
    [Key]
    public string id { get; set; } = string.Empty;
    
    public string? name { get; set; }
}
