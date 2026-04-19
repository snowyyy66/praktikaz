using Backend.Data;
using Backend.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Repositories;

public interface IConversationRepository
{
    Task<IEnumerable<object>> GetConversationsAsync(long userId, bool isAdmin);
    Task<Conversation?> FindExistingAsync(int a, int b, int? productId);
    Task<long> CreateAsync(int a, int b, int? productId);
    Task<Conversation?> GetByIdAsync(long id);
    Task<IEnumerable<object>> GetMessagesAsync(long conversationId);
    Task<object?> AddMessageAsync(long conversationId, long senderId, string text);
    Task MarkMessagesReadAsync(long conversationId, long userId);
    Task<bool> IsAdminAsync(long userId);
}

public class ConversationRepository : IConversationRepository
{
    private readonly AppDbContext _context;
    public ConversationRepository(AppDbContext context) => _context = context;

    public async Task<bool> IsAdminAsync(long userId)
    {
        var user = await _context.Users.FindAsync(userId);
        return user?.is_admin == 1;
    }

    public async Task<IEnumerable<object>> GetConversationsAsync(long userId, bool isAdmin)
    {
        var query = from c in _context.Conversations
                    join u1 in _context.Users on c.user1_id equals u1.id
                    join u2 in _context.Users on c.user2_id equals u2.id
                    where isAdmin || c.user1_id == userId || c.user2_id == userId
                    let lastMsg = _context.Messages
                        .Where(m => m.conversation_id == c.id)
                        .OrderByDescending(m => m.id)
                        .FirstOrDefault()
                    let unread = _context.Messages
                        .Count(m => m.conversation_id == c.id && m.is_read == 0 && m.sender_id != userId)
                    select new
                    {
                        c.id, c.user1_id, c.user2_id, c.product_id,
                        user1_name = u1.username, user2_name = u2.username,
                        user1_avatar = u1.avatar, user2_avatar = u2.avatar,
                        user1_is_admin = u1.is_admin == 1, user2_is_admin = u2.is_admin == 1,
                        last_message = lastMsg != null ? lastMsg.text : null,
                        last_at = lastMsg != null ? lastMsg.created_at : null,
                        unread_count = unread
                    };

        var convs = await query.ToListAsync();

        // Добавляем product_title отдельным запросом чтобы избежать сложного LEFT JOIN
        var productIds = convs.Where(c => c.product_id.HasValue).Select(c => c.product_id!.Value).Distinct().ToList();
        var products = productIds.Any()
            ? await _context.Products.Where(p => productIds.Contains(p.id)).ToDictionaryAsync(p => p.id, p => p.title)
            : new Dictionary<long, string?>();

        return convs
            .OrderByDescending(c => c.last_at)
            .Select(c => (object)new
            {
                c.id, c.user1_id, c.user2_id, c.product_id,
                c.user1_name, c.user2_name, c.user1_avatar, c.user2_avatar,
                c.user1_is_admin, c.user2_is_admin, c.last_message, c.last_at, c.unread_count,
                product_title = c.product_id.HasValue && products.ContainsKey(c.product_id.Value)
                    ? products[c.product_id.Value] : null
            });
    }

    public async Task<Conversation?> FindExistingAsync(int a, int b, int? productId)
        => await _context.Conversations.FirstOrDefaultAsync(c =>
            c.user1_id == a && c.user2_id == b &&
            (productId == null ? c.product_id == null : c.product_id == productId));

    public async Task<long> CreateAsync(int a, int b, int? productId)
    {
        var conv = new Conversation { user1_id = a, user2_id = b, product_id = productId };
        await _context.Conversations.AddAsync(conv);
        await _context.SaveChangesAsync();
        return conv.id;
    }

    public async Task<Conversation?> GetByIdAsync(long id)
        => await _context.Conversations.FindAsync(id);

    public async Task<IEnumerable<object>> GetMessagesAsync(long conversationId)
    {
        return await (from m in _context.Messages
                      join u in _context.Users on m.sender_id equals u.id
                      where m.conversation_id == conversationId
                      orderby m.created_at ascending
                      select (object)new
                      {
                          m.id, m.conversation_id, m.sender_id, m.text, m.is_read, m.created_at,
                          sender_name = u.username, sender_is_admin = u.is_admin == 1
                      })
                      .ToListAsync();
    }

    public async Task<object?> AddMessageAsync(long conversationId, long senderId, string text)
    {
        var msg = new Message
        {
            conversation_id = conversationId,
            sender_id = senderId,
            text = text,
            is_read = 0
        };
        await _context.Messages.AddAsync(msg);
        await _context.SaveChangesAsync();

        var sender = await _context.Users.FindAsync(senderId);
        return new
        {
            msg.id, msg.conversation_id, msg.sender_id, msg.text, msg.is_read, msg.created_at,
            sender_name = sender?.username,
            sender_is_admin = sender?.is_admin == 1
        };
    }

    public async Task MarkMessagesReadAsync(long conversationId, long userId)
    {
        var msgs = await _context.Messages
            .Where(m => m.conversation_id == conversationId && m.sender_id != userId)
            .ToListAsync();
        foreach (var m in msgs) m.is_read = 1;
        await _context.SaveChangesAsync();
    }
}
