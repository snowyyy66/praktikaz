using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/conversations")]
public class ConversationsController : ControllerBase
{
    private readonly DbService _db;

    public ConversationsController(DbService db)
    {
        _db = db;
    }

    private bool IsAdminUser(int? userId)
    {
        if (userId == null) return false;
        var admin = _db.QueryFirstOrDefaultAsync<int>("SELECT is_admin FROM users WHERE id = @uid", new { uid = userId }).Result;
        return admin == 1;
    }

    [HttpGet]
    public async Task<IActionResult> GetConversations([FromQuery] int user_id)
    {
        bool adminMode = IsAdminUser(user_id);
        string baseSql = @"
            SELECT c.*,
              u1.username as user1_name, u2.username as user2_name,
              u1.avatar as user1_avatar, u2.avatar as user2_avatar,
              u1.is_admin as user1_is_admin, u2.is_admin as user2_is_admin,
              p.title as product_title,
              (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) as last_message,
              (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) as last_at,
              (SELECT COUNT(*) FROM messages m2 WHERE m2.conversation_id = c.id AND COALESCE(m2.is_read, 0) = 0 AND m2.sender_id != @uid) as unread_count
            FROM conversations c
            JOIN users u1 ON c.user1_id = u1.id
            JOIN users u2 ON c.user2_id = u2.id
            LEFT JOIN products p ON c.product_id = p.id
        ";

        string sql = adminMode
            ? $"{baseSql} ORDER BY last_at DESC"
            : $"{baseSql} WHERE c.user1_id = @uid OR c.user2_id = @uid ORDER BY last_at DESC";

        var convs = await _db.QueryAsync<dynamic>(sql, new { uid = user_id });
        
        var items = convs.Select(c => 
        {
            var dict = (IDictionary<string, object>)c;
            dict["user1_is_admin"] = Convert.ToInt32(dict["user1_is_admin"]) == 1;
            dict["user2_is_admin"] = Convert.ToInt32(dict["user2_is_admin"]) == 1;
            return dict;
        });
        
        return Ok(items);
    }

    public class CreateConversationRequest
    {
        public int user1_id { get; set; }
        public int user2_id { get; set; }
        public int? product_id { get; set; }
    }

    [HttpPost]
    public async Task<IActionResult> CreateConversation([FromBody] CreateConversationRequest req)
    {
        int u1 = req.user1_id;
        int u2 = req.user2_id;
        if (u1 <= 0 || u2 <= 0 || u1 == u2) return BadRequest(new { error = "Некорректные участники диалога" });
        if (req.product_id != null && req.product_id <= 0) return BadRequest(new { error = "Некорректный product_id" });

        int a = Math.Min(u1, u2);
        int b = Math.Max(u1, u2);

        var conv = await _db.QueryFirstOrDefaultAsync<dynamic>(@"
            SELECT id FROM conversations
            WHERE user1_id = @a AND user2_id = @b
              AND ((product_id IS NULL AND @pid IS NULL) OR product_id = @pid)
            LIMIT 1", new { a, b, pid = req.product_id });

        if (conv == null)
        {
            await _db.ExecuteAsync("INSERT INTO conversations (user1_id, user2_id, product_id) VALUES (@a, @b, @pid)", new { a, b, pid = req.product_id });
            conv = await _db.QueryFirstOrDefaultAsync<dynamic>(@"
                SELECT id FROM conversations
                WHERE user1_id = @a AND user2_id = @b
                  AND ((product_id IS NULL AND @pid IS NULL) OR product_id = @pid)
                ORDER BY id DESC LIMIT 1", new { a, b, pid = req.product_id });
        }

        return Ok(new { id = conv.id });
    }

    [HttpGet("{id}/messages")]
    public async Task<IActionResult> GetMessages(int id, [FromQuery] int user_id)
    {
        var conv = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT user1_id, user2_id FROM conversations WHERE id = @id", new { id });
        if (conv == null) return NotFound(new { error = "Диалог не найден" });

        if (!IsAdminUser(user_id) && user_id != (int)conv.user1_id && user_id != (int)conv.user2_id)
            return StatusCode(403, new { error = "Нет доступа к этому диалогу" });

        if (!IsAdminUser(user_id))
        {
            await _db.ExecuteAsync("UPDATE messages SET is_read = 1 WHERE conversation_id = @id AND sender_id != @uid", new { id, uid = user_id });
        }

        var msgs = await _db.QueryAsync<dynamic>(@"
            SELECT m.*, u.username as sender_name, u.is_admin as sender_is_admin
            FROM messages m JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = @id ORDER BY m.created_at ASC", new { id });

        var items = msgs.Select(m => 
        {
            var dict = (IDictionary<string, object>)m;
            dict["sender_is_admin"] = Convert.ToInt32(dict["sender_is_admin"]) == 1;
            return dict;
        });

        return Ok(items);
    }

    public class SendMessageRequest
    {
        public int sender_id { get; set; }
        public string text { get; set; } = "";
    }

    [HttpPost("{id}/messages")]
    public async Task<IActionResult> SendMessage(int id, [FromBody] SendMessageRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.text)) return BadRequest(new { error = "Пустое сообщение" });
        if (req.sender_id <= 0) return BadRequest(new { error = "Некорректный sender_id" });

        var conv = await _db.QueryFirstOrDefaultAsync<dynamic>("SELECT user1_id, user2_id FROM conversations WHERE id = @id", new { id });
        if (conv == null) return NotFound(new { error = "Диалог не найден" });

        if (!IsAdminUser(req.sender_id) && req.sender_id != (int)conv.user1_id && req.sender_id != (int)conv.user2_id)
            return StatusCode(403, new { error = "Нет доступа к этому диалогу" });

        await _db.ExecuteAsync("INSERT INTO messages (conversation_id, sender_id, text, is_read) VALUES (@id, @sid, @text, 0)",
            new { id, sid = req.sender_id, text = req.text.Trim() });

        var msg = await _db.QueryFirstOrDefaultAsync<dynamic>(@"
            SELECT m.*, u.username as sender_name, u.is_admin as sender_is_admin 
            FROM messages m JOIN users u ON m.sender_id = u.id 
            WHERE m.conversation_id = @id ORDER BY m.id DESC LIMIT 1", new { id });

        var dict = (IDictionary<string, object>)msg;
        dict["sender_is_admin"] = Convert.ToInt32(dict["sender_is_admin"]) == 1;

        return Ok(dict);
    }
}
