using Backend.Models.Entities;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrdersController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpGet]
    public async Task<IActionResult> GetOrders(
        [FromQuery] long? user_id, 
        [FromQuery] string? status, 
        [FromQuery] int page = 1, 
        [FromQuery] int limit = 10)
    {
        var result = await _orderService.GetOrdersAsync(user_id, status, page, limit);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] Order order)
    {
        if (order.buyer_id <= 0 || order.product_id <= 0)
            return BadRequest(new { error = "Buyer and Product IDs are required" });

        await _orderService.CreateOrderAsync(order);
        return Ok(new { success = true });
    }
}
