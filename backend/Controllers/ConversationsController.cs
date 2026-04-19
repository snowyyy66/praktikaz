using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/conversations")]
public class ConversationsController : ControllerBase
{
    private readonly IConversationService _conversationService;

    public ConversationsController(IConversationService conversationService)
    {
        _conversationService = conversationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetConversations([FromQuery] long user_id)
    {
        var convs = await _conversationService.GetConversationsAsync(user_id);
        return Ok(convs);
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
        var id = await _conversationService.CreateOrGetConversationAsync(req.user1_id, req.user2_id, req.product_id);
        return StatusCode(201, new { id });
    }

    [HttpGet("{id}/messages")]
    public async Task<IActionResult> GetMessages(long id, [FromQuery] long user_id)
    {
        var messages = await _conversationService.GetMessagesAsync(id, user_id);
        return Ok(messages);
    }

    public class SendMessageRequest
    {
        public long sender_id { get; set; }
        public string text { get; set; } = "";
    }

    [HttpPost("{id}/messages")]
    public async Task<IActionResult> SendMessage(long id, [FromBody] SendMessageRequest req)
    {
        var msg = await _conversationService.SendMessageAsync(id, req.sender_id, req.text);
        return Ok(msg);
    }
}
