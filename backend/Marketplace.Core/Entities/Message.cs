namespace Marketplace.Core.Entities;

public class Message
{
    public int Id { get; set; }
    public int ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;
    public int SenderId { get; set; }
    public User Sender { get; set; } = null!;
    public string Text { get; set; } = "";
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}
