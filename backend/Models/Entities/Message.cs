using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models.Entities;

[Table("messages")]
public class Message
{
    [Key]
    public long id { get; set; }
    
    public long conversation_id { get; set; }
    
    public long sender_id { get; set; }
    
    public string? text { get; set; }
    
    public long is_read { get; set; }
    
    public string created_at { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
}
