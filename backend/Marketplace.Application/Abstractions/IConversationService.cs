using Marketplace.Application.Dtos;

namespace Marketplace.Application.Abstractions;

// Личные сообщения между пользователями (и админ-доступ при необходимости).
public interface IConversationService
{
    Task<IReadOnlyList<ConversationListDto>> GetListAsync(int userId, CancellationToken ct = default);
    Task<int> FindOrCreateAsync(CreateConversationDto dto, CancellationToken ct = default);
    Task<IReadOnlyList<MessageDto>> GetMessagesAsync(int conversationId, int userId, CancellationToken ct = default);
    Task<MessageDto> SendMessageAsync(int conversationId, SendMessageDto dto, CancellationToken ct = default);
}
