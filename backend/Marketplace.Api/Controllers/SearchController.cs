using Marketplace.Application.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace Marketplace.Api.Controllers;

// Полнотекстовый поиск по товарам (заголовок и описание).
[ApiController]
[Route("api/[controller]")]
public class SearchController : ControllerBase
{
    private readonly ISearchService _search;

    public SearchController(ISearchService search) => _search = search;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? q, CancellationToken ct) =>
        Ok(await _search.SearchAsync(q, ct));
}
