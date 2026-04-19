namespace Marketplace.Core.Entities;

public class Notification
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Type { get; set; } = "";
    public string Text { get; set; } = "";
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}
