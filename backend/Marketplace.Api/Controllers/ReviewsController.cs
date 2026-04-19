using Marketplace.Application.Abstractions;
using Marketplace.Application.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace Marketplace.Api.Controllers;

// Создание отзыва после покупки (валидация на сервисе).
[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewService _r;

    public ReviewsController(IReviewService r) => _r = r;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReviewDto dto, CancellationToken ct)
    {
        await _r.CreateAsync(dto, ct);
        return Ok(new { success = true });
    }
}
