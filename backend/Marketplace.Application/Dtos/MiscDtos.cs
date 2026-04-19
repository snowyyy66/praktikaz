namespace Marketplace.Application.Dtos;

public class ToggleFavoriteResultDto
{
    public bool Success { get; set; }
    public bool Favorited { get; set; }
}

public class ReviewDto
{
    public int Id { get; set; }
    public int ReviewerId { get; set; }
    public string ReviewerName { get; set; } = "";
    public int Rating { get; set; }
    public string Text { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}

public class CreateReviewDto
{
    public int ReviewerId { get; set; }
    public int ProductId { get; set; }
    public int Rating { get; set; }
    public string? Text { get; set; }
}

public class ConversationListDto
{
    public int Id { get; set; }
    public int User1Id { get; set; }
    public int User2Id { get; set; }
    public string User1Name { get; set; } = "";
    public string User2Name { get; set; } = "";
    public bool User1IsAdmin { get; set; }
    public bool User2IsAdmin { get; set; }
    public int? ProductId { get; set; }
    public string? ProductTitle { get; set; }
    public string? LastMessage { get; set; }
    public string? LastAt { get; set; }
    public int UnreadCount { get; set; }
}

public class CreateConversationDto
{
    public int User1Id { get; set; }
    public int User2Id { get; set; }
    public int? ProductId { get; set; }
}

public class MessageDto
{
    public int Id { get; set; }
    public int ConversationId { get; set; }
    public int SenderId { get; set; }
    public string SenderName { get; set; } = "";
    public bool SenderIsAdmin { get; set; }
    public string Text { get; set; } = "";
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SendMessageDto
{
    public int SenderId { get; set; }
    public string Text { get; set; } = "";
}

public class NotificationDto
{
    public int Id { get; set; }
    public string Type { get; set; } = "";
    public string Text { get; set; } = "";
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}
