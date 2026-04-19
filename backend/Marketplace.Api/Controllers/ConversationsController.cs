using Marketplace.Application.Abstractions;
using Marketplace.Application.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace Marketplace.Api.Controllers;

// Диалоги между покупателем и продавцом (и просмотр сообщений).
[ApiController]
[Route("api/[controller]")]
public class ConversationsController : ControllerBase
{
    private readonly IConversationService _c;

    public ConversationsController(IConversationService c) => _c = c;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int user_id, CancellationToken ct) =>
        Ok(await _c.GetListAsync(user_id, ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateConversationDto dto, CancellationToken ct)
    {
        var id = await _c.FindOrCreateAsync(dto, ct);
        return Ok(new { id });
    }

    [HttpGet("{id:int}/messages")]
    public async Task<IActionResult> Messages(int id, [FromQuery] int user_id, CancellationToken ct) =>
        Ok(await _c.GetMessagesAsync(id, user_id, ct));

    [HttpPost("{id:int}/messages")]
    public async Task<IActionResult> Send(int id, [FromBody] SendMessageDto dto, CancellationToken ct) =>
        Ok(await _c.SendMessageAsync(id, dto, ct));
}
