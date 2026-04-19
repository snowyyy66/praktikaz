using Backend.Repositories;

namespace Backend.Services;

public interface IConversationService
{
    Task<IEnumerable<object>> GetConversationsAsync(long userId);
    Task<long> CreateOrGetConversationAsync(int user1Id, int user2Id, int? productId);
    Task<IEnumerable<object>> GetMessagesAsync(long conversationId, long userId);
    Task<object> SendMessageAsync(long conversationId, long senderId, string text);
}

public class ConversationService : IConversationService
{
    private readonly IConversationRepository _conversationRepository;

    public ConversationService(IConversationRepository conversationRepository)
    {
        _conversationRepository = conversationRepository;
    }

    public async Task<IEnumerable<object>> GetConversationsAsync(long userId)
    {
        var isAdmin = await _conversationRepository.IsAdminAsync(userId);
        return await _conversationRepository.GetConversationsAsync(userId, isAdmin);
    }

    public async Task<long> CreateOrGetConversationAsync(int user1Id, int user2Id, int? productId)
    {
        if (user1Id <= 0 || user2Id <= 0 || user1Id == user2Id)
            throw new ArgumentException("Некорректные участники диалога");
        if (productId != null && productId <= 0)
            throw new ArgumentException("Некорректный product_id");

        int a = Math.Min(user1Id, user2Id);
        int b = Math.Max(user1Id, user2Id);

        var existing = await _conversationRepository.FindExistingAsync(a, b, productId);
        if (existing != null) return existing.id;

        return await _conversationRepository.CreateAsync(a, b, productId);
    }

    public async Task<IEnumerable<object>> GetMessagesAsync(long conversationId, long userId)
    {
        var conv = await _conversationRepository.GetByIdAsync(conversationId)
            ?? throw new KeyNotFoundException("Диалог не найден");

        bool isAdmin = await _conversationRepository.IsAdminAsync(userId);
        if (!isAdmin && userId != conv.user1_id && userId != conv.user2_id)
            throw new UnauthorizedAccessException("Нет доступа к этому диалогу");

        if (!isAdmin)
            await _conversationRepository.MarkMessagesReadAsync(conversationId, userId);

        return await _conversationRepository.GetMessagesAsync(conversationId);
    }

    public async Task<object> SendMessageAsync(long conversationId, long senderId, string text)
    {
        if (string.IsNullOrWhiteSpace(text)) throw new ArgumentException("Пустое сообщение");
        if (senderId <= 0) throw new ArgumentException("Некорректный sender_id");

        var conv = await _conversationRepository.GetByIdAsync(conversationId)
            ?? throw new KeyNotFoundException("Диалог не найден");

        bool isAdmin = await _conversationRepository.IsAdminAsync(senderId);
        if (!isAdmin && senderId != conv.user1_id && senderId != conv.user2_id)
            throw new UnauthorizedAccessException("Нет доступа к этому диалогу");

        return await _conversationRepository.AddMessageAsync(conversationId, senderId, text.Trim())
            ?? throw new Exception("Ошибка при сохранении сообщения");
    }
}
