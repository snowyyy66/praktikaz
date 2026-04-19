using Marketplace.Application.Abstractions;
using Marketplace.Application.Common;
using Marketplace.Application.Dtos;
using Marketplace.Core.Enums;
using Microsoft.AspNetCore.Mvc;

namespace Marketplace.Api.Controllers;

// Создание заказа из корзины и списки сделок покупателя/продавца (фильтры, статусы).
[ApiController]
[Route("api")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orders;

    public OrdersController(IOrderService orders) => _orders = orders;

    [HttpPost("orders")]
    public async Task<IActionResult> Create([FromBody] CreateOrderRequestDto dto, CancellationToken ct)
    {
        await _orders.CreateOrdersAsync(dto, ct);
        return Ok(new { success = true });
    }

    /// <summary>Все заказы пользователя с пагинацией, фильтром по статусу и сортировкой.</summary>
    [HttpGet("orders")]
    public async Task<IActionResult> List([FromQuery] OrderQuery q, CancellationToken ct)
    {
        if (q.UserId == null || q.UserId <= 0) return BadRequest(new { error = "Укажите user_id" });
        var p = new OrderListParameters
        {
            UserId = q.UserId.Value,
            Page = q.Page ?? 1,
            Limit = q.Limit ?? 20,
            Sort = q.Sort,
            Status = ParseStatus(q.Status),
        };
        return Ok(await _orders.GetForUserAsync(p, ct));
    }

    [HttpPatch("orders/{id:int}/complete")]
    public async Task<IActionResult> Complete(int id, [FromBody] CompleteOrderBody body, CancellationToken ct)
    {
        await _orders.CompleteOrderAsync(id, body.SellerId, body.ActorId ?? body.SellerId, ct);
        return Ok(new { success = true });
    }

    private static OrderStatus? ParseStatus(string? s) => s?.ToLowerInvariant() switch
    {
        "created" => OrderStatus.Created,
        "completed" => OrderStatus.Completed,
        _ => null,
    };

    public class OrderQuery
    {
        public int? UserId { get; set; }
        public int? Page { get; set; }
        public int? Limit { get; set; }
        public string? Status { get; set; }
        public string? Sort { get; set; }
    }

    public class CompleteOrderBody
    {
        public int SellerId { get; set; }
        public int? ActorId { get; set; }
    }
}
