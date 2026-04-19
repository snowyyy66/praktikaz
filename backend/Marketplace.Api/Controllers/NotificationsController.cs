using Marketplace.Application.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace Marketplace.Api.Controllers;

// Уведомления пользователя и пометка «прочитано».
[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _n;

    public NotificationsController(INotificationService n) => _n = n;

    [HttpPut("{id:int}/read")]
    public async Task<IActionResult> Read(int id, CancellationToken ct)
    {
        await _n.MarkReadAsync(id, ct);
        return Ok(new { success = true });
    }
}
