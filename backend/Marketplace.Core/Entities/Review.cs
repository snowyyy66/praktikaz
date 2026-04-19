namespace Marketplace.Core.Entities;

public class Review
{
    public int Id { get; set; }
    public int ReviewerId { get; set; }
    public User Reviewer { get; set; } = null!;
    public int TargetUserId { get; set; }
    public User TargetUser { get; set; } = null!;
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int Rating { get; set; }
    public string Text { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}
